pub fn calc_game_prob(p: f64) -> f64 {
    if (p - 0.5).abs() < 1e-9 {
        return 0.5;
    }

    let term1 = p.powi(4);
    let term2 = 4.0 * p.powi(4) * (1.0 - p);
    let term3 = 10.0 * p.powi(4) * (1.0 - p).powi(2);
    let term4 = (20.0 * p.powi(5) * (1.0 - p).powi(3)) / (1.0 - 2.0 * p * (1.0 - p));

    term1 + term2 + term3 + term4
}

pub fn calc_tiebreak_prob(pa: f64, pb: f64) -> f64 {
    let mut v = [[0.0_f64; 8]; 8];

    // Ränder definieren (7 Punkte erreicht)
    for i in 0..8 {
        v[7][i] = 1.0;
        v[i][7] = 0.0;
    }

    let prob_a_wins_both = pa * (1.0 - pb);
    let prob_b_wins_both = (1.0 - pa) * pb;
    let prob_split = 1.0 - prob_a_wins_both - prob_b_wins_both;

    if (1.0 - prob_split).abs() < 1e-9 {
        v[6][6] = 0.5;
    } else {
        v[6][6] = prob_a_wins_both / (1.0 - prob_split);
    }

    // Rückwärtsinduktion
    for i in (0..=6).rev() {
        for j in (0..=6).rev() {
            if i == 6 && j == 6 {
                continue;
            }

            let total_points = i + j;
            // Aufschlagregel im Tiebreak
            if total_points % 4 == 0 || total_points % 4 == 3 {
                // A schlägt auf
                v[i][j] = pa * v[i + 1][j] + (1.0 - pa) * v[i][j + 1];
            } else {
                // B schlägt auf
                v[i][j] = (1.0 - pb) * v[i + 1][j] + pb * v[i][j + 1];
            }
        }
    }
    v[0][0]
}

/// Berechnet die Wahrscheinlichkeit, einen ganzen Satz zu gewinnen.
pub fn calc_set_prob(p_hold_a: f64, p_hold_b: f64, p_tiebreak_a: f64) -> f64 {
    let mut v = [[0.0_f64; 8]; 8];
    let p_break_a = 1.0 - p_hold_b;

    for i in 0..5 {
        v[6][i] = 1.0;
        v[i][6] = 0.0;
    }
    v[7][5] = 1.0;
    v[5][7] = 0.0;
    v[6][6] = p_tiebreak_a;

    for i in (0..=6).rev() {
        for j in (0..=6).rev() {
            if (i == 6 && j < 5)
                || (i < 5 && j == 6)
                || (i == 5 && j == 7)
                || (i == 7 && j == 5)
                || (i == 6 && j == 6)
            {
                continue;
            }

            let total_games = i + j;
            let p_win_game = if total_games % 2 == 0 {
                p_hold_a
            } else {
                p_break_a
            };
            v[i][j] = p_win_game * v[i + 1][j] + (1.0 - p_win_game) * v[i][j + 1];
        }
    }
    v[0][0]
}

/// Rechnet die Satz-Wahrscheinlichkeit auf das ganze Match hoch.
pub fn calc_match_prob(p_set_a: f64, best_of: u8) -> f64 {
    if best_of == 5 {
        // Grand Slams
        p_set_a.powi(3)
            + 3.0 * p_set_a.powi(3) * (1.0 - p_set_a)
            + 6.0 * p_set_a.powi(3) * (1.0 - p_set_a).powi(2)
    } else {
        // Standard (Best of 3)
        p_set_a.powi(2) + 2.0 * p_set_a.powi(2) * (1.0 - p_set_a)
    }
}

