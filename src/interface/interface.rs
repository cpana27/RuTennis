use serde::{Serialize, Deserialize};
use smartcore::linear::logistic_regression::LogisticRegression;
use smartcore::linalg::basic::matrix::DenseMatrix;
use smartcore::linalg::basic::arrays::Array;

use crate::player::player::PlayerDatabase;
use crate::math::mathematics::calc_set_betting_probs;

#[derive(Serialize, Deserialize)]
pub struct PredictionResult {
    pub p1_name: String,
    pub p2_name: String,
    pub prob_p1: f64,
    pub prob_p2: f64,
    pub odds_p1: f64,
    pub odds_p2: f64,
    pub set_results: Vec<(String, f64)>,
}

pub fn predict_live_match_data(
    db: &PlayerDatabase,
    model: &LogisticRegression<f64, i32, DenseMatrix<f64>, Vec<i32>>,
    p1_name: &str,
    p2_name: &str,
    surface: &str,
) -> Result<PredictionResult, String> {

    let p1_prof = db
        .get(p1_name)
        .ok_or_else(|| format!("Spieler '{}' nicht gefunden", p1_name))?;

    let p2_prof = db
        .get(p2_name)
        .ok_or_else(|| format!("Spieler '{}' nicht gefunden", p2_name))?;

    let glicko_diff = p1_prof.glicko_overall.rating - p2_prof.glicko_overall.rating;

    let form_diff =
        p1_prof.get_form_winrate() - p2_prof.get_form_winrate();

    let s_diff = match surface {
        "Clay" => p1_prof.glicko_surface_clay.rating - p2_prof.glicko_surface_clay.rating,
        "Hard" => p1_prof.glicko_surface_hard.rating - p2_prof.glicko_surface_hard.rating,
        "Grass" => p1_prof.glicko_surface_grass.rating - p2_prof.glicko_surface_grass.rating,
        _ => 0.0,
    };

    let serve_edge =
        (p1_prof.get_serve_winrate() - p2_prof.get_return_winrate())
        - (p2_prof.get_serve_winrate() - p1_prof.get_return_winrate());

    // Feature Matrix
    let _features = DenseMatrix::from_2d_vec(&vec![
        vec![glicko_diff, s_diff, form_diff, serve_edge],
    ]);

    // Modell Parameter
    let coeff = model.coefficients();
    let intercept = model.intercept();

    // Gewichte extrahieren
    let w0 = *coeff.get((0, 0));
    let w1 = *coeff.get((0, 1));
    let w2 = *coeff.get((0, 2));
    let w3 = *coeff.get((0, 3));
    let b = *intercept.get((0, 0));

    // Lineare Kombination
    let z = glicko_diff * w0
        + s_diff * w1
        + form_diff * w2
        + serve_edge * w3
        + b;

    // Sigmoid → Wahrscheinlichkeit
    let prob_p1 = 1.0 / (1.0 + (-z).exp());

    // Match → Set Wahrscheinlichkeit approximieren
    let mut low: f64 = 0.0;
    let mut high: f64  = 1.0;

    for _ in 0..20 {
        let mid = (low + high) / 2.0;
        let m = 3.0 * mid.powi(2) - 2.0 * mid.powi(3);

        if m < prob_p1 {
            low = mid;
        } else {
            high = mid;
        }
    }

    let set_prob_p1 = (low + high) / 2.0;

    let set_probs = calc_set_betting_probs(set_prob_p1, 3);

    Ok(PredictionResult {
        p1_name: p1_name.to_string(),
        p2_name: p2_name.to_string(),
        prob_p1,
        prob_p2: 1.0 - prob_p1,
        odds_p1: 1.0 / prob_p1,
        odds_p2: 1.0 / (1.0 - prob_p1),
        set_results: set_probs,
    })
}