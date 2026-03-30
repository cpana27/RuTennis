use serde::{Serialize, Deserialize};
use smartcore::linear::logistic_regression::LogisticRegression;
use smartcore::linalg::basic::matrix::DenseMatrix;
use smartcore::linalg::basic::arrays::Array;

use crate::player::player::PlayerDatabase;
use crate::math::mathematics::{
    calc_set_betting_probs,
    monte_carlo_simulation,
    calc_set_markets_mc,
};

// ─── ERGEBNIS STRUKTUR ────────────────────────────────────────────────────────
#[derive(Serialize, Deserialize)]
pub struct PredictionResult {
    // Spieler
    pub p1_name: String,
    pub p2_name: String,

    // Logistische Regression
    pub prob_p1: f64,
    pub prob_p2: f64,
    pub odds_p1: f64,
    pub odds_p2: f64,

    // Monte Carlo
    pub mc_prob_p1: f64,
    pub mc_prob_p2: f64,
    pub mc_ci_low: f64,
    pub mc_ci_high: f64,
    pub mc_avg_sets: f64,
    pub mc_prob_straight: f64,
    pub mc_simulations: u32,
    pub mc_odds_p1: f64,
    pub mc_odds_p2: f64,

    // Ensemble (40% LR + 60% MC)
    pub ensemble_prob_p1: f64,
    pub ensemble_prob_p2: f64,
    pub ensemble_odds_p1: f64,
    pub ensemble_odds_p2: f64,

    // Ratings
    pub glicko_p1: f64,
    pub glicko_p2: f64,
    pub surface_rating_p1: f64,
    pub surface_rating_p2: f64,
    pub surface_matches_p1: usize,
    pub surface_matches_p2: usize,

    // Serve/Return Stats
    pub serve_winrate_p1: f64,
    pub serve_winrate_p2: f64,
    pub return_winrate_p1: f64,
    pub return_winrate_p2: f64,
    pub serve_edge_p1: f64, // positiv = P1 hat Aufschlag-Vorteil

    // Form
    pub form_p1: f64,
    pub form_p2: f64,

    // Satz-Märkte (exakt aus math + MC)
    pub set_results: Vec<(String, f64)>,
    pub set_results_mc: Vec<(String, f64)>,
}

// ─── HILFSFUNKTION: Belag-Rating + Anzahl Matches ─────────────────────────────
fn get_surface_rating(
    profile: &crate::player::player::PlayerProfile,
    surface: &str,
) -> (f64, usize) {
    // Belag-Rating mit Blending:
    // < 10 Matches auf Belag → stark auf Overall verlassen
    // >= 30 Matches → vollständig Belag-Rating nutzen
    let (surface_rating, surface_count) = match surface {
        "Clay"  => (profile.glicko_surface_clay.rating,  count_surface_matches(profile, "Clay")),
        "Hard"  => (profile.glicko_surface_hard.rating,  count_surface_matches(profile, "Hard")),
        "Grass" => (profile.glicko_surface_grass.rating, count_surface_matches(profile, "Grass")),
        _       => (profile.glicko_overall.rating, profile.matches_played),
    };

    let weight = (surface_count as f64 / 30.0).min(1.0);
    let blended = weight * surface_rating + (1.0 - weight) * profile.glicko_overall.rating;

    (blended, surface_count)
}

// Zählt Belag-Matches aus Form-Daten — einfache Approximation
// da PlayerProfile keine separate Zählung pro Belag hat
fn count_surface_matches(
    profile: &crate::player::player::PlayerProfile,
    _surface: &str,
) -> usize {
    // Approximation: Gesamt-Matches / 3 (ATP spielt ~gleichmäßig auf allen Belägen)
    // Du kannst matches_played_clay etc. in PlayerProfile hinzufügen für exakte Zahlen
    profile.matches_played / 3
}

