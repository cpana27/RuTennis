import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

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
              onMouseEnter={e => e.target.style.background = "#334155"}
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
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", marginBottom: "3px" }}>
        <span style={{ color: farbe1, fontWeight: 600 }}>{typeof wert1 === "number" ? wert1.toFixed(1) : wert1}{einheit}</span>
        <span style={{ color: "#64748b" }}>{label}</span>
        <span style={{ color: farbe2, fontWeight: 600 }}>{typeof wert2 === "number" ? wert2.toFixed(1) : wert2}{einheit}</span>
      </div>
      <div style={{ height: "8px", borderRadius: "4px", background: "#0f172a", overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${pct1}%`, background: farbe1, borderRadius: "4px 0 0 4px", transition: "width 0.6s ease" }} />
        <div style={{ flex: 1, background: farbe2, borderRadius: "0 4px 4px 0" }} />
      </div>
    </div>
  );
}

// ─── KONFIDENZ ANZEIGE ────────────────────────────────────────────────────────
function KonfidenzMeter({ wert }) {
  const pct = Math.abs(wert - 50) * 2;
  const farbe = pct < 20 ? "#f59e0b" : pct < 50 ? "#3b82f6" : "#4ade80";
  const label = pct < 20 ? "Niedrig" : pct < 50 ? "Mittel" : "Hoch";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
        <span style={{ color: "#64748b" }}>Modell-Konfidenz</span>
        <span style={{ color: farbe, fontWeight: 600 }}>{label} ({pct.toFixed(0)}%)</span>
      </div>
      <div style={{ height: "6px", background: "#0f172a", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: farbe, borderRadius: "3px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ─── WETT EMPFEHLUNG ──────────────────────────────────────────────────────────
function WettEmpfehlung({ edge, kelly, spieler }) {
  if (edge === null) return null;
  const positiv = edge > 0;
  const stark = edge > 0.05;
  return (
    <div style={{
      background: positiv ? (stark ? "#052e16" : "#0f2a1a") : "#450a0a",
      border: `1px solid ${positiv ? (stark ? "#16a34a" : "#15803d") : "#dc2626"}`,
      borderRadius: "8px",
      padding: "14px",
      marginTop: "10px",
    }}>
      <div style={{ fontSize: "13px", fontWeight: 700, color: positiv ? "#4ade80" : "#f87171", marginBottom: "6px" }}>
        {positiv ? (stark ? "🔥 STARKER VALUE BET" : "✅ VALUE BET GEFUNDEN") : "❌ KEIN VALUE"}
      </div>
      {positiv && (
        <div style={{ fontSize: "12px", color: "#86efac" }}>
          Empfehlung: <strong>{spieler}</strong> setzen<br />
          Edge: <strong>+{(edge * 100).toFixed(2)}%</strong> &nbsp;|&nbsp;
          Kelly: <strong>{(Math.max(0, kelly) * 100).toFixed(1)}% des Bankrolls</strong>
        </div>
      )}
      {!positiv && (
        <div style={{ fontSize: "12px", color: "#fca5a5" }}>
          Quote zu niedrig — kein Vorteil gegenüber dem Buchmacher
        </div>
      )}
    </div>
  );
}

// ─── BELAG BADGE ─────────────────────────────────────────────────────────────
function BelagBadge({ belag }) {
  const config = {
    Hard:  { farbe: "#3b82f6", emoji: "🏟️", label: "Hartplatz" },
    Clay:  { farbe: "#f59e0b", emoji: "🧱", label: "Sand"      },
    Grass: { farbe: "#22c55e", emoji: "🌿", label: "Rasen"     },
  };
  const c = config[belag] || config.Hard;
  return (
    <span style={{
      background: c.farbe + "22",
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
function StatKarte({ label, wert, einheit = "", farbe = "white", sub }) {
  return (
    <div style={styles.statKarte}>
      <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "1.6em", fontWeight: 700, color: farbe }}>{wert}{einheit}</div>
      {sub && <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

// ─── HAUPT APP ────────────────────────────────────────────────────────────────
function App() {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [surface, setSurface] = useState("Hard");
  const [result, setResult] = useState(null);
  const [buchQuote, setBuchQuote] = useState("");
  const [fehler, setFehler] = useState(null);
  const [laden, setLaden] = useState(false);
  const [spieler, setSpieler] = useState([]);
  const [bankroll, setBankroll] = useState("1000");
  const [verlauf, setVerlauf] = useState([]);

  // Spielerliste laden
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

  function edgeDaten() {
    if (!result || !buchQuote) return null;
    const p = result.prob_p1;
    const quote = parseFloat(buchQuote);
    if (isNaN(quote) || quote <= 1) return null;
    const edge = p - 1 / quote;
    const kelly = (p * quote - 1) / (quote - 1);
    const einsatz = Math.max(0, kelly) * parseFloat(bankroll || 0);
    return { edge, kelly, einsatz };
  }

  const edge = edgeDaten();
  const konfidenz = result ? Math.abs(result.prob_p1 * 100 - 50) * 2 : 0;

  return (
    <div style={styles.root}>

      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.titel}>🎾 Tennis Quant Terminal</h1>
          <div style={{ fontSize: "12px", color: "#475569" }}>
            KI-gestütztes Match-Analyse & Wett-System
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={styles.statusPunkt} />
          <span style={{ fontSize: "12px", color: "#4ade80" }}>
            {spieler.length > 0 ? `${spieler.length} Spieler geladen` : "Lade Daten..."}
          </span>
        </div>
      </div>

      {/* INPUT PANEL */}
      <div style={styles.karte}>
        <h3 style={styles.kartenTitel}>⚙️ Match-Konfiguration</h3>
        <div style={styles.inputReihe}>
          <PlayerInput value={p1} onChange={setP1} placeholder="Spieler 1 (genauer Name)" players={spieler} />
          <div style={styles.vsLabel}>VS</div>
          <PlayerInput value={p2} onChange={setP2} placeholder="Spieler 2 (genauer Name)" players={spieler} />
          <select style={styles.select} value={surface} onChange={e => setSurface(e.target.value)}>
            <option value="Hard">🏟️ Hartplatz</option>
            <option value="Clay">🧱 Sand</option>
            <option value="Grass">🌿 Rasen</option>
          </select>
          <button
            style={laden ? { ...styles.button, opacity: 0.6 } : styles.button}
            onClick={berechnen}
            disabled={laden}
          >
            {laden ? "⏳ Berechne..." : "🔍 Analysieren"}
          </button>
        </div>
      </div>

      {/* FEHLER */}
      {fehler && (
        <div style={styles.fehlerBox}>
          ⚠️ <strong>Fehler:</strong> {fehler}
          <div style={{ fontSize: "12px", marginTop: "4px", color: "#fca5a5" }}>
            Tipp: Spielernamen müssen exakt mit der Datenbank übereinstimmen
          </div>
        </div>
      )}

      {/* ERGEBNISSE */}
      {result && (
        <>
          {/* META ZEILE */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <span style={{ color: "#64748b", fontSize: "13px" }}>Analyse:</span>
            <strong style={{ color: "#e2e8f0" }}>{result.p1_name}</strong>
            <span style={{ color: "#475569" }}>vs</span>
            <strong style={{ color: "#e2e8f0" }}>{result.p2_name}</strong>
            <BelagBadge belag={surface} />
          </div>

          {/* SCHNELL-STATS */}
          <div style={styles.schnellStats}>
            <StatKarte
              label="Siegchance P1"
              wert={(result.prob_p1 * 100).toFixed(1)}
              einheit="%"
              farbe="#3b82f6"
              sub={result.p1_name}
            />
            <StatKarte
              label="Siegchance P2"
              wert={(result.prob_p2 * 100).toFixed(1)}
              einheit="%"
              farbe="#f59e0b"
              sub={result.p2_name}
            />
            <StatKarte
              label="Faire Quote P1"
              wert={parseFloat(result.odds_p1).toFixed(2)}
              farbe="#a3e635"
              sub="Dezimalquote"
            />
            <StatKarte
              label="Faire Quote P2"
              wert={parseFloat(result.odds_p2).toFixed(2)}
              farbe="#a3e635"
              sub="Dezimalquote"
            />
            <StatKarte
              label="Favorit"
              wert={result.prob_p1 > result.prob_p2 ? result.p1_name.split(" ").pop() : result.p2_name.split(" ").pop()}
              farbe="#c084fc"
              sub={`${Math.max(result.prob_p1, result.prob_p2) * 100 |0}% Wahrscheinlichkeit`}
            />
          </div>

          {/* HAUPT GRID */}
          <div style={styles.grid}>
             <MonteCarloPanel result={result} />
  <BelagRatingPanel result={result} surface={surface} />
            {/* WAHRSCHEINLICHKEIT */}
            <div style={styles.karte}>
              <h3 style={styles.kartenTitel}>📊 Match-Wahrscheinlichkeit</h3>
              <div style={{ marginBottom: "20px" }}>
                {[
                  { name: result.p1_name, prob: result.prob_p1, farbe: "#3b82f6" },
                  { name: result.p2_name, prob: result.prob_p2, farbe: "#f59e0b" },
                ].map(({ name, prob, farbe }) => (
                  <div key={name} style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: "#cbd5e1", fontSize: "14px" }}>{name}</span>
                      <span style={{ color: farbe, fontWeight: 700, fontSize: "1.3em" }}>
                        {(prob * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ background: "#0f172a", borderRadius: "6px", height: "14px", overflow: "hidden" }}>
                      <div style={{
                        width: `${prob * 100}%`, height: "100%", background: farbe,
                        borderRadius: "6px", transition: "width 0.7s ease",
                        boxShadow: `0 0 10px ${farbe}66`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
              <KonfidenzMeter wert={result.prob_p1 * 100} />
            </div>

            {/* QUOTEN ANALYSE */}
            <div style={styles.karte}>
              <h3 style={styles.kartenTitel}>💰 Quoten-Analyse</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, textAlign: "left" }}>Spieler</th>
                    <th style={styles.th}>Faire Quote</th>
                    <th style={styles.th}>Impl. Prob.</th>
                    <th style={styles.th}>Amerik.</th>
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
                        <td style={styles.td}>{name}</td>
                        <td style={{ ...styles.td, textAlign: "center", color: "#a3e635", fontWeight: 700 }}>{q.toFixed(2)}</td>
                        <td style={{ ...styles.td, textAlign: "center", color: "#94a3b8" }}>{(prob * 100).toFixed(1)}%</td>
                        <td style={{ ...styles.td, textAlign: "center", color: "#60a5fa" }}>{amerik}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: "12px", padding: "8px", background: "#0f172a", borderRadius: "6px" }}>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>OVERROUND (Buchmacher-Marge)</div>
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                  Bei 5% Marge: P1 = <span style={{ color: "#fbbf24" }}>{(parseFloat(result.odds_p1) * 0.95).toFixed(2)}</span>
                  &nbsp;|&nbsp; P2 = <span style={{ color: "#fbbf24" }}>{(parseFloat(result.odds_p2) * 0.95).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* SATZ MÄRKTE */}
            <div style={styles.karte}>
              <h3 style={styles.kartenTitel}>📋 Satz-Märkte</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, textAlign: "left" }}>Ergebnis</th>
                    <th style={styles.th}>Wahrsch.</th>
                    <th style={styles.th}>Faire Quote</th>
                  </tr>
                </thead>
                <tbody>
                  {result.set_results?.map((s, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff05" : "transparent" }}>
                      <td style={styles.td}>{s[0]}</td>
                      <td style={{ ...styles.td, textAlign: "center", color: "#94a3b8" }}>
                        {(s[1] * 100).toFixed(1)}%
                      </td>
                      <td style={{ ...styles.td, textAlign: "center", color: "#a3e635", fontWeight: 600 }}>
                        {(1 / s[1]).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VALUE BET RECHNER */}
            <div style={styles.karte}>
              <h3 style={styles.kartenTitel}>🎯 Value-Bet Rechner</h3>
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <input
                  style={{ ...styles.input, flex: 2 }}
                  placeholder="Buchmacher-Quote P1 (z.B. 1.85)"
                  value={buchQuote}
                  onChange={e => setBuchQuote(e.target.value)}
                />
                <input
                  style={{ ...styles.input, flex: 1 }}
                  placeholder="Bankroll €"
                  value={bankroll}
                  onChange={e => setBankroll(e.target.value)}
                />
              </div>

              {edge && (
                <div>
                  <div style={styles.edgeReihe}>
                    <span>Edge</span>
                    <span style={{ color: edge.edge > 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                      {edge.edge > 0 ? "+" : ""}{(edge.edge * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div style={styles.edgeReihe}>
                    <span>Kelly-Anteil</span>
                    <span style={{ color: "#60a5fa", fontWeight: 700 }}>
                      {(Math.max(0, edge.kelly) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={styles.edgeReihe}>
                    <span>Empfohlener Einsatz</span>
                    <span style={{ color: "#c084fc", fontWeight: 700 }}>
                      €{edge.einsatz.toFixed(2)}
                    </span>
                  </div>
                  <div style={styles.edgeReihe}>
                    <span>Erwarteter Gewinn</span>
                    <span style={{ color: edge.edge > 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                      €{(edge.einsatz * edge.edge).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <WettEmpfehlung
                edge={edge?.edge ?? null}
                kelly={edge?.kelly ?? 0}
                spieler={result.p1_name}
              />
            </div>
          </div>

          {/* SPIELER VERGLEICH */}
          <div style={{ ...styles.karte, marginTop: "16px" }}>
            <h3 style={styles.kartenTitel}>⚖️ Spieler-Vergleich</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ textAlign: "center", color: "#3b82f6", fontWeight: 700 }}>{result.p1_name}</div>
              <div style={{ textAlign: "center", color: "#f59e0b", fontWeight: 700 }}>{result.p2_name}</div>
            </div>
            <VergleichsBalken label="Siegwahrscheinlichkeit" wert1={result.prob_p1 * 100} wert2={result.prob_p2 * 100} einheit="%" />
            <VergleichsBalken label="Faire Quote" wert1={1 / parseFloat(result.odds_p1)} wert2={1 / parseFloat(result.odds_p2)} />
            {result.glicko_p1 && (
              <VergleichsBalken label="Glicko Rating" wert1={result.glicko_p1} wert2={result.glicko_p2} />
            )}
            {result.form_p1 && (
              <VergleichsBalken label="Aktuelle Form" wert1={result.form_p1 * 100} wert2={result.form_p2 * 100} einheit="%" />
            )}
          </div>

          {/* ANALYSE VERLAUF */}
          {verlauf.length > 1 && (
            <div style={{ ...styles.karte, marginTop: "16px" }}>
              <h3 style={styles.kartenTitel}>🕒 Analyse-Verlauf</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, textAlign: "left" }}>Zeit</th>
                    <th style={{ ...styles.th, textAlign: "left" }}>Match</th>
                    <th style={styles.th}>Belag</th>
                    <th style={styles.th}>P1 Chance</th>
                  </tr>
                </thead>
                <tbody>
                  {verlauf.map((v, i) => (
                    <tr key={i} style={{ background: i === 0 ? "#ffffff08" : "transparent" }}>
                      <td style={{ ...styles.td, color: "#475569", fontSize: "12px" }}>{v.zeit}</td>
                      <td style={{ ...styles.td, fontSize: "13px" }}>{v.p1} vs {v.p2}</td>
                      <td style={{ ...styles.td, textAlign: "center", fontSize: "12px", color: "#64748b" }}>{v.surface}</td>
                      <td style={{ ...styles.td, textAlign: "center", color: "#3b82f6", fontWeight: 600 }}>{v.prob}%</td>
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
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎾</div>
          <div style={{ color: "#475569", fontSize: "16px", marginBottom: "8px" }}>
            Zwei Spieler eingeben und analysieren
          </div>
          <div style={{ color: "#334155", fontSize: "13px" }}>
            {spieler.length > 0
              ? `${spieler.length} Spieler in der Datenbank verfügbar`
              : "Datenbank wird geladen..."}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── MONTE CARLO KOMPONENTE ───────────────────────────────────────────────────
function MonteCarloPanel({ result }) {
  const ciBreite = ((result.mc_ci_high - result.mc_ci_low) * 100).toFixed(1);
  const konfidenz = ciBreite < 8 ? "Hoch" : ciBreite < 15 ? "Mittel" : "Niedrig";
  const konfidenzFarbe = ciBreite < 8 ? "#4ade80" : ciBreite < 15 ? "#f59e0b" : "#f87171";

  return (
    <div style={styles.karte}>
      <h3 style={styles.kartenTitel}>🎲 Monte Carlo Simulation</h3>

      <div style={{
        background: "#0f172a", borderRadius: "8px", padding: "12px",
        marginBottom: "14px", fontSize: "12px", color: "#475569"
      }}>
        {result.mc_simulations.toLocaleString("de-DE")} simulierte Matches
      </div>

      {/* Drei Modelle nebeneinander */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
        {[
          { label: "Log. Regression", prob: result.prob_p1, farbe: "#6366f1" },
          { label: "Monte Carlo",     prob: result.mc_prob_p1, farbe: "#3b82f6" },
          { label: "Ensemble ⭐",     prob: result.ensemble_prob_p1, farbe: "#a78bfa" },
        ].map(({ label, prob, farbe }) => (
          <div key={label} style={{
            background: "#0f172a", borderRadius: "8px", padding: "12px", textAlign: "center"
          }}>
            <div style={{ fontSize: "10px", color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>
              {label}
            </div>
            <div style={{ fontSize: "1.5em", fontWeight: 800, color: farbe }}>
              {(prob * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: "11px", color: "#334155" }}>
              Quote: {(1 / prob).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Konfidenzintervall Visualisierung */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: "12px", color: "#64748b", marginBottom: "6px"
        }}>
          <span>95% Konfidenzintervall</span>
          <span style={{ color: konfidenzFarbe }}>
            {konfidenz} (±{(ciBreite / 2).toFixed(1)}%)
          </span>
        </div>
        <div style={{ position: "relative", height: "28px", background: "#0f172a", borderRadius: "6px", overflow: "hidden" }}>
          {/* Gesamt-Balken P1 */}
          <div style={{
            position: "absolute", left: 0, top: 0,
            width: `${result.mc_prob_p1 * 100}%`, height: "100%",
            background: "#1e3a5f",
          }} />
          {/* Konfidenzintervall-Band */}
          <div style={{
            position: "absolute",
            left: `${result.mc_ci_low * 100}%`,
            width: `${(result.mc_ci_high - result.mc_ci_low) * 100}%`,
            height: "100%",
            background: "#3b82f6",
            opacity: 0.8,
          }} />
          {/* Punkt-Schätzer */}
          <div style={{
            position: "absolute",
            left: `${result.mc_prob_p1 * 100}%`,
            top: 0, width: "3px", height: "100%",
            background: "white",
            transform: "translateX(-50%)",
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "11px", fontWeight: 700, color: "white",
          }}>
            {(result.mc_ci_low * 100).toFixed(1)}% — {(result.mc_prob_p1 * 100).toFixed(1)}% — {(result.mc_ci_high * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Match Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={styles.miniStat}>
          <div style={styles.miniStatLabel}>Ø Sätze pro Match</div>
          <div style={styles.miniStatWert}>{result.mc_avg_sets.toFixed(2)}</div>
        </div>
        <div style={styles.miniStat}>
          <div style={styles.miniStatLabel}>P1 Sieg in 2 Sätzen</div>
          <div style={styles.miniStatWert}>{(result.mc_prob_straight * 100).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}

// ─── BELAG RATING PANEL ───────────────────────────────────────────────────────
function BelagRatingPanel({ result, surface }) {
  const belagEmoji = { Hard: "🏟️", Clay: "🧱", Grass: "🌿" };

  return (
    <div style={styles.karte}>
      <h3 style={styles.kartenTitel}>
        {belagEmoji[surface] || "🎾"} Belag-spezifische Analyse ({surface})
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
              background: "#0f172a", borderRadius: "8px", padding: "12px"
            }}>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                {name.split(" ").pop()}
              </div>
              <div style={{ fontSize: "1.6em", fontWeight: 800, color: farbe }}>
                {rating.toFixed(0)}
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                Gesamt: {overall.toFixed(0)} &nbsp;
                <span style={{ color: diff >= 0 ? "#4ade80" : "#f87171" }}>
                  ({diff >= 0 ? "+" : ""}{diff.toFixed(0)})
                </span>
              </div>
              <div style={{ marginTop: "6px", fontSize: "11px" }}>
                <span style={{
                  color: zuverlässig ? "#4ade80" : "#f59e0b",
                  background: zuverlässig ? "#052e1622" : "#42200022",
                  padding: "2px 6px", borderRadius: "10px",
                }}>
                  {matches} Matches {zuverlässig ? "✓" : "⚠ wenig Daten"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rating Differenz Balken */}
      <VergleichsBalken
        label={`${surface} Rating`}
        wert1={result.surface_rating_p1}
        wert2={result.surface_rating_p2}
        farbe1="#3b82f6"
        farbe2="#f59e0b"
      />

      <div style={{ fontSize: "11px", color: "#334155", marginTop: "10px" }}>
        ⚠️ Bei &lt;20 Belag-Matches: Rating wird mit Gesamt-Rating gemischt
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  root: {
    background: "#0a0f1e",
    color: "white",
    minHeight: "100vh",
    padding: "24px 32px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  titel: {
    margin: 0,
    fontSize: "1.6em",
    fontWeight: 800,
    letterSpacing: "-0.5px",
    background: "linear-gradient(135deg, #3b82f6, #a78bfa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  statusPunkt: {
    width: "8px", height: "8px", borderRadius: "50%",
    background: "#4ade80", boxShadow: "0 0 6px #4ade80",
  },
  karte: {
    background: "#111827",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #1e2d40",
    marginBottom: "0",
  },
  kartenTitel: {
    margin: "0 0 14px 0",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "1.2px",
    color: "#475569",
    fontWeight: 700,
  },
  inputReihe: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  vsLabel: {
    color: "#334155",
    fontWeight: 800,
    fontSize: "12px",
    flexShrink: 0,
  },
  input: {
    background: "#0f172a",
    border: "1px solid #1e2d40",
    borderRadius: "8px",
    color: "white",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  select: {
    background: "#0f172a",
    border: "1px solid #1e2d40",
    borderRadius: "8px",
    color: "white",
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
  },
  fehlerBox: {
    background: "#450a0a",
    border: "1px solid #dc2626",
    borderRadius: "8px",
    padding: "12px 16px",
    marginBottom: "16px",
    color: "#fca5a5",
    fontSize: "14px",
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
    zIndex: 100,
    maxHeight: "240px",
    overflowY: "auto",
    marginTop: "4px",
    boxShadow: "0 8px 24px #00000088",
  },
  dropdownItem: {
    padding: "9px 14px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#cbd5e1",
    transition: "background 0.1s",
    borderRadius: "6px",
  },
  schnellStats: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "12px",
    marginBottom: "16px",
  },
  statKarte: {
    background: "#111827",
    border: "1px solid #1e2d40",
    borderRadius: "10px",
    padding: "14px",
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
    color: "#475569",
    letterSpacing: "0.8px",
    fontWeight: 600,
    textAlign: "center",
    borderBottom: "1px solid #1e2d40",
  },
  td: {
    padding: "9px 4px",
    borderBottom: "1px solid #0f172a",
    color: "#cbd5e1",
    fontSize: "13px",
  },
  edgeReihe: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #1e2d40",
    color: "#64748b",
    fontSize: "13px",
  },
  leerZustand: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#334155",
  },

  miniStat: {
  background: "#0f172a",
  borderRadius: "8px",
  padding: "10px 12px",
},
miniStatLabel: {
  fontSize: "10px",
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: "4px",
},
miniStatWert: {
  fontSize: "1.2em",
  fontWeight: 700,
  color: "#cbd5e1",
},
};

export default App;