// =======================================================
// NEU: DERIVATE-PRICER FÜR SATZ-WETTEN (EXAKTES ERGEBNIS)
// =======================================================
/// Gibt eine Liste aller genauen Set-Ergebnisse und deren Wahrscheinlichkeit zurück
pub fn calc_set_betting_probs(p_set_a: f64, best_of: u8) -> Vec<(String, f64)> {
    let mut results = Vec::new();
    let p_set_b = 1.0 - p_set_a;

    if best_of == 3 {
        // Kombinatorik für Best-of-3
        let p_2_0 = p_set_a.powi(2);
        // A gewinnt exakt 2:1 (Beide gewinnen einen Satz, dann gewinnt A den Dritten)
        let p_2_1 = 2.0 * p_set_a * p_set_b * p_set_a;

        let p_1_2 = 2.0 * p_set_a * p_set_b * p_set_b;
        let p_0_2 = p_set_b.powi(2);

        results.push(("2:0".to_string(), p_2_0));
        results.push(("2:1".to_string(), p_2_1));
        results.push(("1:2".to_string(), p_1_2));
        results.push(("0:2".to_string(), p_0_2));
    } else if best_of == 5 {
        // Kombinatorik für Grand Slams (Best-of-5)
        let p_3_0 = p_set_a.powi(3);
        let p_3_1 = 3.0 * p_set_a.powi(3) * p_set_b;
        let p_3_2 = 6.0 * p_set_a.powi(3) * p_set_b.powi(2);

        let p_2_3 = 6.0 * p_set_b.powi(3) * p_set_a.powi(2);
        let p_1_3 = 3.0 * p_set_b.powi(3) * p_set_a;
        let p_0_3 = p_set_b.powi(3);

        results.push(("3:0".to_string(), p_3_0));
        results.push(("3:1".to_string(), p_3_1));
        results.push(("3:2".to_string(), p_3_2));
        results.push(("2:3".to_string(), p_2_3));
        results.push(("1:3".to_string(), p_1_3));
        results.push(("0:3".to_string(), p_0_3));
    }

    results
}


use rand::Rng;
use serde::{Serialize, Deserialize};

// ─── MONTE CARLO DATENSTRUKTUR ────────────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MonteCarloResult {
    pub prob_p1: f64,
    pub ci_low: f64,
    pub ci_high: f64,
    pub avg_sets: f64,
    pub prob_straight_sets: f64, // P1 gewinnt ohne Satzverlust
    pub simulations: u32,
}

// ─── PUNKT SIMULATION ─────────────────────────────────────────────────────────
#[inline]
fn sim_punkt(p_server: f64, rng: &mut impl Rng) -> bool {
    rng.r#gen::<f64>() < p_server
}

// ─── SPIEL SIMULATION ─────────────────────────────────────────────────────────
fn sim_game(p_serve: f64, rng: &mut impl Rng) -> bool {
    let mut server = 0i32;
    let mut returner = 0i32;
    loop {
        if sim_punkt(p_serve, rng) {
            server += 1;
        } else {
            returner += 1;
        }
        if server >= 3 && returner >= 3 {
            match server - returner {
                d if d >= 2 => return true,
                d if d <= -2 => return false,
                _ => {}
            }
        } else if server >= 4 {
            return true;
        } else if returner >= 4 {
            return false;
        }
    }
}

// ─── TIEBREAK SIMULATION ──────────────────────────────────────────────────────
fn sim_tiebreak(p1_serve: f64, p2_serve: f64, rng: &mut impl Rng) -> bool {
    let mut p1 = 0i32;
    let mut p2 = 0i32;
    let mut p1_serves = true;
    loop {
        let punkt_p1 = if p1_serves {
            sim_punkt(p1_serve, rng)
        } else {
            !sim_punkt(p2_serve, rng)
        };
        if punkt_p1 { p1 += 1; } else { p2 += 1; }
        let gesamt = p1 + p2;
        if gesamt == 1 || (gesamt > 1 && (p1 + p2) % 2 == 1) {
            p1_serves = !p1_serves;
        }
        if p1 >= 7 && p1 - p2 >= 2 { return true; }
        if p2 >= 7 && p2 - p1 >= 2 { return false; }
    }
}