// ─── HAUPT VORHERSAGE-FUNKTION ────────────────────────────────────────────────
pub fn predict_live_match_data(
    db: &PlayerDatabase,
    model: &LogisticRegression<f64, i32, DenseMatrix<f64>, Vec<i32>>,
    p1_name: &str,
    p2_name: &str,
    surface: &str,
) -> Result<PredictionResult, String> {

    let p1 = db.get(p1_name)
        .ok_or_else(|| format!("Spieler '{}' nicht gefunden", p1_name))?;
    let p2 = db.get(p2_name)
        .ok_or_else(|| format!("Spieler '{}' nicht gefunden", p2_name))?;

    // ── Belag-spezifische Ratings ──────────────────────────────────────────
    let (surface_rating_p1, surface_matches_p1) = get_surface_rating(p1, surface);
    let (surface_rating_p2, surface_matches_p2) = get_surface_rating(p2, surface);

    // ── Features für LR ───────────────────────────────────────────────────
    let glicko_diff = p1.glicko_overall.rating - p2.glicko_overall.rating;
    let form_p1 = p1.get_form_winrate();
    let form_p2 = p2.get_form_winrate();
    let form_diff = form_p1 - form_p2;

    let surface_glicko_diff = surface_rating_p1 - surface_rating_p2;

    let serve_winrate_p1 = p1.get_serve_winrate();
    let serve_winrate_p2 = p2.get_serve_winrate();
    let return_winrate_p1 = p1.get_return_winrate();
    let return_winrate_p2 = p2.get_return_winrate();

    let serve_edge = (serve_winrate_p1 - return_winrate_p2)
        - (serve_winrate_p2 - return_winrate_p1);

    // ── Logistische Regression (manuelle Sigmoid wie gehabt) ──────────────
    let coeff = model.coefficients();
    let intercept = model.intercept();

    let w0 = *coeff.get((0, 0));
    let w1 = *coeff.get((0, 1));
    let w2 = *coeff.get((0, 2));
    let w3 = *coeff.get((0, 3));
    let b  = *intercept.get((0, 0));

    let z = glicko_diff * w0
        + surface_glicko_diff * w1
        + form_diff * w2
        + serve_edge * w3
        + b;

    let prob_p1 = 1.0 / (1.0 + (-z).exp());

    // ── Set-Wahrscheinlichkeit (binäre Suche wie gehabt) ──────────────────
    let mut low = 0.0_f64;
    let mut high = 1.0_f64;
    for _ in 0..20 {
        let mid = (low + high) / 2.0;
        let m = 3.0 * mid.powi(2) - 2.0 * mid.powi(3);
        if m < prob_p1 { low = mid; } else { high = mid; }
    }
    let set_prob_p1 = (low + high) / 2.0;
    let set_results = calc_set_betting_probs(set_prob_p1, 3);

    // ── Monte Carlo Simulation ─────────────────────────────────────────────
    // p_serve direkt aus echten ATP-Stats (serve_winrate ist bereits p_serve)
    // Kleines Blending: Belag-Rating fließt als Korrektur ein
    let surface_factor_p1 = (surface_rating_p1 - 1500.0) * 0.00010;
    let surface_factor_p2 = (surface_rating_p2 - 1500.0) * 0.00010;

    let p1_serve_mc = (serve_winrate_p1 + surface_factor_p1).clamp(0.50, 0.82);
    let p2_serve_mc = (serve_winrate_p2 + surface_factor_p2).clamp(0.50, 0.82);

    let mc = monte_carlo_simulation(p1_serve_mc, p2_serve_mc, 3, 10_000);

    // Satz-Märkte via MC (ersetzt die rein kombinatorische Berechnung)
    let set_results_mc = calc_set_markets_mc(p1_serve_mc, p2_serve_mc, p1_name, p2_name);

    // ── Ensemble ──────────────────────────────────────────────────────────
    // LR ist gut bei Rating-Unterschieden, MC bei Aufschlag-dominierten Matches
    let ensemble_prob_p1 = 0.40 * prob_p1 + 0.60 * mc.prob_p1;
    let ensemble_prob_p2 = 1.0 - ensemble_prob_p1;

    Ok(PredictionResult {
        p1_name: p1_name.to_string(),
        p2_name: p2_name.to_string(),

        prob_p1,
        prob_p2: 1.0 - prob_p1,
        odds_p1: 1.0 / prob_p1.max(0.001),
        odds_p2: 1.0 / (1.0 - prob_p1).max(0.001),

        mc_prob_p1: mc.prob_p1,
        mc_prob_p2: 1.0 - mc.prob_p1,
        mc_ci_low: mc.ci_low,
        mc_ci_high: mc.ci_high,
        mc_avg_sets: mc.avg_sets,
        mc_prob_straight: mc.prob_straight_sets,
        mc_simulations: mc.simulations,
        mc_odds_p1: 1.0 / mc.prob_p1.max(0.001),
        mc_odds_p2: 1.0 / (1.0 - mc.prob_p1).max(0.001),

        ensemble_prob_p1,
        ensemble_prob_p2,
        ensemble_odds_p1: 1.0 / ensemble_prob_p1.max(0.001),
        ensemble_odds_p2: 1.0 / ensemble_prob_p2.max(0.001),

        glicko_p1: p1.glicko_overall.rating,
        glicko_p2: p2.glicko_overall.rating,
        surface_rating_p1,
        surface_rating_p2,
        surface_matches_p1,
        surface_matches_p2,

        serve_winrate_p1,
        serve_winrate_p2,
        return_winrate_p1,
        return_winrate_p2,
        serve_edge_p1: serve_edge,

        form_p1,
        form_p2,

        set_results,
        set_results_mc,
    })
}