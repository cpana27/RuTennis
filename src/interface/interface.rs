use smartcore::linalg::naive::dense_matrix::DenseMatrix;
use smartcore::linear::logistic_regression::LogisticRegression;
use smartcore::linalg::BaseMatrix;
use crate::player::player::{PlayerDatabase, PlayerProfile};

// NEU: Wir importieren unsere Markov-Ketten für die Satzwetten
use crate::math::mathematics::calc_set_betting_probs;

// Ein winziger, genialer Solver, der aus der Match-Wahrscheinlichkeit die Satz-Wahrscheinlichkeit zurückrechnet
fn get_implied_set_prob(match_prob: f64) -> f64 {
    let mut low = 0.0;
    let mut high = 1.0;
    for _ in 0..20 { // 20 Schritte Binäre Suche reichen für absolute Präzision
        let mid: f32 = (low + high) / 2.0;
        let m = 3.0 * mid.powi(2) - 2.0 * mid.powi(3);
        if m < match_prob as f32 {
            low = mid;
        } else {
            high = mid;
        }
    }
    ((low + high) / 2.0) as f64
}

pub fn predict_live_match(
    db: &PlayerDatabase,
    model: &LogisticRegression<f64, DenseMatrix<f64>>,
    p1_name: &str,
    p2_name: &str,
    surface: &str
) -> Result<(), Box<dyn std::error::Error>> {

    println!("\n🔮 Starte Live-Vorhersage mit purer Rust KI (inkl. Serve-Edge)...");

    let empty_profile = PlayerProfile::new();
    let p1_prof = db.get(p1_name).unwrap_or(&empty_profile);
    let p2_prof = db.get(p2_name).unwrap_or(&empty_profile);

    let glicko_diff = p1_prof.glicko_overall.rating - p2_prof.glicko_overall.rating;
    let form_diff = p1_prof.get_form_winrate() - p2_prof.get_form_winrate();

    let surface_glicko_diff = match surface {
        "Clay" => p1_prof.glicko_surface_clay.rating - p2_prof.glicko_surface_clay.rating,
        "Hard" => p1_prof.glicko_surface_hard.rating - p2_prof.glicko_surface_hard.rating,
        "Grass" => p1_prof.glicko_surface_grass.rating - p2_prof.glicko_surface_grass.rating,
        _ => 0.0,
    };

    let p1_advantage = p1_prof.get_serve_winrate() - p2_prof.get_return_winrate();
    let p2_advantage = p2_prof.get_serve_winrate() - p1_prof.get_return_winrate();
    let serve_edge = p1_advantage - p2_advantage;

    let coeffs = model.coefficients();
    let intercepts = model.intercept();

    let w0 = coeffs.get(0, 0);
    let w1 = coeffs.get(0, 1);
    let w2 = coeffs.get(0, 2);
    let w3 = coeffs.get(0, 3);

    let b = intercepts.get(0, 0);

    let z = (glicko_diff * w0) + (surface_glicko_diff * w1) + (form_diff * w2) + (serve_edge * w3) + b;

    let prob_p1_wins_match = 1.0 / (1.0 + (-z).exp());

    let fair_odds_p1 = 1.0 / prob_p1_wins_match;
    let fair_odds_p2 = 1.0 / (1.0 - prob_p1_wins_match);

    println!("==================================================");
    println!("🎾 LIVE MATCH-UP: {} vs. {} auf {}", p1_name, p2_name, surface);
    println!("--------------------------------------------------");
    println!("Siegwahrscheinlichkeit {}: {:.2}%", p1_name, prob_p1_wins_match * 100.0);
    println!("Siegwahrscheinlichkeit {}: {:.2}%", p2_name, (1.0 - prob_p1_wins_match) * 100.0);
    println!("---");
    println!("💰 FAIRE QUOTEN (MONEYLINE):");
    println!("Quote {}: {:.2}", p1_name, fair_odds_p1);
    println!("Quote {}: {:.2}", p2_name, fair_odds_p2);
    println!("--------------------------------------------------");

    // ==========================================
    // NEU: DERIVATE PRICING (SATZ-WETTEN)
    // ==========================================
    println!("📊 FAIRE QUOTEN FÜR GENAUE SATZ-ERGEBNISSE:");

    // 1. Wir errechnen die isolierte Satz-Wahrscheinlichkeit
    let prob_p1_wins_set = get_implied_set_prob(prob_p1_wins_match);

    // 2. Wir jagen sie durch deine Markov-Ketten (für ein Best-of-3)
    let set_probs = calc_set_betting_probs(prob_p1_wins_set, 3);

    // 3. Wir drucken die exakten Buchmacher-Quoten aus
    for (score, prob) in set_probs {
        let fair_odds = 1.0 / prob;
        let winner_name = if score.starts_with('2') { p1_name } else { p2_name };

        // Wir formatieren die Ausgabe schön übersichtlich
        println!(
            "{} gewinnt {} -> Chance: {:.1}% | Faire Quote: {:.2}",
            winner_name, score, prob * 100.0, fair_odds
        );
    }
    println!("==================================================\n");

    Ok(())
}