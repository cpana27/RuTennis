#![cfg(test)] // Diese Zeile markiert die KOMPLETTE Datei als reinen Test-Code!

use crate::player::player::{process_match, PlayerDatabase, PlayerProfile};
use polars::prelude::*;
use skillratings::glicko2::Glicko2Config;
use smartcore::linalg::naive::dense_matrix::DenseMatrix;
use smartcore::linear::logistic_regression::LogisticRegression;
use smartcore::linalg::BaseMatrix;
use rand::Rng;
use std::collections::HashMap;
use std::time::Instant;

// Unser Container für die "Zukunfts-Matches" (2025)
struct MatchRecord {
    winner: String, loser: String, surface: String,
    w_svpt: f64, w_1st_won: f64, w_2nd_won: f64,
    l_svpt: f64, l_1st_won: f64, l_2nd_won: f64,
}

#[test]
fn run_2025_backtest() -> Result<(), Box<dyn std::error::Error>> {
    println!("\n==================================================");
    println!("🚀 STARTE ISOLIERTEN BACKTEST FÜR 2025");
    println!("==================================================");
    let start_time = Instant::now();
    let file_path = "src/data/atp_master_sorted.csv";
    let split_year = 2025; // Ab dem 1.1.2025 wird blind gewettet!

    // 1. Daten laden
    let df = CsvReader::from_path(file_path)?
        .has_header(true)
        .with_ignore_errors(true)
        .infer_schema(Some(10000))
        .finish()?;

    let winners = df.column("winner_name")?.str()?;
    let losers = df.column("loser_name")?.str()?;
    let surfaces = df.column("surface")?.str()?;

    // Wir ziehen das Datum heraus, um das Jahr zu erkennen
    let dates = df.column("tourney_date")?.cast(&DataType::Int32)?;
    let dates_i32 = dates.i32()?;

    let w_svpt = df.column("w_svpt")?.cast(&DataType::Float64)?; let w_svpt_f = w_svpt.f64()?;
    let w_1st = df.column("w_1stWon")?.cast(&DataType::Float64)?; let w_1st_f = w_1st.f64()?;
    let w_2nd = df.column("w_2ndWon")?.cast(&DataType::Float64)?; let w_2nd_f = w_2nd.f64()?;
    let l_svpt = df.column("l_svpt")?.cast(&DataType::Float64)?; let l_svpt_f = l_svpt.f64()?;
    let l_1st = df.column("l_1stWon")?.cast(&DataType::Float64)?; let l_1st_f = l_1st.f64()?;
    let l_2nd = df.column("l_2ndWon")?.cast(&DataType::Float64)?; let l_2nd_f = l_2nd.f64()?;

    let mut db: PlayerDatabase = HashMap::new();
    let config = Glicko2Config::new();
    let mut rng = rand::thread_rng();

    let mut x_train: Vec<Vec<f64>> = Vec::new();
    let mut y_train: Vec<f64> = Vec::new();
    let mut test_matches = Vec::new();
    let empty_profile = PlayerProfile::new();

    println!("📂 Lese CSV und trenne die Zeitlinie am 31.12.2024...");

    // 2. Zeitreise beginnen
    for i in 0..df.height() {
        if let (Some(w), Some(l), Some(s), Some(d)) = (winners.get(i), losers.get(i), surfaces.get(i), dates_i32.get(i)) {
            let w_clean = w.trim();
            let l_clean = l.trim();
            let s_clean = s.trim();
            let match_year = d / 10000; // Aus 20250527 wird 2025

            let wv_svpt = w_svpt_f.get(i).unwrap_or(0.0);
            let wv_1st = w_1st_f.get(i).unwrap_or(0.0);
            let wv_2nd = w_2nd_f.get(i).unwrap_or(0.0);
            let lv_svpt = l_svpt_f.get(i).unwrap_or(0.0);
            let lv_1st = l_1st_f.get(i).unwrap_or(0.0);
            let lv_2nd = l_2nd_f.get(i).unwrap_or(0.0);

            if match_year < split_year {
                // PHASE 1: TRAINING (Bis Ende 2024)
                let p1_is_winner = rng.gen_bool(0.5);
                let (p1_name, p2_name) = if p1_is_winner { (w_clean, l_clean) } else { (l_clean, w_clean) };

                let p1_prof = db.get(p1_name).unwrap_or(&empty_profile);
                let p2_prof = db.get(p2_name).unwrap_or(&empty_profile);

                if p1_prof.matches_played >= 5 && p2_prof.matches_played >= 5 {
                    let glicko_diff = p1_prof.glicko_overall.rating - p2_prof.glicko_overall.rating;
                    let form_diff = p1_prof.get_form_winrate() - p2_prof.get_form_winrate();
                    let s_diff = match s_clean {
                        "Clay" => p1_prof.glicko_surface_clay.rating - p2_prof.glicko_surface_clay.rating,
                        "Hard" => p1_prof.glicko_surface_hard.rating - p2_prof.glicko_surface_hard.rating,
                        "Grass" => p1_prof.glicko_surface_grass.rating - p2_prof.glicko_surface_grass.rating,
                        _ => 0.0,
                    };
                    let serve_edge = (p1_prof.get_serve_winrate() - p2_prof.get_return_winrate()) - (p2_prof.get_serve_winrate() - p1_prof.get_return_winrate());

                    x_train.push(vec![glicko_diff, s_diff, form_diff, serve_edge]);
                    y_train.push(if p1_is_winner { 1.0 } else { 0.0 });
                }

                process_match(&mut db, w_clean, l_clean, s_clean, wv_svpt, wv_1st, wv_2nd, lv_svpt, lv_1st, lv_2nd, &config);
            } else {
                // PHASE 2: TRESOR (2025 Matches sichern)
                test_matches.push(MatchRecord {
                    winner: w_clean.to_string(), loser: l_clean.to_string(), surface: s_clean.to_string(),
                    w_svpt: wv_svpt, w_1st_won: wv_1st, w_2nd_won: wv_2nd,
                    l_svpt: lv_svpt, l_1st_won: lv_1st, l_2nd_won: lv_2nd,
                });
            }
        }
    }

    // 3. KI Trainieren
    println!("🧠 Trainiere KI auf {} historischen Matches (bis 2024)...", x_train.len());
    let x_matrix = DenseMatrix::from_2d_vec(&x_train);
    let model = LogisticRegression::fit(&x_matrix, &y_train, Default::default()).unwrap();

    // 4. Der blinde Walk-Forward Test für 2025
    println!("🔮 Teste KI blind auf {} unbekannten Matches aus dem Jahr {}...", test_matches.len(), split_year);
    let mut correct = 0;
    let mut total = 0;

    let coeffs = model.coefficients();
    let b = model.intercept().get(0,0);
    let w0 = coeffs.get(0,0); let w1 = coeffs.get(0,1); let w2 = coeffs.get(0,2); let w3 = coeffs.get(0,3);

    for m in test_matches {
        let p1_prof = db.get(&m.winner).unwrap_or(&empty_profile);
        let p2_prof = db.get(&m.loser).unwrap_or(&empty_profile);

        if p1_prof.matches_played >= 5 && p2_prof.matches_played >= 5 {
            let glicko_diff = p1_prof.glicko_overall.rating - p2_prof.glicko_overall.rating;
            let form_diff = p1_prof.get_form_winrate() - p2_prof.get_form_winrate();
            let s_diff = match m.surface.as_str() {
                "Clay" => p1_prof.glicko_surface_clay.rating - p2_prof.glicko_surface_clay.rating,
                "Hard" => p1_prof.glicko_surface_hard.rating - p2_prof.glicko_surface_hard.rating,
                "Grass" => p1_prof.glicko_surface_grass.rating - p2_prof.glicko_surface_grass.rating,
                _ => 0.0,
            };
            let serve_edge = (p1_prof.get_serve_winrate() - p2_prof.get_return_winrate()) - (p2_prof.get_serve_winrate() - p1_prof.get_return_winrate());

            let z = (glicko_diff * w0) + (s_diff * w1) + (form_diff * w2) + (serve_edge * w3) + b;
            let prob_p1_wins = 1.0 / (1.0 + (-z).exp());

            if prob_p1_wins > 0.5 { correct += 1; }
            total += 1;
        }

        process_match(&mut db, &m.winner, &m.loser, &m.surface, m.w_svpt, m.w_1st_won, m.w_2nd_won, m.l_svpt, m.l_1st_won, m.l_2nd_won, &config);
    }

    let acc = (correct as f64 / total as f64) * 100.0;
    println!("==================================================");
    println!("🏆 FINALES BACKTEST ERGEBNIS ({})", split_year);
    println!("--------------------------------------------------");
    println!("Wetten platziert:   {}", total);
    println!("Gewonnene Wetten:   {}", correct);
    println!("Trefferquote:       {:.2}%", acc);
    println!("Verstrichene Zeit:  {:?}", start_time.elapsed());
    println!("==================================================\n");

    Ok(())
}