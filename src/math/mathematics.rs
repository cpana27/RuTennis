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
            if i == 6 && j == 6 { continue; }

            let total_points = i + j;
            // Aufschlagregel im Tiebreak
            if total_points % 4 == 0 || total_points % 4 == 3 {
                // A schlägt auf
                v[i][j] = pa * v[i+1][j] + (1.0 - pa) * v[i][j+1];
            } else {
                // B schlägt auf
                v[i][j] = (1.0 - pb) * v[i+1][j] + pb * v[i][j+1];
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
            if (i == 6 && j < 5) || (i < 5 && j == 6) || (i == 5 && j == 7) || (i == 7 && j == 5) || (i == 6 && j == 6) {
                continue;
            }

            let total_games = i + j;
            let p_win_game = if total_games % 2 == 0 { p_hold_a } else { p_break_a };
            v[i][j] = p_win_game * v[i+1][j] + (1.0 - p_win_game) * v[i][j+1];
        }
    }
    v[0][0]
}

/// Rechnet die Satz-Wahrscheinlichkeit auf das ganze Match hoch.
pub fn calc_match_prob(p_set_a: f64, best_of: u8) -> f64 {
    if best_of == 5 {
        // Grand Slams
        p_set_a.powi(3) + 3.0 * p_set_a.powi(3) * (1.0 - p_set_a) + 6.0 * p_set_a.powi(3) * (1.0 - p_set_a).powi(2)
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