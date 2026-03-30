import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function ProbChart({ p1_name, p2_name, prob_p1, prob_p2 }) {
  const bars = [
    { name: p1_name, prob: prob_p1, color: "#3b82f6" },
    { name: p2_name, prob: prob_p2, color: "#f59e0b" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {bars.map(({ name, prob, color }) => (
        <div key={name}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ color: "#cbd5e1", fontSize: "14px" }}>{name}</span>
            <span style={{ color, fontWeight: "700" }}>{(prob * 100).toFixed(1)}%</span>
          </div>
          <div style={{ background: "#0f172a", borderRadius: "6px", height: "24px", overflow: "hidden" }}>
            <div style={{
              width: `${prob * 100}%`,
              height: "100%",
              background: color,
              borderRadius: "6px",
              transition: "width 0.6s ease",
              display: "flex",
              alignItems: "center",
              paddingLeft: "8px",
              fontSize: "12px",
              fontWeight: "600",
              color: "white",
              boxSizing: "border-box",
            }}>
              {prob * 100 > 15 ? `${(prob * 100).toFixed(1)}%` : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [surface, setSurface] = useState("Hard");
  const [result, setResult] = useState(null);
  const [bookOdds, setBookOdds] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function calculate() {
    if (!p1.trim() || !p2.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await invoke("get_prediction", { p1, p2, surface });
      setResult(typeof res === "string" ? JSON.parse(res) : res);
    } catch (e) {
      setError(String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function calculateEdge() {
    if (!result || !bookOdds) return null;
    const p = result.prob_p1;
    const odds = parseFloat(bookOdds);
    if (isNaN(odds) || odds <= 1) return null;
    const edge = p - 1 / odds;
    const kelly = (p * odds - 1) / (odds - 1);
    return { edge, kelly };
  }

  const edgeData = calculateEdge();

  return (
    <div style={styles.root}>
      <h1 style={styles.title}>🎾 Tennis Quant Terminal</h1>

      {/* INPUT PANEL */}
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          placeholder="Player 1 (exact name)"
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && calculate()}
        />
        <input
          style={styles.input}
          placeholder="Player 2 (exact name)"
          value={p2}
          onChange={(e) => setP2(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && calculate()}
        />
        <select
          style={styles.select}
          value={surface}
          onChange={(e) => setSurface(e.target.value)}
        >
          <option>Hard</option>
          <option>Clay</option>
          <option>Grass</option>
        </select>
        <button
          style={loading ? { ...styles.button, opacity: 0.6 } : styles.button}
          onClick={calculate}
          disabled={loading}
        >
          {loading ? "⏳ Loading..." : "Predict →"}
        </button>
      </div>

      {/* ERROR BOX */}
      {error && (
        <div style={styles.errorBox}>
          ⚠️ {error}
        </div>
      )}

      {/* RESULTS */}
      {result && (
        <>
          <div style={styles.grid}>

            {/* MATCH PROBABILITY */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Match Probability</h3>
              <div style={styles.probRow}>
                <span style={styles.playerName}>{result.p1_name}</span>
                <span style={{ ...styles.probValue, color: "#3b82f6" }}>
                  {(result.prob_p1 * 100).toFixed(1)}%
                </span>
              </div>
              <div style={styles.probBar}>
                <div style={{
                  ...styles.probBarFill,
                  width: `${result.prob_p1 * 100}%`,
                  background: "#3b82f6",
                }} />
              </div>
              <div style={styles.probRow}>
                <span style={styles.playerName}>{result.p2_name}</span>
                <span style={{ ...styles.probValue, color: "#f59e0b" }}>
                  {(result.prob_p2 * 100).toFixed(1)}%
                </span>
              </div>
              <div style={styles.probBar}>
                <div style={{
                  ...styles.probBarFill,
                  width: `${result.prob_p2 * 100}%`,
                  background: "#f59e0b",
                }} />
              </div>
            </div>

            {/* FAIR ODDS */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Fair Odds</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    [result.p1_name, result.odds_p1],
                    [result.p2_name, result.odds_p2],
                  ].map(([name, odds]) => (
                    <tr key={name}>
                      <td style={styles.td}>{name}</td>
                      <td style={{
                        ...styles.td,
                        textAlign: "right",
                        color: "#a3e635",
                        fontWeight: "bold",
                        fontSize: "1.1em",
                      }}>
                        {parseFloat(odds).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SET MARKETS */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Set Markets</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {result.set_results?.map((s, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{s[0]}</td>
                      <td style={{ ...styles.td, textAlign: "right", color: "#94a3b8" }}>
                        {(1 / s[1]).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VALUE BET */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Value Bet Calculator</h3>
              <input
                style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                placeholder="Bookmaker Odds for P1 (e.g. 1.85)"
                value={bookOdds}
                onChange={(e) => setBookOdds(e.target.value)}
              />
              {edgeData && (
                <div style={{ marginTop: "15px" }}>
                  <div style={styles.edgeRow}>
                    <span>Edge</span>
                    <span style={{
                      color: edgeData.edge > 0 ? "#4ade80" : "#f87171",
                      fontWeight: "bold",
                    }}>
                      {(edgeData.edge * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div style={styles.edgeRow}>
                    <span>Kelly Stake</span>
                    <span style={{ color: "#60a5fa", fontWeight: "bold" }}>
                      {(Math.max(0, edgeData.kelly) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* CHART */}
          <div style={{ ...styles.card, marginTop: "20px" }}>
            <h3 style={styles.cardTitle}>Win Probability Chart</h3>
            <ProbChart
              p1_name={result.p1_name}
              p2_name={result.p2_name}
              prob_p1={result.prob_p1}
              prob_p2={result.prob_p2}
            />
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  root: {
    background: "#0f172a",
    color: "white",
    minHeight: "100vh",
    padding: "40px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    boxSizing: "border-box",
  },
  title: {
    marginBottom: "30px",
    fontSize: "1.8em",
    fontWeight: "700",
    letterSpacing: "-0.5px",
  },
  inputRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  input: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "white",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
    flex: 1,
    minWidth: "160px",
  },
  select: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "white",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer",
  },
  button: {
    background: "#3b82f6",
    border: "none",
    borderRadius: "8px",
    color: "white",
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  errorBox: {
    background: "#450a0a",
    border: "1px solid #dc2626",
    borderRadius: "8px",
    padding: "12px 16px",
    marginBottom: "20px",
    color: "#fca5a5",
    fontSize: "14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  card: {
    background: "#1e293b",
    padding: "20px",
    borderRadius: "10px",
    border: "1px solid #334155",
  },
  cardTitle: {
    margin: "0 0 15px 0",
    fontSize: "0.85em",
    textTransform: "uppercase",
    letterSpacing: "1px",
    color: "#64748b",
    fontWeight: "600",
  },
  probRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  playerName: { fontSize: "0.95em", color: "#cbd5e1" },
  probValue: { fontSize: "1.4em", fontWeight: "700" },
  probBar: {
    background: "#0f172a",
    borderRadius: "4px",
    height: "6px",
    marginBottom: "14px",
    overflow: "hidden",
  },
  probBarFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.5s ease",
  },
  td: {
    padding: "8px 4px",
    borderBottom: "1px solid #0f172a",
    color: "#cbd5e1",
  },
  edgeRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #334155",
    color: "#94a3b8",
  },
};

export default App;