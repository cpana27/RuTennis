import { useState, useEffect, useRef, createContext, useContext } from "react";
import { invoke } from "@tauri-apps/api/core";

// ─── SPRACH-KONTEXT & WÖRTERBUCH ──────────────────────────────────────────────
const LanguageContext = createContext("de");

const translations = {
  de: {
    title: "🎾 Tennis Quant Terminal",
    sub: "KI-gestütztes Match-Analyse & Wett-System",
    playersLoaded: "Spieler geladen",
    loadingDB: "Lade Daten...",
    config: "⚙️ Match-Konfiguration",
    p1ph: "Spieler 1 (genauer Name)",
    p2ph: "Spieler 2 (genauer Name)",
    hard: "Hartplatz",
    clay: "Sand",
    grass: "Rasen",
    analyze: "🔍 Analysieren",
    calc: "⏳ Berechne...",
    error: "Fehler",
    errorTip: "Tipp: Spielernamen müssen exakt mit der Datenbank übereinstimmen",
    analysis: "Analyse:",
    winProb: "Siegchance",
    fairOdds: "Faire Quote",
    fav: "Favorit",
    prob: "Wahrscheinlichkeit",
    dec: "Dezimalquote",
    h2hTitle: "⚔️ H2H & Aktuelle Form",
    last5: "Letzte 5 Matches",
    h2hMatches: "Direkte Duelle",
    wins: "Siege",
    noH2h: "Bisher keine direkten Duelle",
    mcTitle: "🎲 Monte Carlo Simulation",
    sims: "simulierte Matches",
    logReg: "Log. Regression",
    mc: "Monte Carlo",
    ens: "Ensemble ⭐",
    odds: "Quote",
    ci: "95% Konfidenzintervall",
    avgSets: "Ø Sätze pro Match",
    straight: "Sieg in 2 Sätzen",
    surfTitle: "Belag-spezifische Analyse",
    total: "Gesamt",
    matches: "Matches",
    lowData: "wenig Daten",
    surfWarn: "Bei <20 Belag-Matches: Rating wird mit Gesamt-Rating gemischt",
    matchProb: "📊 Match-Wahrscheinlichkeit",
    confModel: "Modell-Konfidenz",
    low: "Niedrig",
    med: "Mittel",
    high: "Hoch",
    oddsAnalysis: "💰 Quoten-Analyse",
    player: "Spieler",
    implProb: "Impl. Prob.",
    amerik: "Amerik.",
    overround: "OVERROUND (Buchmacher-Marge)",
    margin5: "Bei 5% Marge:",
    setsTitle: "📋 Satz-Märkte",
    result: "Ergebnis",
    valTitle: "🎯 Value-Bet Rechner",
    bookieOdds: "Quote eintragen (z.B. 1.85)",
    bankroll: "Bankroll",
    edge: "Edge",
    kelly: "Kelly-Anteil",
    recStake: "Empfohlener Einsatz",
    expProfit: "Erwarteter Gewinn",
    valStrong: "🔥 STARKER VALUE BET",
    valFound: "✅ VALUE BET GEFUNDEN",
    valNone: "❌ KEIN VALUE",
    recBet: "Empfehlung: Setze auf",
    ofBankroll: "des Bankrolls",
    noAdv: "Quoten zu niedrig — kein Vorteil gegenüber dem Buchmacher",
    compTitle: "⚖️ Spieler-Vergleich",
    glicko: "Glicko Rating",
    form: "Form-Index",
    histTitle: "🕒 Analyse-Verlauf",
    time: "Zeit",
    match: "Match",
    surf: "Belag",
    chance: "Chance",
    empty1: "Zwei Spieler eingeben und analysieren",
    empty2: "Spieler in der Datenbank verfügbar",
    emptyLoading: "Datenbank wird geladen..."
  },
  en: {
    title: "🎾 Tennis Quant Terminal",
    sub: "AI-powered Match Analysis & Betting System",
    playersLoaded: "players loaded",
    loadingDB: "Loading database...",
    config: "⚙️ Match Configuration",
    p1ph: "Player 1 (exact name)",
    p2ph: "Player 2 (exact name)",
    hard: "Hard Court",
    clay: "Clay",
    grass: "Grass",
    analyze: "🔍 Analyze",
    calc: "⏳ Calculating...",
    error: "Error",
    errorTip: "Tip: Player names must exactly match the database",
    analysis: "Analysis:",
    winProb: "Win Chance",
    fairOdds: "Fair Odds",
    fav: "Favorite",
    prob: "Probability",
    dec: "Decimal Odds",
    h2hTitle: "⚔️ H2H & Current Form",
    last5: "Last 5 Matches",
    h2hMatches: "Head-to-Head",
    wins: "Wins",
    noH2h: "No previous meetings",
    mcTitle: "🎲 Monte Carlo Simulation",
    sims: "simulated matches",
    logReg: "Log. Regression",
    mc: "Monte Carlo",
    ens: "Ensemble ⭐",
    odds: "Odds",
    ci: "95% Confidence Interval",
    avgSets: "Avg. Sets per Match",
    straight: "Straight Sets Win",
    surfTitle: "Surface-specific Analysis",
    total: "Overall",
    matches: "Matches",
    lowData: "low data",
    surfWarn: "With <20 surface matches: Rating is blended with overall rating",
    matchProb: "📊 Match Probability",
    confModel: "Model Confidence",
    low: "Low",
    med: "Medium",
    high: "High",
    oddsAnalysis: "💰 Odds Analysis",
    player: "Player",
    implProb: "Impl. Prob.",
    amerik: "American",
    overround: "OVERROUND (Bookmaker Margin)",
    margin5: "At 5% Margin:",
    setsTitle: "📋 Set Markets",
    result: "Result",
    valTitle: "🎯 Value Bet Calculator",
    bookieOdds: "Enter Odds (e.g. 1.85)",
    bankroll: "Bankroll",
    edge: "Edge",
    kelly: "Kelly Fraction",
    recStake: "Recommended Stake",
    expProfit: "Expected Profit",
    valStrong: "🔥 STRONG VALUE BET",
    valFound: "✅ VALUE BET FOUND",
    valNone: "❌ NO VALUE",
    recBet: "Recommendation: Bet on",
    ofBankroll: "of Bankroll",
    noAdv: "Odds too low — no advantage over the bookmaker",
    compTitle: "⚖️ Player Comparison",
    glicko: "Glicko Rating",
    form: "Form Index",
    histTitle: "🕒 Analysis History",
    time: "Time",
    match: "Match",
    surf: "Surface",
    chance: "Chance",
    empty1: "Enter two players and analyze",
    empty2: "players available in the database",
    emptyLoading: "Loading database..."
  },
  ro: {
    title: "🎾 Terminal Quant Tenis",
    sub: "Sistem de Analiză și Pariuri cu Inteligență Artificială",
    playersLoaded: "jucători încărcați",
    loadingDB: "Se încarcă baza de date...",
    config: "⚙️ Configurare Meci",
    p1ph: "Jucător 1 (nume exact)",
    p2ph: "Jucător 2 (nume exact)",
    hard: "Ciment",
    clay: "Zgură",
    grass: "Iarbă",
    analyze: "🔍 Analizează",
    calc: "⏳ Se calculează...",
    error: "Eroare",
    errorTip: "Sfat: Numele jucătorilor trebuie să corespundă exact cu baza de date",
    analysis: "Analiză:",
    winProb: "Șansă Câștig",
    fairOdds: "Cotă Corectă",
    fav: "Favorit",
    prob: "Probabilitate",
    dec: "Cotă Zecimală",
    h2hTitle: "⚔️ H2H & Forma Curentă",
    last5: "Ultimele 5 Meciuri",
    h2hMatches: "Meciuri Directe",
    wins: "Victorii",
    noH2h: "Niciun meci direct anterior",
    mcTitle: "🎲 Simulare Monte Carlo",
    sims: "meciuri simulate",
    logReg: "Regresie Log.",
    mc: "Monte Carlo",
    ens: "Ansamblu ⭐",
    odds: "Cotă",
    ci: "95% Interval de Încredere",
    avgSets: "Medie Seturi / Meci",
    straight: "Victorie în 2 Seturi",
    surfTitle: "Analiză Specifică pe Suprafață",
    total: "Total",
    matches: "Meciuri",
    lowData: "date puține",
    surfWarn: "La <20 meciuri pe suprafață: Ratingul se combină cu ratingul general",
    matchProb: "📊 Probabilitate Meci",
    confModel: "Încredere Model",
    low: "Scăzută",
    med: "Medie",
    high: "Ridicată",
    oddsAnalysis: "💰 Analiză Cote",
    player: "Jucător",
    implProb: "Prob. Implic.",
    amerik: "American",
    overround: "MARJĂ (Overround Casă Pariuri)",
    margin5: "La marjă de 5%:",
    setsTitle: "📋 Piețe Seturi",
    result: "Rezultat",
    valTitle: "🎯 Calculator Pariu Valoros",
    bookieOdds: "Cote (ex: 1.85)",
    bankroll: "Fond (Bankroll)",
    edge: "Avantaj (Edge)",
    kelly: "Fracție Kelly",
    recStake: "Miză Recomandată",
    expProfit: "Profit Așteptat",
    valStrong: "🔥 PARIU VALOROS PUTERNIC",
    valFound: "✅ PARIU VALOROS GĂSIT",
    valNone: "❌ FĂRĂ VALOARE",
    recBet: "Recomandare: Pariază pe",
    ofBankroll: "din fond",
    noAdv: "Cota prea mică — niciun avantaj față de casa de pariuri",
    compTitle: "⚖️ Comparație Jucători",
    glicko: "Rating Glicko",
    form: "Index Formă",
    histTitle: "🕒 Istoric Analize",
    time: "Timp",
    match: "Meci",
    surf: "Suprafață",
    chance: "Șansă",
    empty1: "Introdu doi jucători și analizează",
    empty2: "jucători disponibili în baza de date",
    emptyLoading: "Se încarcă baza de date..."
  }
};

