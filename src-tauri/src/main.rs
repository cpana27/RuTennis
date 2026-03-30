#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::State;

use tennis_lib::player::player::PlayerDatabase;
use tennis_lib::datalayer::datalayer::load_and_process_history;
use tennis_lib::interface::interface::predict_live_match_data;

use smartcore::linalg::basic::matrix::DenseMatrix;
use smartcore::linear::logistic_regression::LogisticRegression;

// Der exakte Typ für Smartcore 0.3
type MyModel = LogisticRegression<f64, i32, DenseMatrix<f64>, Vec<i32>>;

struct AppState {
    db: Mutex<PlayerDatabase>,
    model: Mutex<Option<MyModel>>,
}

#[tauri::command]
fn get_players(state: State<'_, AppState>) -> Vec<String> {
    let db = state.db.lock().unwrap();
    let mut names: Vec<String> = db.keys().cloned().collect();
    names.sort();
    names
}

#[tauri::command]
async fn get_prediction(
    p1: String, 
    p2: String, 
    surface: String, 
    state: State<'_, AppState>
) -> Result<String, String> {
    let db = state.db.lock().unwrap();
    let model_lock = state.model.lock().unwrap();
    
    if let Some(model) = &*model_lock {
        // Aufruf an die Library
        match predict_live_match_data(&db, model, &p1, &p2, &surface) {
            Ok(res) => serde_json::to_string(&res).map_err(|e| e.to_string()),
            Err(e) => Err(e), // e ist bereits ein String
        }
    } else {
        Err("KI-Modell ist noch nicht bereit!".into())
    }
}

fn main() {
    let mut database = std::collections::HashMap::new();
    let file_path = "../src/data/atp_master_sorted.csv"; 

    println!("🎾 Initialisiere Engine...");
    
    let (x_data, y_data_f64) = load_and_process_history(&mut database, file_path)
        .expect("CSV-Datei konnte nicht geladen werden. Pfad prüfen!");
    
    // WICHTIG: Labels in i32 umwandeln für Smartcore 0.3
    let y_data_i32: Vec<i32> = y_data_f64.into_iter().map(|v| v as i32).collect();
    let x_matrix = DenseMatrix::from_2d_vec(&x_data);
    
    let model = LogisticRegression::fit(
        &x_matrix, 
        &y_data_i32, 
        Default::default()
    ).expect("KI-Training fehlgeschlagen");

    println!("✅ Modell bereit. Starte GUI...");

    tauri::Builder::default()
        .manage(AppState { 
            db: Mutex::new(database), 
            model: Mutex::new(Some(model)) 
        })
        .invoke_handler(tauri::generate_handler![get_prediction])
        .invoke_handler(tauri::generate_handler![get_prediction, get_players])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der Tauri-App");
}