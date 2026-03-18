import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "./api";

const SUGGESTED_QUESTIONS = [
  { q: "How do I push back on scope creep from stakeholders?", icon: "\u{1F3AF}" },
  { q: "What's the best framework for prioritizing a roadmap?", icon: "\u{1F4CB}" },
  { q: "How should I handle a disagreement with my engineering lead?", icon: "\u{1F91D}" },
  { q: "What metrics should I track for product-market fit?", icon: "\u{1F4CA}" },
  { q: "How do I run an effective product review meeting?", icon: "\u{1F4A1}" },
  { q: "What's the best way to say no to feature requests?", icon: "\u{1F6AB}" },
  { q: "How do I build trust with a new team?", icon: "\u{1F3D7}" },
  { q: "What's the most common mistake in the first year?", icon: "\u26A0\uFE0F" },
];

const TOPICS = [
  "prioritization", "hiring", "product strategy", "growth strategy",
  "leadership", "product market fit", "decision making", "team building",
  "communication", "experimentation", "retention", "enterprise sales",
  "ai", "product management", "career development", "company culture",
  "innovation", "customer research", "feedback", "storytelling",
];

// --- Styles ---
const s = {
  pill: { padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", color: "#8a8880", fontSize: 12, fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s" },
  card: { background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", padding: "28px 28px 20px", marginBottom: 16 },
  btn: { padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#8a8880", fontSize: 13, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s" },
  input: { width: "100%", padding: "14px 18px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#e8e6e0", fontSize: 15, fontFamily: "inherit", outline: "none", transition: "all 0.2s", boxSizing: "border-box" },
  label: { fontSize: 12, color: "#6a6860", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontWeight: 500 },
  section: { borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, marginBottom: 40 },
};

function ResponseCard({ response, onLinkedIn, onNewQuestion }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{
          padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
          background: response.mode === "advisor" ? "rgba(192,132,252,0.12)" : "rgba(251,146,60,0.12)",
          color: response.mode === "advisor" ? "#c084fc" : "#fb923c",
        }}>
          {response.mode === "advisor" ? "Advisory Bot" : "LinkedIn Draft"}
        </span>
        <span style={{ fontSize: 13, color: "#6a6860" }}>{response.query}</span>
      </div>

      <div style={s.card}>
        <div style={{ fontSize: 15, lineHeight: 1.75, color: "#d0cdc6", whiteSpace: "pre-wrap" }}>
          {response.text.split("\n").map((line, i) => {
            if (line.startsWith("# ")) return <div key={i} style={{ fontSize: 20, fontWeight: 600, color: "#f0eee8", margin: "20px 0 12px", fontFamily: "'DM Serif Display', serif" }}>{line.slice(2)}</div>;
            if (line.startsWith("## ")) return <div key={i} style={{ fontSize: 16, fontWeight: 600, color: "#e8e6e0", margin: "20px 0 8px" }}>{line.slice(3)}</div>;
            if (line.startsWith("### ")) return <div key={i} style={{ fontSize: 14, fontWeight: 600, color: "#c084fc", margin: "16px 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{line.slice(4)}</div>;
            if (line.startsWith("**") && line.endsWith("**")) return <div key={i} style={{ fontWeight: 600, color: "#e8e6e0", margin: "14px 0 6px" }}>{line.slice(2, -2)}</div>;
            if (line.startsWith("- ") || line.startsWith("\u2022 ")) return <div key={i} style={{ paddingLeft: 16, position: "relative", margin: "4px 0" }}><span style={{ position: "absolute", left: 0, color: "#c084fc" }}>\u00B7</span>{line.slice(2)}</div>;
            if (line.match(/^\d+\./)) return <div key={i} style={{ paddingLeft: 20, position: "relative", margin: "4px 0" }}><span style={{ position: "absolute", left: 0, color: "#c084fc", fontWeight: 600 }}>{line.match(/^\d+/)[0]}.</span>{line.replace(/^\d+\.\s*/, "")}</div>;
            if (line.trim() === "") return <div key={i} style={{ height: 12 }} />;
            return <div key={i} style={{ margin: "4px 0" }}>{line}</div>;
          })}
        </div>
      </div>

      {response.advisors?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={s.label}>Sources consulted</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {response.advisors.map((g, i) => (
              <span key={i} style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12, background: "rgba(255,255,255,0.04)", color: "#8a8880", border: "1px solid rgba(255,255,255,0.06)" }}>{g}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => navigator.clipboard?.writeText(response.text)} style={s.btn}>Copy to clipboard</button>
        {response.mode === "advisor" && (
          <button onClick={onLinkedIn} style={{ ...s.btn, borderColor: "rgba(251,146,60,0.2)", background: "rgba(251,146,60,0.06)", color: "#fb923c" }}>
            \u2192 Turn into LinkedIn post
          </button>
        )}
        <button onClick={onNewQuestion} style={s.btn}>Ask another question</button>
      </div>
    </div>
  );
}

function UploadPanel({ onDone }) {
  const [advisors, setAdvisors] = useState([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState("");
  const [newAdvisorName, setNewAdvisorName] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.getAdvisors().then(setAdvisors).catch(() => {});
  }, []);

  const addAdvisor = async () => {
    if (!newAdvisorName.trim()) return;
    try {
      await api.createAdvisor(newAdvisorName.trim());
      const updated = await api.getAdvisors();
      setAdvisors(updated);
      setSelectedAdvisor(newAdvisorName.trim());
      setNewAdvisorName("");
      setStatus({ ok: true, msg: `Added advisor: ${newAdvisorName.trim()}` });
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedAdvisor) return;
    setUploading(true);
    setStatus(null);
    try {
      const res = await api.ingestFile(file, selectedAdvisor);
      setStatus({ ok: true, msg: `Ingested "${res.title}": ${res.chunks} chunks (advice density: ${res.advice_density_avg})` });
      if (onDone) onDone();
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    }
    setUploading(false);
  };

  const handleURLIngest = async () => {
    if (!url.trim() || !selectedAdvisor) return;
    setUploading(true);
    setStatus(null);
    try {
      const res = await api.ingestURL(url.trim(), selectedAdvisor);
      setStatus({ ok: true, msg: `Ingested "${res.title}": ${res.chunks} chunks` });
      setUrl("");
      if (onDone) onDone();
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    }
    setUploading(false);
  };

  return (
    <div style={{ padding: "32px 0" }}>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "#f0eee8", marginBottom: 8 }}>Upload Knowledge</h2>
      <p style={{ color: "#8a8880", fontSize: 14, marginBottom: 24 }}>Add sources to your advisory board. Upload PDFs, paste URLs, or add text files.</p>

      {/* Advisor selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={s.label}>1. Choose or create an advisor</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {advisors.map(a => (
            <button key={a.name} onClick={() => setSelectedAdvisor(a.name)}
              style={{ ...s.pill, background: selectedAdvisor === a.name ? "rgba(192,132,252,0.15)" : "rgba(255,255,255,0.02)", color: selectedAdvisor === a.name ? "#c084fc" : "#8a8880", borderColor: selectedAdvisor === a.name ? "rgba(192,132,252,0.3)" : "rgba(255,255,255,0.06)" }}>
              {a.name} ({a.source_count} sources)
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newAdvisorName} onChange={e => setNewAdvisorName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addAdvisor()}
            placeholder="New advisor name..." style={{ ...s.input, flex: 1 }} />
          <button onClick={addAdvisor} disabled={!newAdvisorName.trim()}
            style={{ ...s.btn, opacity: newAdvisorName.trim() ? 1 : 0.5 }}>Add</button>
        </div>
      </div>

      {/* Upload */}
      {selectedAdvisor && (
        <div style={{ marginBottom: 20 }}>
          <div style={s.label}>2. Add a source for {selectedAdvisor}</div>

          {/* File upload */}
          <div style={{ ...s.card, cursor: "pointer", textAlign: "center" }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const dt = new DataTransfer(); dt.items.add(f); fileRef.current.files = dt.files; handleFileUpload({ target: { files: [f] } }); } }}>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md" onChange={handleFileUpload} style={{ display: "none" }} />
            <div style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F4C4}"}</div>
            <div style={{ color: "#8a8880", fontSize: 14 }}>
              {uploading ? "Uploading..." : "Drop a file here or click to upload (PDF, TXT, MD)"}
            </div>
          </div>

          {/* URL ingest */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleURLIngest()}
              placeholder="Or paste a URL..." style={{ ...s.input, flex: 1 }} />
            <button onClick={handleURLIngest} disabled={!url.trim() || uploading}
              style={{ ...s.btn, opacity: url.trim() && !uploading ? 1 : 0.5 }}>
              {uploading ? "..." : "Ingest"}
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      {status && (
        <div style={{ padding: "12px 16px", borderRadius: 12, marginTop: 12, background: status.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${status.ok ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, color: status.ok ? "#4ade80" : "#f87171", fontSize: 13 }}>
          {status.msg}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("advisor");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("ask");
  const [stats, setStats] = useState(null);
  const inputRef = useRef(null);
  const responseRef = useRef(null);

  const refreshStats = useCallback(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  const handleSubmit = useCallback(async (questionOverride) => {
    const q = questionOverride || query;
    if (!q.trim() || loading) return;

    setLoading(true);
    setResponse(null);

    try {
      let data;
      if (mode === "advisor") {
        data = await api.ask(q);
        const text = data.answer;
        const advisors = data.advisors_consulted || [];
        setResponse({ text, query: q, mode, advisors });
        setHistory(prev => [{ text, query: q, mode, timestamp: Date.now(), advisors }, ...prev].slice(0, 20));
      } else {
        data = await api.linkedin(q);
        const text = data.post;
        const advisors = data.advisors_consulted || [];
        setResponse({ text, query: q, mode, advisors });
        setHistory(prev => [{ text, query: q, mode, timestamp: Date.now(), advisors }, ...prev].slice(0, 20));
      }
    } catch (err) {
      setResponse({
        text: `Error: ${err.message}. Make sure the server is running and ANTHROPIC_API_KEY is set.`,
        query: q, mode, advisors: [],
      });
    }

    setLoading(false);
    setQuery("");
  }, [query, mode, loading]);

  useEffect(() => {
    if (response && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [response]);

  const tabStyle = (tab) => ({
    padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
    background: activeTab === tab ? "rgba(192,132,252,0.15)" : "transparent",
    color: activeTab === tab ? "#c084fc" : "#8a8880",
    transition: "all 0.2s",
  });

  const modeStyle = (m) => ({
    padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
    background: mode === m ? "rgba(192,132,252,0.15)" : "transparent",
    color: mode === m ? "#c084fc" : "#8a8880",
    transition: "all 0.2s",
  });

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "20px 0" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #c084fc, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{"\u{1F4A1}"}</div>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 400, color: "#f0eee8", letterSpacing: "-0.02em" }}>Advisory Board</div>
              <div style={{ fontSize: 11, color: "#8a8880", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                {stats ? `${stats.advisors} advisors \u00B7 ${stats.chunks} chunks` : "Loading..."}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
            <button onClick={() => setActiveTab("ask")} style={tabStyle("ask")}>Ask</button>
            <button onClick={() => setActiveTab("upload")} style={tabStyle("upload")}>Upload</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>

        {/* --- Upload Tab --- */}
        {activeTab === "upload" && (
          <UploadPanel onDone={refreshStats} />
        )}

        {/* --- Ask Tab --- */}
        {activeTab === "ask" && (
          <>
            {/* Hero */}
            {!response && !loading && (
              <div style={{ textAlign: "center", padding: "48px 0 32px" }}>
                <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, fontWeight: 400, color: "#f0eee8", margin: "0 0 12px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                  {mode === "advisor" ? "Ask your advisory board" : "Draft your next LinkedIn post"}
                </h1>
                <p style={{ fontSize: 16, color: "#8a8880", margin: 0, lineHeight: 1.6, maxWidth: 500, marginInline: "auto" }}>
                  {mode === "advisor"
                    ? "Get synthesized advice with attribution to specific advisors and frameworks."
                    : "Generate thought-leadership content backed by real expert insights."}
                </p>
              </div>
            )}

            {/* Mode toggle */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
                <button onClick={() => setMode("advisor")} style={modeStyle("advisor")}>Advisory Bot</button>
                <button onClick={() => setMode("linkedin")} style={modeStyle("linkedin")}>LinkedIn Draft</button>
              </div>
            </div>

            {/* Search Input */}
            <div style={{ position: "relative", margin: response || loading ? "8px 0 16px" : "0 0 32px" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    placeholder={mode === "advisor" ? "Ask a question..." : "Enter a topic for your LinkedIn post..."}
                    style={s.input}
                  />
                </div>
                <button onClick={() => handleSubmit()} disabled={!query.trim() || loading}
                  style={{
                    padding: "14px 24px", borderRadius: 14, border: "none", cursor: query.trim() && !loading ? "pointer" : "default",
                    background: query.trim() && !loading ? "linear-gradient(135deg, #c084fc, #818cf8)" : "rgba(255,255,255,0.06)",
                    color: query.trim() && !loading ? "#fff" : "#555", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
                    transition: "all 0.2s", whiteSpace: "nowrap",
                  }}>
                  {loading ? "Thinking..." : mode === "advisor" ? "Ask" : "Generate"}
                </button>
              </div>
            </div>

            {/* Suggested Questions */}
            {!response && !loading && (
              <div style={{ marginBottom: 40 }}>
                <div style={s.label}>{mode === "advisor" ? "Try asking" : "Popular topics"}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {SUGGESTED_QUESTIONS.map((item, i) => (
                    <button key={i} onClick={() => { setQuery(item.q); handleSubmit(item.q); }}
                      style={{
                        padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.02)", color: "#b0ada6", fontSize: 13, fontFamily: "inherit",
                        cursor: "pointer", textAlign: "left", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 10, lineHeight: 1.4,
                      }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                      <span>{item.q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ display: "inline-flex", gap: 6, marginBottom: 16 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#c084fc", animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
                <div style={{ color: "#8a8880", fontSize: 14 }}>
                  {mode === "advisor" ? "Consulting your advisory board..." : "Drafting your LinkedIn post..."}
                </div>
              </div>
            )}

            {/* Response */}
            {response && (
              <div ref={responseRef}>
                <ResponseCard
                  response={response}
                  onLinkedIn={() => { setMode("linkedin"); handleSubmit(response.query); }}
                  onNewQuestion={() => { setResponse(null); inputRef.current?.focus(); }}
                />
              </div>
            )}

            {/* History */}
            {history.length > 0 && !loading && (
              <div style={s.section}>
                <div style={s.label}>Previous questions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {history.slice(0, 5).map((h, i) => (
                    <button key={i} onClick={() => setResponse(h)}
                      style={{
                        padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)",
                        background: "rgba(255,255,255,0.02)", color: "#8a8880", fontSize: 13,
                        fontFamily: "inherit", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                      }}>
                      <span style={{ fontSize: 10, color: h.mode === "advisor" ? "#c084fc" : "#fb923c" }}>{"\u25CF"}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.query}</span>
                      <span style={{ fontSize: 11, color: "#4a4840", flexShrink: 0 }}>{new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Topics */}
            {!response && !loading && (
              <div style={s.section}>
                <div style={s.label}>Browse by topic</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingBottom: 48 }}>
                  {TOPICS.map((topic, i) => (
                    <button key={i} onClick={() => {
                      const q = mode === "advisor"
                        ? `What do the experts recommend about ${topic}?`
                        : `Write a LinkedIn post about ${topic} insights from experts`;
                      setQuery(q); handleSubmit(q);
                    }} style={s.pill}>
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "16px 0 24px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#3a3830", lineHeight: 1.6 }}>
            Advisory Board \u00B7 Built with Claude
          </div>
        </div>
      </div>
    </div>
  );
}
