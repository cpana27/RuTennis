use crate::player::player::{PlayerDatabase, PlayerProfile, process_match};
use polars::prelude::*;
use rand::Rng;
use skillratings::glicko2::Glicko2Config;
use std::time::Instant;
use std::io::Cursor; // <-- WICHTIG: Neuer Import für den RAM-Reader

// NEU: Die Funktion nimmt jetzt ein Byte-Array (`&[u8]`) statt eines Dateipfads
pub fn load_and_process_history(
    db: &mut PlayerDatabase,
    csv_bytes: &[u8],
) -> Result<(Vec<Vec<f64>>, Vec<f64>), Box<dyn std::error::Error>> {
    println!("Lade historische Daten inkl. Aufschlagstatistiken aus dem Speicher...");
    let start_time = Instant::now();

    // NEU: Wir lesen die Datei aus dem RAM (Cursor), nicht von der Festplatte
    let cursor = Cursor::new(csv_bytes);
    let df = CsvReader::new(cursor)
        .has_header(true)
        .with_ignore_errors(true)
        .infer_schema(Some(10000))
        .finish()?;

    // Strings laden
    let winners = df.column("winner_name")?.str()?;
    let losers = df.column("loser_name")?.str()?;
    let surfaces = df.column("surface")?.str()?;

    // Zahlen laden
    let c_w_svpt = df.column("w_svpt")?.cast(&DataType::Float64)?;
    let w_svpt = c_w_svpt.f64()?;
    let c_w_1st = df.column("w_1stWon")?.cast(&DataType::Float64)?;
    let w_1st = c_w_1st.f64()?;
    let c_w_2nd = df.column("w_2ndWon")?.cast(&DataType::Float64)?;
    let w_2nd = c_w_2nd.f64()?;

    let c_l_svpt = df.column("l_svpt")?.cast(&DataType::Float64)?;
    let l_svpt = c_l_svpt.f64()?;
    let c_l_1st = df.column("l_1stWon")?.cast(&DataType::Float64)?;
    let l_1st = c_l_1st.f64()?;
    let c_l_2nd = df.column("l_2ndWon")?.cast(&DataType::Float64)?;
    let l_2nd = c_l_2nd.f64()?;

    let config = Glicko2Config::new();
    let mut rng = rand::thread_rng();

    let mut x_train: Vec<Vec<f64>> = Vec::new();
    let mut y_train: Vec<f64> = Vec::new();
    let empty_profile = PlayerProfile::new();

    println!("Jage Matches durch die Engine und sammle KI-Daten im RAM...");

    for i in 0..df.height() {
        if let (Some(w), Some(l), Some(s)) = (winners.get(i), losers.get(i), surfaces.get(i)) {
            let w_clean = w.trim();
            let l_clean = l.trim();
            let s_clean = s.trim();

            let wv_svpt = w_svpt.get(i).unwrap_or(0.0);
            let wv_1st = w_1st.get(i).unwrap_or(0.0);
            let wv_2nd = w_2nd.get(i).unwrap_or(0.0);
            let lv_svpt = l_svpt.get(i).unwrap_or(0.0);
            let lv_1st = l_1st.get(i).unwrap_or(0.0);
            let lv_2nd = l_2nd.get(i).unwrap_or(0.0);

            let p1_is_winner = rng.gen_bool(0.5);
            let (p1_name, p2_name) = if p1_is_winner {
                (w_clean, l_clean)
            } else {
                (l_clean, w_clean)
            };

            let p1_prof = db.get(p1_name).unwrap_or(&empty_profile);
            let p2_prof = db.get(p2_name).unwrap_or(&empty_profile);

            let glicko_diff = p1_prof.glicko_overall.rating - p2_prof.glicko_overall.rating;
            let form_diff = p1_prof.get_form_winrate() - p2_prof.get_form_winrate();
            let surface_glicko_diff = match s_clean {
                "Clay" => p1_prof.glicko_surface_clay.rating - p2_prof.glicko_surface_clay.rating,
                "Hard" => p1_prof.glicko_surface_hard.rating - p2_prof.glicko_surface_hard.rating,
                "Grass" => p1_prof.glicko_surface_grass.rating - p2_prof.glicko_surface_grass.rating,
                _ => 0.0,
            };

            let p1_advantage = p1_prof.get_serve_winrate() - p2_prof.get_return_winrate();
            let p2_advantage = p2_prof.get_serve_winrate() - p1_prof.get_return_winrate();
            let serve_edge = p1_advantage - p2_advantage;

            if p1_prof.matches_played >= 5 && p2_prof.matches_played >= 5 {
                x_train.push(vec![
                    glicko_diff,
                    surface_glicko_diff,
                    form_diff,
                    serve_edge,
                ]);
                y_train.push(if p1_is_winner { 1.0 } else { 0.0 });
            }

            process_match(
                db, w_clean, l_clean, s_clean, wv_svpt, wv_1st, wv_2nd, lv_svpt, lv_1st, lv_2nd,
                &config,
            );
        }
    }

    let duration = start_time.elapsed();
    println!("✅ DATEN VERARBEITET! (Zeit: {:?})", duration);

    Ok((x_train, y_train))
}