// ─── SATZ SIMULATION ──────────────────────────────────────────────────────────
fn sim_set(p1_serve: f64, p2_serve: f64, p1_beginnt: bool, rng: &mut impl Rng) -> (bool, u32) {
    let mut p1_games = 0i32;
    let mut p2_games = 0i32;
    let mut p1_aufschlag = p1_beginnt;
    loop {
        let game_p1 = if p1_aufschlag {
            sim_game(p1_serve, rng)
        } else {
            !sim_game(p2_serve, rng)
        };
        if game_p1 { p1_games += 1; } else { p2_games += 1; }
        p1_aufschlag = !p1_aufschlag;

        if p1_games == 6 && p2_games == 6 {
            let tb = sim_tiebreak(p1_serve, p2_serve, rng);
            return (tb, (p1_games + p2_games + 1) as u32);
        }
        let max = p1_games.max(p2_games);
        let min = p1_games.min(p2_games);
        if max >= 6 && max - min >= 2 {
            return (p1_games > p2_games, (p1_games + p2_games) as u32);
        }
    }
}

// ─── MATCH SIMULATION (pub für set_markets) ───────────────────────────────────
pub fn sim_match_pub(p1_serve: f64, p2_serve: f64, best_of: u32, rng: &mut impl Rng) -> (bool, u32) {
    let zum_sieg = (best_of / 2) + 1;
    let mut p1_saetze = 0u32;
    let mut p2_saetze = 0u32;
    let mut gesamt = 0u32;
    let mut p1_beginnt = true;
    loop {
        let (p1_gewinnt, _) = sim_set(p1_serve, p2_serve, p1_beginnt, rng);
        gesamt += 1;
        if p1_gewinnt { p1_saetze += 1; } else { p2_saetze += 1; }
        p1_beginnt = !p1_beginnt;
        if p1_saetze == zum_sieg { return (true, gesamt); }
        if p2_saetze == zum_sieg { return (false, gesamt); }
    }
}

// ─── MONTE CARLO HAUPT-FUNKTION ───────────────────────────────────────────────
pub fn monte_carlo_simulation(
    p1_serve: f64,
    p2_serve: f64,
    best_of: u32,
    n: u32,
) -> MonteCarloResult {
    let mut rng = rand::thread_rng();
    let mut p1_siege = 0u32;
    let mut gesamt_saetze = 0u32;
    let mut p1_straight = 0u32;
    let saetze_fuer_sieg = (best_of / 2) + 1;

    for _ in 0..n {
        let (p1_gewinnt, saetze) = sim_match_pub(p1_serve, p2_serve, best_of, &mut rng);
        gesamt_saetze += saetze;
        if p1_gewinnt {
            p1_siege += 1;
            if saetze == saetze_fuer_sieg {
                p1_straight += 1;
            }
        }
    }

    let prob = p1_siege as f64 / n as f64;

    // Wilson 95% Konfidenzintervall
    let z = 1.96_f64;
    let n_f = n as f64;
    let center = (prob + z * z / (2.0 * n_f)) / (1.0 + z * z / n_f);
    let margin = (z / (1.0 + z * z / n_f))
        * ((prob * (1.0 - prob) / n_f) + z * z / (4.0 * n_f * n_f)).sqrt();

    MonteCarloResult {
        prob_p1: prob,
        ci_low: (center - margin).max(0.0),
        ci_high: (center + margin).min(1.0),
        avg_sets: gesamt_saetze as f64 / n as f64,
        prob_straight_sets: p1_straight as f64 / p1_siege.max(1) as f64,
        simulations: n,
    }
}

// ─── SATZ-MÄRKTE VIA MONTE CARLO ─────────────────────────────────────────────
pub fn calc_set_markets_mc(
    p1_serve: f64,
    p2_serve: f64,
    p1_name: &str,
    p2_name: &str,
) -> Vec<(String, f64)> {
    let mut rng = rand::thread_rng();
    let n = 5_000u32;
    let mut counts: std::collections::HashMap<String, u32> = std::collections::HashMap::new();

    for _ in 0..n {
        let (p1_gewinnt, saetze) = sim_match_pub(p1_serve, p2_serve, 3, &mut rng);
        let key = if p1_gewinnt {
            if saetze == 2 { format!("{} 2-0", p1_name) }
            else           { format!("{} 2-1", p1_name) }
        } else {
            if saetze == 2 { format!("{} 2-0", p2_name) }
            else           { format!("{} 2-1", p2_name) }
        };
        *counts.entry(key).or_insert(0) += 1;
    }

    let mut results: Vec<(String, f64)> = counts
        .into_iter()
        .map(|(k, v)| (k, v as f64 / n as f64))
        .collect();
    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    results
}