const useTranslation = () => {
  const lang = useContext(LanguageContext);
  return (key) => translations[lang][key] || key;
};

// ─── AUTOCOMPLETE KOMPONENTE ─────────────────────────────────────────────────
function PlayerInput({ value, onChange, placeholder, players }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query.length < 2 ? [] : players
    .filter(p => p.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  function select(name) {
    setQuery(name);
    onChange(name);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: "180px" }}>
      <input
        style={styles.input}
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div style={styles.dropdown}>
          {filtered.map(name => (
            <div
              key={name}
              style={styles.dropdownItem}
              onMouseDown={() => select(name)}
              onMouseEnter={e => e.target.style.background = "#f1f5f9"}
              onMouseLeave={e => e.target.style.background = "transparent"}
            >
              🎾 {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BALKEN DIAGRAMM ──────────────────────────────────────────────────────────
function VergleichsBalken({ label, wert1, wert2, farbe1 = "#3b82f6", farbe2 = "#f59e0b", einheit = "" }) {
  const gesamt = wert1 + wert2 || 1;
  const pct1 = (wert1 / gesamt) * 100;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "3px" }}>
        <span style={{ color: farbe1, fontWeight: 600 }}>{typeof wert1 === "number" ? wert1.toFixed(1) : wert1}{einheit}</span>
        <span>{label}</span>
        <span style={{ color: farbe2, fontWeight: 600 }}>{typeof wert2 === "number" ? wert2.toFixed(1) : wert2}{einheit}</span>
      </div>
      <div style={{ height: "8px", borderRadius: "4px", background: "#e2e8f0", overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${pct1}%`, background: farbe1, borderRadius: "4px 0 0 4px", transition: "width 0.6s ease" }} />
        <div style={{ flex: 1, background: farbe2, borderRadius: "0 4px 4px 0" }} />
      </div>
    </div>
  );
}

// ─── KONFIDENZ ANZEIGE ────────────────────────────────────────────────────────
function KonfidenzMeter({ wert }) {
  const t = useTranslation();
  const pct = Math.abs(wert - 50) * 2;
  const farbe = pct < 20 ? "#f59e0b" : pct < 50 ? "#3b82f6" : "#22c55e";
  const label = pct < 20 ? t("low") : pct < 50 ? t("med") : t("high");
  
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
        <span style={{ color: "#64748b" }}>{t("confModel")}</span>
        <span style={{ color: farbe, fontWeight: 600 }}>{label} ({pct.toFixed(0)}%)</span>
      </div>
      <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: farbe, borderRadius: "3px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ─── WETT EMPFEHLUNG (Vergleicht beide Spieler) ───────────────────────────────
function WettEmpfehlung({ edgeP1, edgeP2, p1Name, p2Name }) {
  const t = useTranslation();
  
  if (!edgeP1 && !edgeP2) return null;

  const valid1 = edgeP1 && edgeP1.edge > 0;
  const valid2 = edgeP2 && edgeP2.edge > 0;

  let bestEdge = null;
  let bestSpieler = "";

  if (valid1 && valid2) {
    if (edgeP1.edge > edgeP2.edge) { bestEdge = edgeP1; bestSpieler = p1Name; } 
    else { bestEdge = edgeP2; bestSpieler = p2Name; }
  } else if (valid1) {
    bestEdge = edgeP1; bestSpieler = p1Name;
  } else if (valid2) {
    bestEdge = edgeP2; bestSpieler = p2Name;
  }

  const positiv = bestEdge !== null;
  const stark = positiv && bestEdge.edge > 0.05;

  return (
    <div style={{
      background: positiv ? (stark ? "#f0fdf4" : "#f8fafc") : "#fef2f2",
      border: `1px solid ${positiv ? (stark ? "#22c55e" : "#86efac") : "#fca5a5"}`,
      borderRadius: "8px",
      padding: "14px",
      marginTop: "16px",
    }}>
      <div style={{ fontSize: "13px", fontWeight: 700, color: positiv ? "#16a34a" : "#dc2626", marginBottom: "6px" }}>
        {positiv ? (stark ? t("valStrong") : t("valFound")) : t("valNone")}
      </div>
      {positiv && (
        <div style={{ fontSize: "12px", color: "#15803d" }}>
          {t("recBet")} <strong style={{fontSize: "13px"}}>{bestSpieler}</strong><br />
          {t("edge")}: <strong>+{(bestEdge.edge * 100).toFixed(2)}%</strong> &nbsp;|&nbsp;
          Kelly: <strong>{(Math.max(0, bestEdge.kelly) * 100).toFixed(1)}% {t("ofBankroll")}</strong>
        </div>
      )}
      {!positiv && (
        <div style={{ fontSize: "12px", color: "#991b1b" }}>
          {t("noAdv")}
        </div>
      )}
    </div>
  );
}

// ─── BELAG BADGE ─────────────────────────────────────────────────────────────
function BelagBadge({ belag }) {
  const t = useTranslation();
  const config = {
    Hard:  { farbe: "#3b82f6", emoji: "🏟️", label: t("hard") },
    Clay:  { farbe: "#f59e0b", emoji: "🧱", label: t("clay")      },
    Grass: { farbe: "#22c55e", emoji: "🌿", label: t("grass")     },
  };
  const c = config[belag] || config.Hard;
  return (
    <span style={{
      background: c.farbe + "15",
      border: `1px solid ${c.farbe}`,
      color: c.farbe,
      borderRadius: "20px",
      padding: "3px 12px",
      fontSize: "13px",
      fontWeight: 600,
    }}>
      {c.emoji} {c.label}
    </span>
  );
}

// ─── STAT KARTE ───────────────────────────────────────────────────────────────
function StatKarte({ label, wert, einheit = "", farbe = "#0f172a", sub }) {
  return (
    <div style={styles.statKarte}>
      <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "1.6em", fontWeight: 700, color: farbe }}>{wert}{einheit}</div>
      {sub && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

// ─── H2H UND FORM PANEL ───────────────────────────────────────────────────────
function H2hAndFormPanel({ result }) {
  const t = useTranslation();

  const form1 = result.recent_form_p1 || ["W", "W", "L", "W", "W"];
  const form2 = result.recent_form_p2 || ["L", "W", "L", "L", "W"];
  const h2hTotal = result.h2h_matches !== undefined ? result.h2h_matches : 5;
  const h2hW1 = result.h2h_wins_p1 !== undefined ? result.h2h_wins_p1 : 3;
  const h2hW2 = result.h2h_wins_p2 !== undefined ? result.h2h_wins_p2 : 2;

  const renderForm = (formArray) => (
    <div style={{ display: "flex", gap: "6px" }}>
      {formArray.map((res, i) => (
        <span key={i} style={{
          display: "inline-block",
          width: "22px", height: "22px",
          borderRadius: "4px",
          background: res === "W" || res === true ? "#dcfce7" : "#fee2e2",
          color: res === "W" || res === true ? "#16a34a" : "#dc2626",
          fontSize: "11px", fontWeight: "800",
          textAlign: "center", lineHeight: "22px",
          border: `1px solid ${res === "W" || res === true ? "#bbf7d0" : "#fecaca"}`
        }}>
          {res === "W" || res === true ? "W" : "L"}
        </span>
      ))}
    </div>
  );

  return (
    <div style={{ ...styles.karte, marginBottom: "16px" }}>
      <h3 style={styles.kartenTitel}>{t("h2hTitle")}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "center" }}>
        
        <div>
          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px", fontWeight: 700 }}>
            {t("last5")}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#3b82f6" }}>{result.p1_name}</span>
            {renderForm(form1)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#f59e0b" }}>{result.p2_name}</span>
            {renderForm(form2)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px", fontWeight: 700 }}>
            {t("h2hMatches")} ({h2hTotal})
          </div>
          {h2hTotal > 0 ? (
            <VergleichsBalken label={t("wins")} wert1={h2hW1} wert2={h2hW2} farbe1="#3b82f6" farbe2="#f59e0b" />
          ) : (
            <div style={{ fontSize: "13px", color: "#94a3b8", fontStyle: "italic", background: "#f8fafc", padding: "10px", borderRadius: "6px", border: "1px dashed #cbd5e1", textAlign: "center" }}>
              {t("noH2h")}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── MONTE CARLO KOMPONENTE ───────────────────────────────────────────────────
function MonteCarloPanel({ result }) {
  const t = useTranslation();
  const ciBreite = ((result.mc_ci_high - result.mc_ci_low) * 100).toFixed(1);
  const konfidenz = ciBreite < 8 ? t("high") : ciBreite < 15 ? t("med") : t("low");
  const konfidenzFarbe = ciBreite < 8 ? "#16a34a" : ciBreite < 15 ? "#d97706" : "#dc2626";

  return (
    <div style={styles.karte}>
      <h3 style={styles.kartenTitel}>{t("mcTitle")}</h3>

      <div style={{
        background: "#f8fafc", borderRadius: "8px", padding: "12px", border: "1px solid #e2e8f0",
        marginBottom: "14px", fontSize: "12px", color: "#475569"
      }}>
        {result.mc_simulations.toLocaleString("de-DE")} {t("sims")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
        {[
          { label: t("logReg"), prob: result.prob_p1, farbe: "#6366f1" },
          { label: t("mc"),     prob: result.mc_prob_p1, farbe: "#3b82f6" },
          { label: t("ens"),    prob: result.ensemble_prob_p1, farbe: "#8b5cf6" },
        ].map(({ label, prob, farbe }) => (
          <div key={label} style={{
            background: "#f8fafc", borderRadius: "8px", padding: "12px", textAlign: "center", border: "1px solid #e2e8f0"
          }}>
            <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>
              {label}
            </div>
            <div style={{ fontSize: "1.5em", fontWeight: 800, color: farbe }}>
              {(prob * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: "11px", color: "#475569" }}>
              {t("odds")}: {(1 / prob).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "14px" }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: "12px", color: "#64748b", marginBottom: "6px"
        }}>
          <span>{t("ci")}</span>
          <span style={{ color: konfidenzFarbe, fontWeight: 600 }}>
            {konfidenz} (±{(ciBreite / 2).toFixed(1)}%)
          </span>
        </div>
        <div style={{ position: "relative", height: "28px", background: "#e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
          <div style={{
            position: "absolute", left: 0, top: 0,
            width: `${result.mc_prob_p1 * 100}%`, height: "100%",
            background: "#cbd5e1",
          }} />
          <div style={{
            position: "absolute",
            left: `${result.mc_ci_low * 100}%`,
            width: `${(result.mc_ci_high - result.mc_ci_low) * 100}%`,
            height: "100%",
            background: "#3b82f6",
            opacity: 0.6,
          }} />
          <div style={{
            position: "absolute",
            left: `${result.mc_prob_p1 * 100}%`,
            top: 0, width: "2px", height: "100%",
            background: "#0f172a",
            transform: "translateX(-50%)",
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "11px", fontWeight: 700, color: "#0f172a",
          }}>
            {(result.mc_ci_low * 100).toFixed(1)}% — {(result.mc_prob_p1 * 100).toFixed(1)}% — {(result.mc_ci_high * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={styles.miniStat}>
          <div style={styles.miniStatLabel}>{t("avgSets")}</div>
          <div style={styles.miniStatWert}>{result.mc_avg_sets.toFixed(2)}</div>
        </div>
        <div style={styles.miniStat}>
          <div style={styles.miniStatLabel}>P1 {t("straight")}</div>
          <div style={styles.miniStatWert}>{(result.mc_prob_straight * 100).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}

// ─── BELAG RATING PANEL ───────────────────────────────────────────────────────
function BelagRatingPanel({ result, surface }) {
  const t = useTranslation();
  const belagEmoji = { Hard: "🏟️", Clay: "🧱", Grass: "🌿" };

  return (
    <div style={styles.karte}>
      <h3 style={styles.kartenTitel}>
        {belagEmoji[surface] || "🎾"} {t("surfTitle")} ({t(surface.toLowerCase())})
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
        {[
          {
            name: result.p1_name,
            rating: result.surface_rating_p1,
            overall: result.glicko_p1,
            matches: result.surface_matches_p1,
            farbe: "#3b82f6",
          },
          {
            name: result.p2_name,
            rating: result.surface_rating_p2,
            overall: result.glicko_p2,
            matches: result.surface_matches_p2,
            farbe: "#f59e0b",
          },
        ].map(({ name, rating, overall, matches, farbe }) => {
          const diff = rating - overall;
          const zuverlässig = matches >= 20;
          return (
            <div key={name} style={{
              background: "#f8fafc", borderRadius: "8px", padding: "12px", border: "1px solid #e2e8f0"
            }}>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                {name.split(" ").pop()}
              </div>
              <div style={{ fontSize: "1.6em", fontWeight: 800, color: farbe }}>
                {rating.toFixed(0)}
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                {t("total")}: {overall.toFixed(0)} &nbsp;
                <span style={{ color: diff >= 0 ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                  ({diff >= 0 ? "+" : ""}{diff.toFixed(0)})
                </span>
              </div>
              <div style={{ marginTop: "6px", fontSize: "11px" }}>
                <span style={{
                  color: zuverlässig ? "#15803d" : "#b45309",
                  background: zuverlässig ? "#dcfce7" : "#fef3c7",
                  padding: "2px 6px", borderRadius: "10px",
                  fontWeight: 600
                }}>
                  {matches} {t("matches")} {zuverlässig ? "✓" : `⚠ ${t("lowData")}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <VergleichsBalken
        label={`${t(surface.toLowerCase())} Rating`}
        wert1={result.surface_rating_p1}
        wert2={result.surface_rating_p2}
        farbe1="#3b82f6"
        farbe2="#f59e0b"
      />

      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "10px" }}>
        ⚠️ {t("surfWarn")}
      </div>
    </div>
  );
}

// ─── HAUPT APP LOGIK ──────────────────────────────────────────────────────────
function MainContent({ lang, setLang }) {
  const t = useTranslation();
  
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [surface, setSurface] = useState("Hard");
  const [result, setResult] = useState(null);
  
  const [buchQuoteP1, setBuchQuoteP1] = useState("");
  const [buchQuoteP2, setBuchQuoteP2] = useState("");
  const [bankroll, setBankroll] = useState("1000");
  
  const [fehler, setFehler] = useState(null);
  const [laden, setLaden] = useState(false);
  const [spieler, setSpieler] = useState([]);
  const [verlauf, setVerlauf] = useState([]);

  useEffect(() => {
    invoke("get_players")
      .then(namen => setSpieler(namen))
      .catch(e => console.error("Spieler laden fehlgeschlagen:", e));
  }, []);

  async function berechnen() {
    if (!p1.trim() || !p2.trim()) return;
    setFehler(null);
    setLaden(true);
    try {
      const res = await invoke("get_prediction", { p1, p2, surface });
      const daten = typeof res === "string" ? JSON.parse(res) : res;
      setResult(daten);
      setVerlauf(prev => [{
        p1, p2, surface,
        prob: (daten.prob_p1 * 100).toFixed(1),
        zeit: new Date().toLocaleTimeString("de-DE"),
      }, ...prev.slice(0, 4)]);
    } catch (e) {
      setFehler(String(e));
      setResult(null);
    } finally {
      setLaden(false);
    }
  }

  function berechneEdge(prob, quoteStr, brStr) {
    const q = parseFloat(quoteStr);
    const br = parseFloat(brStr) || 0;
    if (isNaN(q) || q <= 1) return null;
    const edge = prob - (1 / q);
    const kelly = ((prob * q) - 1) / (q - 1);
    const einsatz = Math.max(0, kelly) * br;
    return { edge, kelly, einsatz, expectedProfit: einsatz * edge };
  }

  const edgeP1 = result && buchQuoteP1 ? berechneEdge(result.prob_p1, buchQuoteP1, bankroll) : null;
  const edgeP2 = result && buchQuoteP2 ? berechneEdge(result.prob_p2, buchQuoteP2, bankroll) : null;

  // Hilfskomponente für die Edge-Details (wird für P1 und P2 verwendet)
  const EdgeDetails = ({ edgeDaten }) => (
    <div style={{ marginTop: "12px", borderTop: "1px dashed #cbd5e1", paddingTop: "8px" }}>
      <div style={styles.edgeReihe}>
        <span>{t("edge")}</span>
        <span style={{ color: edgeDaten.edge > 0 ? "#16a34a" : "#dc2626", fontWeight: 800 }}>
          {edgeDaten.edge > 0 ? "+" : ""}{(edgeDaten.edge * 100).toFixed(2)}%
        </span>
      </div>
      <div style={styles.edgeReihe}>
        <span>{t("kelly")}</span>
        <span style={{ color: "#3b82f6", fontWeight: 800 }}>
          {(Math.max(0, edgeDaten.kelly) * 100).toFixed(1)}%
        </span>
      </div>
      <div style={styles.edgeReihe}>
        <span>{t("recStake")}</span>
        <span style={{ color: "#8b5cf6", fontWeight: 800 }}>
          €{edgeDaten.einsatz.toFixed(2)}
        </span>
      </div>
      <div style={styles.edgeReihe}>
        <span>{t("expProfit")}</span>
        <span style={{ color: edgeDaten.edge > 0 ? "#16a34a" : "#dc2626", fontWeight: 800 }}>
          €{(edgeDaten.expectedProfit).toFixed(2)}
        </span>
      </div>
    </div>
  );

  return (
    <div style={styles.root}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.titel}>{t("title")}</h1>
          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
            {t("sub")}
          </div>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
          {/* Sprachwechsler */}
          <div style={styles.langSwitcher}>
            {["de", "en", "ro"].map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  ...styles.langBtn,
                  background: lang === l ? "#3b82f6" : "transparent",
                  color: lang === l ? "white" : "#64748b"
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={styles.statusPunkt} />
            <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>
              {spieler.length > 0 ? `${spieler.length} ${t("playersLoaded")}` : t("loadingDB")}
            </span>
          </div>
        </div>
      </div>

      {/* INPUT PANEL */}
      <div style={styles.karte}>
        <h3 style={styles.kartenTitel}>{t("config")}</h3>
        <div style={styles.inputReihe}>
          <PlayerInput value={p1} onChange={setP1} placeholder={t("p1ph")} players={spieler} />
          <div style={styles.vsLabel}>VS</div>
          <PlayerInput value={p2} onChange={setP2} placeholder={t("p2ph")} players={spieler} />
          <select style={styles.select} value={surface} onChange={e => setSurface(e.target.value)}>
            <option value="Hard">🏟️ {t("hard")}</option>
            <option value="Clay">🧱 {t("clay")}</option>
            <option value="Grass">🌿 {t("grass")}</option>
          </select>
          <button
            style={laden ? { ...styles.button, opacity: 0.6 } : styles.button}
            onClick={berechnen}
            disabled={laden}
          >
            {laden ? t("calc") : t("analyze")}
          </button>
        </div>
      </div>

      {/* FEHLER */}
      {fehler && (
        <div style={styles.fehlerBox}>
          ⚠️ <strong>{t("error")}:</strong> {fehler}
          <div style={{ fontSize: "12px", marginTop: "4px", color: "#b91c1c" }}>
            {t("errorTip")}
          </div>
        </div>
      )}

      {/* ERGEBNISSE */}
      {result && (
        <>
          {/* META ZEILE */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", marginTop: "8px" }}>
            <span style={{ color: "#64748b", fontSize: "13px", fontWeight: 600 }}>{t("analysis")}</span>
            <strong style={{ color: "#0f172a", fontSize: "15px" }}>{result.p1_name}</strong>
            <span style={{ color: "#94a3b8" }}>vs</span>
            <strong style={{ color: "#0f172a", fontSize: "15px" }}>{result.p2_name}</strong>
            <BelagBadge belag={surface} />
          </div>

          {/* SCHNELL-STATS */}
          <div style={styles.schnellStats}>
            <StatKarte
              label={`${t("winProb")} P1`}
              wert={(result.prob_p1 * 100).toFixed(1)}
              einheit="%"
              farbe="#3b82f6"
              sub={result.p1_name}
            />
            <StatKarte
              label={`${t("winProb")} P2`}
              wert={(result.prob_p2 * 100).toFixed(1)}
              einheit="%"
              farbe="#f59e0b"
              sub={result.p2_name}
            />
            <StatKarte
              label={`${t("fairOdds")} P1`}
              wert={parseFloat(result.odds_p1).toFixed(2)}
              farbe="#16a34a"
              sub={t("dec")}
            />
            <StatKarte
              label={`${t("fairOdds")} P2`}
              wert={parseFloat(result.odds_p2).toFixed(2)}
              farbe="#16a34a"
              sub={t("dec")}
            />
            <StatKarte
              label={t("fav")}
              wert={result.prob_p1 > result.prob_p2 ? result.p1_name.split(" ").pop() : result.p2_name.split(" ").pop()}
              farbe="#8b5cf6"
              sub={`${Math.max(result.prob_p1, result.prob_p2) * 100 |0}% ${t("prob")}`}
            />
          </div>

          <H2hAndFormPanel result={result} />

          {/* HAUPT GRID */}
          <div style={styles.grid}>
             <MonteCarloPanel result={result} />
             <BelagRatingPanel result={result} surface={surface} />
             
            {/* WAHRSCHEINLICHKEIT */}
            <div style={styles.karte}>
              <h3 style={styles.kartenTitel}>{t("matchProb")}</h3>
              <div style={{ marginBottom: "20px" }}>
                {[
                  { name: result.p1_name, prob: result.prob_p1, farbe: "#3b82f6" },
                  { name: result.p2_name, prob: result.prob_p2, farbe: "#f59e0b" },
                ].map(({ name, prob, farbe }) => (
                  <div key={name} style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: "#334155", fontSize: "14px", fontWeight: 600 }}>{name}</span>
                      <span style={{ color: farbe, fontWeight: 800, fontSize: "1.3em" }}>
                        {(prob * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ background: "#e2e8f0", borderRadius: "6px", height: "14px", overflow: "hidden" }}>
                      <div style={{
                        width: `${prob * 100}%`, height: "100%", background: farbe,
                        borderRadius: "6px", transition: "width 0.7s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
              <KonfidenzMeter wert={result.prob_p1 * 100} />
            </div>

            {/* QUOTEN ANALYSE */}
            <div style={styles.karte}>
              <h3 style={styles.kartenTitel}>{t("oddsAnalysis")}</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, textAlign: "left" }}>{t("player")}</th>
                    <th style={styles.th}>{t("fairOdds")}</th>
                    <th style={styles.th}>{t("implProb")}</th>
                    <th style={styles.th}>{t("amerik")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: result.p1_name, quote: result.odds_p1, prob: result.prob_p1 },
                    { name: result.p2_name, quote: result.odds_p2, prob: result.prob_p2 },
                  ].map(({ name, quote, prob }) => {
                    const q = parseFloat(quote);
                    const amerik = q >= 2 ? `+${((q - 1) * 100).toFixed(0)}` : `-${(100 / (q - 1)).toFixed(0)}`;
                    return (
                      <tr key={name}>
                        <td style={{ ...styles.td, fontWeight: 500 }}>{name}</td>
                        <td style={{ ...styles.td, textAlign: "center", color: "#16a34a", fontWeight: 800 }}>{q.toFixed(2)}</td>
                        <td style={{ ...styles.td, textAlign: "center", color: "#64748b" }}>{(prob * 100).toFixed(1)}%</td>
                        <td style={{ ...styles.td, textAlign: "center", color: "#3b82f6", fontWeight: 600 }}>{amerik}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: "12px", padding: "10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 600 }}>{t("overround")}</div>
                <div style={{ fontSize: "13px", color: "#475569" }}>
                  {t("margin5")} P1 = <span style={{ color: "#d97706", fontWeight: 700 }}>{(parseFloat(result.odds_p1) * 0.95).toFixed(2)}</span>
                  &nbsp;|&nbsp; P2 = <span style={{ color: "#d97706", fontWeight: 700 }}>{(parseFloat(result.odds_p2) * 0.95).toFixed(2)}</span>
                </div>
              </div>
            </div>

           {/* SATZ MÄRKTE (Klarer visualisiert) */}
            <div style={styles.karte}>
              <h3 style={styles.kartenTitel}>{t("setsTitle")}</h3>
              
              {/* Spalten-Überschriften */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", padding: "0 14px", fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <span style={{ width: "50px" }}>{t("result")}</span>
                <span style={{ flex: 1 }}>{t("prob")}</span>
                <span style={{ width: "60px", textAlign: "right" }}>Chance</span>
                <span style={{ width: "50px", textAlign: "right" }}>{t("fairOdds")}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {result.set_results?.map((s, i) => {
                  const score = s[0]; // z.B. "2-0", "2-1"
                  const prob = s[1];
                  const odds = (1 / prob).toFixed(2);
                  
                  // Wenn die erste Zahl höher ist, gewinnt P1 -> Blau. Sonst P2 -> Orange.
                  const isP1Win = parseInt(score.charAt(0)) > parseInt(score.charAt(score.length - 1));
                  const farbe = isP1Win ? "#3b82f6" : "#f59e0b"; 

                  return (
                    <div key={i} style={{ 
                      display: "flex", alignItems: "center", gap: "12px", 
                      background: "#f8fafc", padding: "12px 14px", 
                      borderRadius: "8px", border: "1px solid #e2e8f0",
                      position: "relative", overflow: "hidden"
                    }}>
                      {/* Ganz leichter Hintergrund-Fill zur besseren Erkennung */}
                      <div style={{
                        position: "absolute", left: 0, top: 0, bottom: 0,
                        width: `${prob * 100}%`,
                        background: farbe,
                        opacity: 0.08,
                        zIndex: 0
                      }} />
                      
                      {/* Score-Label */}
                      <div style={{ zIndex: 1, width: "50px", fontWeight: 800, color: "#0f172a", fontSize: "15px" }}>
                        {score}
                      </div>
                      
                      {/* Fortschrittsbalken */}
                      <div style={{ zIndex: 1, flex: 1 }}>
                        <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${prob * 100}%`, height: "100%", background: farbe, borderRadius: "3px" }} />
                        </div>
                      </div>
                      
                      {/* Prozentzahl */}
                      <div style={{ zIndex: 1, width: "60px", textAlign: "right", fontWeight: 700, color: "#64748b", fontSize: "13px" }}>
                        {(prob * 100).toFixed(1)}%
                      </div>
                      
                      {/* Dezimalquote */}
                      <div style={{ zIndex: 1, width: "50px", textAlign: "right", fontWeight: 800, color: "#16a34a", fontSize: "14px" }}>
                        {odds}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NEU: SPLIT VALUE BET RECHNER */}
            <div style={styles.karte}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{...styles.kartenTitel, margin: 0}}>{t("valTitle")}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>{t("bankroll")}:</span>
                  <input
                    style={{ ...styles.input, width: "100px", padding: "6px 10px" }}
                    placeholder="€"
                    value={bankroll}
                    onChange={e => setBankroll(e.target.value)}
                  />
                </div>
              </div>

              {/* Grid für P1 und P2 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                
                {/* Spalte P1 */}
                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#3b82f6", marginBottom: "6px" }}>{result.p1_name}</div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                    {t("fairOdds")}: <strong style={{ color: "#16a34a", fontSize: "14px" }}>{parseFloat(result.odds_p1).toFixed(2)}</strong>
                  </div>
                  <input
                    style={{ ...styles.input, width: "100%" }}
                    placeholder={t("bookieOdds")}
                    value={buchQuoteP1}
                    onChange={e => setBuchQuoteP1(e.target.value)}
                  />
                  {edgeP1 && <EdgeDetails edgeDaten={edgeP1} />}
                </div>

                {/* Spalte P2 */}
                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#f59e0b", marginBottom: "6px" }}>{result.p2_name}</div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                    {t("fairOdds")}: <strong style={{ color: "#16a34a", fontSize: "14px" }}>{parseFloat(result.odds_p2).toFixed(2)}</strong>
                  </div>
                  <input
                    style={{ ...styles.input, width: "100%" }}
                    placeholder={t("bookieOdds")}
                    value={buchQuoteP2}
                    onChange={e => setBuchQuoteP2(e.target.value)}
                  />
                  {edgeP2 && <EdgeDetails edgeDaten={edgeP2} />}
                </div>
              </div>

              {/* Automatische Empfehlung */}
              <WettEmpfehlung 
                edgeP1={edgeP1} 
                edgeP2={edgeP2} 
                p1Name={result.p1_name} 
                p2Name={result.p2_name} 
              />
            </div>
          </div>

          {/* SPIELER VERGLEICH */}
          <div style={{ ...styles.karte, marginTop: "16px" }}>
            <h3 style={styles.kartenTitel}>{t("compTitle")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ textAlign: "center", color: "#3b82f6", fontWeight: 800, fontSize: "16px" }}>{result.p1_name}</div>
              <div style={{ textAlign: "center", color: "#f59e0b", fontWeight: 800, fontSize: "16px" }}>{result.p2_name}</div>
            </div>
            <VergleichsBalken label={t("winProb")} wert1={result.prob_p1 * 100} wert2={result.prob_p2 * 100} einheit="%" />
            <VergleichsBalken label={t("fairOdds")} wert1={1 / parseFloat(result.odds_p1)} wert2={1 / parseFloat(result.odds_p2)} />
            {result.glicko_p1 && (
              <VergleichsBalken label={t("glicko")} wert1={result.glicko_p1} wert2={result.glicko_p2} />
            )}
            {result.form_p1 && (
              <VergleichsBalken label={t("form")} wert1={result.form_p1 * 100} wert2={result.form_p2 * 100} einheit="%" />
            )}
          </div>

          {/* ANALYSE VERLAUF */}
          {verlauf.length > 1 && (
            <div style={{ ...styles.karte, marginTop: "16px" }}>
              <h3 style={styles.kartenTitel}>{t("histTitle")}</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, textAlign: "left" }}>{t("time")}</th>
                    <th style={{ ...styles.th, textAlign: "left" }}>{t("match")}</th>
                    <th style={styles.th}>{t("surf")}</th>
                    <th style={styles.th}>P1 {t("chance")}</th>
                  </tr>
                </thead>
                <tbody>
                  {verlauf.map((v, i) => (
                    <tr key={i} style={{ background: i === 0 ? "#f8fafc" : "transparent" }}>
                      <td style={{ ...styles.td, color: "#64748b", fontSize: "12px" }}>{v.zeit}</td>
                      <td style={{ ...styles.td, fontSize: "13px", fontWeight: 500 }}>{v.p1} vs {v.p2}</td>
                      <td style={{ ...styles.td, textAlign: "center", fontSize: "12px", color: "#64748b" }}>{t(v.surface.toLowerCase())}</td>
                      <td style={{ ...styles.td, textAlign: "center", color: "#3b82f6", fontWeight: 700 }}>{v.prob}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* LEER-ZUSTAND */}
      {!result && !fehler && (
        <div style={styles.leerZustand}>
          <div style={{ fontSize: "56px", marginBottom: "16px", opacity: 0.9 }}>🎾</div>
          <div style={{ color: "#334155", fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
            {t("empty1")}
          </div>
          <div style={{ color: "#64748b", fontSize: "14px" }}>
            {spieler.length > 0
              ? `${spieler.length} ${t("empty2")}`
              : t("emptyLoading")}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── ECHTER APP WRAPPER (ZUM EXPORTIEREN) ─────────────────────────────────────
function App() {
  const [lang, setLang] = useState("de");
  return (
    <LanguageContext.Provider value={lang}>
      <MainContent lang={lang} setLang={setLang} />
    </LanguageContext.Provider>
  );
}

// ─── STYLES (Angepasst für Light Theme) ───────────────────────────────────────
const styles = {
  root: {
    background: "#f1f5f9",
    color: "#0f172a",
    minHeight: "100vh",
    padding: "24px 32px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
  },
  titel: {
    margin: 0,
    fontSize: "1.8em",
    fontWeight: 800,
    letterSpacing: "-0.5px",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  langSwitcher: {
    display: "flex",
    gap: "4px",
    background: "#ffffff",
    padding: "4px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
  },
  langBtn: {
    border: "none",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s"
  },
  statusPunkt: {
    width: "8px", height: "8px", borderRadius: "50%",
    background: "#22c55e", boxShadow: "0 0 6px rgba(34, 197, 94, 0.4)",
  },
  karte: {
    background: "#ffffff",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
    marginBottom: "0",
  },
  kartenTitel: {
    margin: "0 0 16px 0",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "1.2px",
    color: "#64748b",
    fontWeight: 800,
  },
  inputReihe: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  vsLabel: {
    color: "#94a3b8",
    fontWeight: 800,
    fontSize: "12px",
    flexShrink: 0,
  },
  input: {
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    color: "#0f172a",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  select: {
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    color: "#0f172a",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer",
    flexShrink: 0,
  },
  button: {
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    border: "none",
    borderRadius: "8px",
    color: "white",
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)",
  },
  fehlerBox: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    padding: "12px 16px",
    marginBottom: "16px",
    color: "#991b1b",
    fontSize: "14px",
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    zIndex: 100,
    maxHeight: "240px",
    overflowY: "auto",
    marginTop: "4px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
  },
  dropdownItem: {
    padding: "9px 14px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#334155",
    transition: "background 0.1s",
    borderRadius: "6px",
    fontWeight: 500,
  },
  schnellStats: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "12px",
    marginBottom: "16px",
  },
  statKarte: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  th: {
    padding: "8px 4px",
    fontSize: "11px",
    textTransform: "uppercase",
    color: "#64748b",
    letterSpacing: "0.8px",
    fontWeight: 700,
    textAlign: "center",
    borderBottom: "2px solid #e2e8f0",
  },
  td: {
    padding: "10px 4px",
    borderBottom: "1px solid #f1f5f9",
    color: "#334155",
    fontSize: "13px",
  },
  edgeReihe: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 500,
  },
  leerZustand: {
    textAlign: "center",
    padding: "80px 20px",
    background: "#ffffff",
    borderRadius: "12px",
    border: "1px dashed #cbd5e1",
    marginTop: "20px"
  },
  miniStat: {
    background: "#f8fafc",
    borderRadius: "8px",
    padding: "10px 12px",
    border: "1px solid #e2e8f0"
  },
  miniStatLabel: {
    fontSize: "10px",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: "4px",
    fontWeight: 600
  },
  miniStatWert: {
    fontSize: "1.2em",
    fontWeight: 800,
    color: "#0f172a",
  },
};

export default App;