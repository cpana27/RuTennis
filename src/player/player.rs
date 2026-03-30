use skillratings::Outcomes;
use skillratings::glicko2::{Glicko2Config, Glicko2Rating, glicko2};
use std::collections::{HashMap, VecDeque};

#[derive(Debug)]
pub struct PlayerProfile {
    pub glicko_overall: Glicko2Rating,
    pub glicko_surface_clay: Glicko2Rating,
    pub glicko_surface_hard: Glicko2Rating,
    pub glicko_surface_grass: Glicko2Rating,

    // NEU: Aufschlag & Return Statistiken
    pub serve_points_won: f64,
    pub serve_points_played: f64,
    pub return_points_won: f64,
    pub return_points_played: f64,

    pub(crate) matches_played: usize,
    pub form_10m: VecDeque<bool>,
}

impl PlayerProfile {
    pub fn new() -> Self {
        Self {
            glicko_overall: Glicko2Rating::new(),
            glicko_surface_clay: Default::default(),
            glicko_surface_hard: Default::default(),
            glicko_surface_grass: Default::default(),
            serve_points_won: 0.0,
            serve_points_played: 0.0,
            return_points_won: 0.0,
            return_points_played: 0.0,
            matches_played: 0,
            form_10m: VecDeque::with_capacity(10),
        }
    }

    pub fn update_form(&mut self, won: bool) {
        if self.form_10m.len() == 10 {
            self.form_10m.pop_front();
        }
        self.form_10m.push_back(won);
    }

    pub fn get_form_winrate(&self) -> f64 {
        if self.form_10m.is_empty() {
            return 0.5;
        }
        let wins = self.form_10m.iter().filter(|&&w| w).count() as f64;
        wins / self.form_10m.len() as f64
    }

    // NEU: Wahrscheinlichkeit, einen eigenen Aufschlagpunkt zu gewinnen (ATP Schnitt ist ca. 62%)
    pub fn get_serve_winrate(&self) -> f64 {
        if self.serve_points_played == 0.0 {
            return 0.62;
        }
        self.serve_points_won / self.serve_points_played
    }

    // NEU: Wahrscheinlichkeit, einen gegnerischen Aufschlagpunkt zu gewinnen (ATP Schnitt ca. 38%)
    pub fn get_return_winrate(&self) -> f64 {
        if self.return_points_played == 0.0 {
            return 0.38;
        }
        self.return_points_won / self.return_points_played
    }
}

// ==========================================
// 2. DIE UPDATE-FUNKTION
// ==========================================
pub fn process_match(
    db: &mut PlayerDatabase,
    winner: &str,
    loser: &str,
    surface: &str,
    w_svpt: f64,
    w_1st_won: f64,
    w_2nd_won: f64, // NEU: Winner Stats
    l_svpt: f64,
    l_1st_won: f64,
    l_2nd_won: f64, // NEU: Loser Stats
    config: &Glicko2Config,
) {
    let mut winner_profile = db.remove(winner).unwrap_or_else(PlayerProfile::new);
    let mut loser_profile = db.remove(loser).unwrap_or_else(PlayerProfile::new);

    // Glicko Updates (unverändert)
    let (new_winner_glicko, new_loser_glicko) = glicko2(
        &winner_profile.glicko_overall,
        &loser_profile.glicko_overall,
        &Outcomes::WIN,
        config,
    );
    winner_profile.glicko_overall = new_winner_glicko;
    loser_profile.glicko_overall = new_loser_glicko;

    match surface {
        "Clay" => {
            let (w_surf, l_surf) = glicko2(
                &winner_profile.glicko_surface_clay,
                &loser_profile.glicko_surface_clay,
                &Outcomes::WIN,
                config,
            );
            winner_profile.glicko_surface_clay = w_surf;
            loser_profile.glicko_surface_clay = l_surf;
        }
        "Hard" => {
            let (w_surf, l_surf) = glicko2(
                &winner_profile.glicko_surface_hard,
                &loser_profile.glicko_surface_hard,
                &Outcomes::WIN,
                config,
            );
            winner_profile.glicko_surface_hard = w_surf;
            loser_profile.glicko_surface_hard = l_surf;
        }
        "Grass" => {
            let (w_surf, l_surf) = glicko2(
                &winner_profile.glicko_surface_grass,
                &loser_profile.glicko_surface_grass,
                &Outcomes::WIN,
                config,
            );
            winner_profile.glicko_surface_grass = w_surf;
            loser_profile.glicko_surface_grass = l_surf;
        }
        _ => {}
    }

    // NEU: Aufschlag/Return in die Akten schreiben (Nur wenn es in dem Jahr schon erfasst wurde)
    if w_svpt > 0.0 && l_svpt > 0.0 {
        let w_serve_won = w_1st_won + w_2nd_won;
        let l_serve_won = l_1st_won + l_2nd_won;

        winner_profile.serve_points_played += w_svpt;
        winner_profile.serve_points_won += w_serve_won;
        winner_profile.return_points_played += l_svpt;
        winner_profile.return_points_won += l_svpt - l_serve_won;

        loser_profile.serve_points_played += l_svpt;
        loser_profile.serve_points_won += l_serve_won;
        loser_profile.return_points_played += w_svpt;
        loser_profile.return_points_won += w_svpt - w_serve_won;
    }

    winner_profile.matches_played += 1;
    winner_profile.update_form(true);

    loser_profile.matches_played += 1;
    loser_profile.update_form(false);

    db.insert(winner.to_string(), winner_profile);
    db.insert(loser.to_string(), loser_profile);
}

pub type PlayerDatabase = HashMap<String, PlayerProfile>;
