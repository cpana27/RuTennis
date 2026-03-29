use crate::datalayer::datalayer::load_and_process_history;
use crate::math::mathematics::*;
use crate::player::player::PlayerDatabase;
use crate::interface::interface::predict_live_match;
use std::collections::HashMap;
use std::io;
use std::io::Write;
// --- NEU: SMARTCORE IMPORTE FÜR DAS TRAINING ---
use smartcore::linalg::naive::dense_matrix::DenseMatrix;
use smartcore::linear::logistic_regression::LogisticRegression;

pub mod datalayer;
mod math;
pub mod player;
pub mod interface;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let file_path: &str = "src/data/atp_master_sorted.csv";

    // --- 1. MATHE TEST ---
    println!("=== 🧠 MATHE ENGINE TEST ===");
    let p_serve_djokovic = 0.68;
    let p_serve_alcaraz = 0.65;
    let game_prob_d = calc_game_prob(p_serve_djokovic);
    let game_prob_a = calc_game_prob(p_serve_alcaraz);
    let tb_prob = calc_tiebreak_prob(p_serve_djokovic, p_serve_alcaraz);
    let set_prob = calc_set_prob(game_prob_d, game_prob_a, tb_prob);
    let match_prob = calc_match_prob(set_prob, 3);

    println!(
        "Djokovic Match Gewinnchance (Best of 3): {:.2}%\n",
        match_prob * 100.0
    );

    // --- 2. DATENBANK INITIALISIEREN ---
    println!("=== 📂 INITIALISIERE AKTENWAND ===");
    let mut database: PlayerDatabase = HashMap::new();

    // --- 3. HISTORIE LADEN & KI-DATEN SAMMELN ---
    // WICHTIG: Dein Datalayer muss jetzt (x_data, y_data) zurückgeben!
    let (x_data, y_data) = load_and_process_history(&mut database, file_path)?;

    // --- 4. KI DIREKT IN RUST TRAINIEREN ---
    println!("\n🧠 Trainiere KI-Modell auf {} Matches...", x_data.len());
    let x_matrix = DenseMatrix::from_2d_vec(&x_data);
    let model = LogisticRegression::fit(&x_matrix, &y_data, Default::default())
        .map_err(|e| e.to_string())?;
    println!("✅ Modell erfolgreich trainiert!");

    // --- 5. AUSWERTUNG DER LEGENDEN ---
    println!("\n=== 🏆 TOP SPIELER CHECK ===");
    let test_players = vec![
        "Novak Djokovic",
        "Carlos Alcaraz",
        "Rafael Nadal",
        "Roger Federer",
    ];

    for player in test_players {
        if let Some(profile) = database.get(player) {
            println!("Spieler: {}", player);
            println!("  -> Glicko Rating: {:.2}", profile.glicko_overall.rating);
            println!(
                "  -> Form (Winrate): {:.0}%",
                profile.get_form_winrate() * 100.0
            );
            println!("  -> Gespielte Matches: {}", profile.matches_played);
            println!("-----------------------------------");
        } else {
            println!("Spieler '{}' nicht gefunden.", player);
        }
    }

    println!("=== 🕵️ TOP 10 SPIELER (Meiste Matches) ===");
    let mut all_players: Vec<_> = database.iter().collect();
    all_players.sort_by(|a, b| b.1.matches_played.cmp(&a.1.matches_played));

    for (name, profile) in all_players.iter().take(10) {
        println!(
            "Name im Datensatz: '{}' -> {} Matches (Glicko: {:.0})",
            name, profile.matches_played, profile.glicko_overall.rating
        );
    }

    // --- 6. LIVE WETT-STATION ---
    println!("\n=== 🟢 LIVE WETT-STATION GEÖFFNET ===");
    println!("Tippe 'exit' bei Spieler 1 ein, um das Programm zu beenden.");

    loop {
        let mut p1_input = String::new();
        let mut p2_input = String::new();
        let mut surface_input = String::new();

        // Spieler 1 abfragen
        print!("\n🎾 Spieler 1: ");
        io::stdout().flush().unwrap();
        io::stdin().read_line(&mut p1_input).unwrap();
        let p1_name = p1_input.trim();

        if p1_name.eq_ignore_ascii_case("exit") {
            println!("👋 Wett-Station geschlossen. Bis zum nächsten Mal!");
            break;
        }

        // Spieler 2 abfragen
        print!("🎾 Spieler 2: ");
        io::stdout().flush().unwrap();
        io::stdin().read_line(&mut p2_input).unwrap();
        let p2_name = p2_input.trim();

        // Belag abfragen
        print!("🌍 Belag (Hard/Clay/Grass): ");
        io::stdout().flush().unwrap();
        io::stdin().read_line(&mut surface_input).unwrap();
        let surface = surface_input.trim();

        // Sicherheits-Check: Gibt es die Spieler in unserer Aktenwand?
        if !database.contains_key(p1_name) {
            println!("⚠️  FEHLER: Spieler '{}' nicht gefunden. Auf genaue Schreibweise achten!", p1_name);
            continue;
        }
        if !database.contains_key(p2_name) {
            println!("⚠️  FEHLER: Spieler '{}' nicht gefunden. Auf genaue Schreibweise achten!", p2_name);
            continue;
        }
        if surface != "Hard" && surface != "Clay" && surface != "Grass" {
            println!("⚠️  FEHLER: Belag muss 'Hard', 'Clay' oder 'Grass' sein.");
            continue;
        }

        // Vorhersage abfeuern!
        if let Err(e) = predict_live_match(&database, &model, p1_name, p2_name, surface) {
            println!("⚠️ Fehler bei der Berechnung: {}", e);
        }
    }
    Ok(())
}