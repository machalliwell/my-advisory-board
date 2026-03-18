import { useState, useEffect, useRef, useCallback } from "react";

// Compressed data loader
const DATA_URL = "https://raw.githubusercontent.com/ChatPRD/lennys-podcast-transcripts/main/episodes/";

const SUGGESTED_QUESTIONS = [
  { q: "How do I push back on scope creep from stakeholders?", icon: "🎯" },
  { q: "What's the best framework for prioritizing a roadmap?", icon: "📋" },
  { q: "How should I handle a disagreement with my engineering lead?", icon: "🤝" },
  { q: "What metrics should I track for product-market fit?", icon: "📊" },
  { q: "How do I run an effective product review meeting?", icon: "💡" },
  { q: "What's the best way to say no to feature requests?", icon: "🚫" },
  { q: "How do I build trust with a new team as a group PM?", icon: "🏗️" },
  { q: "What's the most common mistake PMs make in their first year?", icon: "⚠️" },
];

const TOPICS = [
  "prioritization", "hiring", "product strategy", "growth strategy",
  "leadership", "product market fit", "decision making", "team building",
  "communication", "experimentation", "retention", "enterprise sales",
  "ai", "product management", "career development", "company culture",
  "innovation", "customer research", "feedback", "storytelling"
];

const SAMPLE_EPISODES = [
  { id: "shreyas-doshi", guest: "Shreyas Doshi", title: "The art of decision making, hiring, and strategy" },
  { id: "marty-cagan", guest: "Marty Cagan", title: "The nature of product, team empowerment, and building what matters" },
  { id: "brian-chesky", guest: "Brian Chesky", title: "Designing a life, leading Airbnb, founder mode" },
  { id: "bret-taylor", guest: "Bret Taylor", title: "Invented the Like button, built Google Maps, future of AI agents" },
  { id: "lenny-rachitsky", guest: "Lenny Rachitsky", title: "Host — Product, growth, and career advice" },
  { id: "elena-verna-40", guest: "Elena Verna", title: "Growth systems, product-led growth, making products lovable" },
  { id: "ami-vora", guest: "Ami Vora", title: "Making impact through authenticity and curiosity" },
  { id: "adam-fishman", guest: "Adam Fishman", title: "Building high-performing growth teams" },
  { id: "casey-winters", guest: "Casey Winters", title: "Growth loops, product strategy, career ladders" },
  { id: "camille-fournier", guest: "Camille Fournier", title: "Engineering management, organizational design" },
  { id: "ben-horowitz", guest: "Ben Horowitz", title: "Why founders fail, running toward fear" },
  { id: "melanie-perkins", guest: "Melanie Perkins", title: "Building Canva from nothing to $42B" },
  { id: "stewart-butterfield", guest: "Stewart Butterfield", title: "Mental models for building products people love" },
  { id: "molly-graham", guest: "Molly Graham", title: "Leading through chaos, change, and scale" },
  { id: "jason-cohen", guest: "Jason Cohen", title: "5 questions when your product stops growing" },
  { id: "matt-lemay", guest: "Matt LeMay", title: "The one question that saves product careers" },
  { id: "nick-turley", guest: "Nick Turley", title: "Inside ChatGPT — fastest growing product in history" },
];

function searchRelevantChunks(query, episodes) {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const scored = episodes.map(ep => {
    const searchText = `${ep.guest} ${ep.title}`.toLowerCase();
    let score = 0;
    queryWords.forEach(w => {
      if (searchText.includes(w)) score += 3;
    });
    if (ep.kw) {
      ep.kw.forEach(kw => {
        queryWords.forEach(w => {
          if (kw.toLowerCase().includes(w) || w.includes(kw.toLowerCase())) score += 2;
        });
      });
    }
    return { ...ep, score };
  });
  return scored.filter(e => e.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
}

export default function LennyAdvisor() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("advisor"); // advisor | linkedin
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [streamText, setStreamText] = useState("");
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("ask"); // ask | history | about
  const inputRef = useRef(null);
  const responseRef = useRef(null);

  const handleSubmit = useCallback(async (questionOverride) => {
    const q = questionOverride || query;
    if (!q.trim() || loading) return;

    setLoading(true);
    setResponse(null);
    setStreamText("");

    const relevantEps = searchRelevantChunks(q, SAMPLE_EPISODES);
    const guestContext = relevantEps.length > 0
      ? relevantEps.map(ep => `- ${ep.guest}: "${ep.title}"`).join("\n")
      : SAMPLE_EPISODES.slice(0, 6).map(ep => `- ${ep.guest}: "${ep.title}"`).join("\n");

    const systemPrompt = mode === "advisor"
      ? `You are the Lenny's Podcast Advisory Bot — a tool that synthesizes product management wisdom from 314+ episodes of Lenny's Podcast featuring world-class PMs, founders, and operators.

When answering a question:
1. Attribute specific advice to specific guests by name (e.g., "Shreyas Doshi recommends...", "According to Marty Cagan...")
2. Present 2-4 different perspectives from different guests when they exist
3. Note where experts disagree — that's the most valuable insight
4. End with a practical "What to do Monday morning" section with 2-3 concrete actions
5. Keep it conversational but substantive — like advice from a senior PM friend
6. Reference real frameworks when applicable (RICE, ICE, Jobs-to-be-Done, etc.)

Here are some guests whose insights are relevant to this question:
${guestContext}

Important: You're drawing from a real archive of 314 podcast episodes. Be specific about which guest said what. If you're not sure a specific guest said something, frame it as "One common perspective from the archive..." rather than false attribution.`
      : `You are the Lenny's Podcast LinkedIn Content Generator — you help product managers create thought-leadership posts based on wisdom from 314+ episodes of Lenny's Podcast.

Generate a LinkedIn post draft with this structure:
1. HOOK (1-2 lines): A provocative opening that stops the scroll. Use patterns like "I analyzed 314 podcast episodes and found..." or "The best PMs I've studied all do this one thing..." or a contrarian take.
2. INSIGHT (3-5 short paragraphs): The core insight, attributed to specific guests. Use names and specific frameworks. Mix agreement and disagreement between guests.
3. YOUR TAKE (placeholder): Write "[YOUR TAKE: Add 2-3 sentences about how this applies to your own experience as a Group PM]"
4. CTA: End with a question that invites engagement.

Format for LinkedIn: short paragraphs, line breaks between each point, no bullet points, conversational tone. Aim for 150-250 words total.

Here are some guests whose insights are relevant:
${guestContext}

Important: Attribute insights to real guests. Be specific.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: "user", content: q }],
        }),
      });

      const data = await res.json();
      const text = data.content?.map(c => c.text || "").join("") || "Sorry, I couldn't generate a response. Please try again.";

      setResponse({ text, query: q, mode, guests: relevantEps.map(e => e.guest) });
      setHistory(prev => [{ text, query: q, mode, timestamp: Date.now(), guests: relevantEps.map(e => e.guest) }, ...prev].slice(0, 20));
    } catch (err) {
      setResponse({ text: "There was an error connecting to the API. This prototype uses the Claude API built into this chat — it should work automatically. If you're seeing this error, try refreshing the page.", query: q, mode, guests: [] });
    }

    setLoading(false);
    setQuery("");
  }, [query, mode, loading]);

  useEffect(() => {
    if (response && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [response]);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d0d15 100%)", color: "#e8e6e0", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "20px 0" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #c084fc, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💡</div>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 400, color: "#f0eee8", letterSpacing: "-0.02em" }}>PM Wisdom Engine</div>
              <div style={{ fontSize: 11, color: "#8a8880", letterSpacing: "0.05em", textTransform: "uppercase" }}>314 episodes · 312 experts</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
            {[["advisor", "Advisory Bot"], ["linkedin", "LinkedIn Draft"]].map(([key, label]) => (
              <button key={key} onClick={() => setMode(key)}
                style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
                  background: mode === key ? "rgba(192,132,252,0.15)" : "transparent",
                  color: mode === key ? "#c084fc" : "#8a8880",
                  transition: "all 0.2s" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>

        {/* Hero */}
        {!response && !loading && (
          <div style={{ textAlign: "center", padding: "48px 0 32px" }}>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, fontWeight: 400, color: "#f0eee8", margin: "0 0 12px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {mode === "advisor" ? "Ask 312 product experts" : "Draft your next LinkedIn post"}
            </h1>
            <p style={{ fontSize: 16, color: "#8a8880", margin: 0, lineHeight: 1.6, maxWidth: 500, marginInline: "auto" }}>
              {mode === "advisor"
                ? "Get synthesized advice from Lenny's Podcast archive — with attribution to specific guests and frameworks."
                : "Generate thought-leadership content backed by real insights from 314 podcast episodes."}
            </p>
          </div>
        )}

        {/* Search Input */}
        <div style={{ position: "relative", margin: response || loading ? "24px 0 16px" : "0 0 32px" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder={mode === "advisor" ? "Ask a product management question..." : "Enter a topic for your LinkedIn post..."}
                style={{
                  width: "100%", padding: "14px 18px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)", color: "#e8e6e0", fontSize: 15, fontFamily: "inherit",
                  outline: "none", transition: "all 0.2s", boxSizing: "border-box",
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(192,132,252,0.3)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
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
            <div style={{ fontSize: 12, color: "#6a6860", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontWeight: 500 }}>
              {mode === "advisor" ? "Try asking" : "Popular topics"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(mode === "advisor" ? SUGGESTED_QUESTIONS : SUGGESTED_QUESTIONS.map(q => ({
                ...q,
                q: q.q.replace("How do I", "Write about").replace("What's the", "The").replace("How should I", "Why you should")
              }))).map((item, i) => (
                <button key={i} onClick={() => { setQuery(item.q); handleSubmit(item.q); }}
                  style={{
                    padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.02)", color: "#b0ada6", fontSize: 13, fontFamily: "inherit",
                    cursor: "pointer", textAlign: "left", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 10, lineHeight: 1.4
                  }}
                  onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.borderColor = "rgba(192,132,252,0.15)"; }}
                  onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.02)"; e.target.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  <span>{item.q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ display: "inline-flex", gap: 6, marginBottom: 16 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%", background: "#c084fc",
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <div style={{ color: "#8a8880", fontSize: 14 }}>
              Consulting 312 product experts...
            </div>
            <style>{`@keyframes pulse { 0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }`}</style>
          </div>
        )}

        {/* Response */}
        {response && (
          <div ref={responseRef} style={{ marginBottom: 40 }}>
            {/* Question Badge */}
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

            {/* Main Response Card */}
            <div style={{
              background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)",
              padding: "28px 28px 20px", marginBottom: 16,
            }}>
              <div style={{ fontSize: 15, lineHeight: 1.75, color: "#d0cdc6", whiteSpace: "pre-wrap" }}>
                {response.text.split("\n").map((line, i) => {
                  if (line.startsWith("# ")) return <div key={i} style={{ fontSize: 20, fontWeight: 600, color: "#f0eee8", margin: "20px 0 12px", fontFamily: "'DM Serif Display', serif" }}>{line.slice(2)}</div>;
                  if (line.startsWith("## ")) return <div key={i} style={{ fontSize: 16, fontWeight: 600, color: "#e8e6e0", margin: "20px 0 8px" }}>{line.slice(3)}</div>;
                  if (line.startsWith("### ")) return <div key={i} style={{ fontSize: 14, fontWeight: 600, color: "#c084fc", margin: "16px 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{line.slice(4)}</div>;
                  if (line.startsWith("**") && line.endsWith("**")) return <div key={i} style={{ fontWeight: 600, color: "#e8e6e0", margin: "14px 0 6px" }}>{line.slice(2, -2)}</div>;
                  if (line.startsWith("- ") || line.startsWith("• ")) return <div key={i} style={{ paddingLeft: 16, position: "relative", margin: "4px 0" }}><span style={{ position: "absolute", left: 0, color: "#c084fc" }}>·</span>{line.slice(2)}</div>;
                  if (line.match(/^\d+\./)) return <div key={i} style={{ paddingLeft: 20, position: "relative", margin: "4px 0" }}><span style={{ position: "absolute", left: 0, color: "#c084fc", fontWeight: 600 }}>{line.match(/^\d+/)[0]}.</span>{line.replace(/^\d+\.\s*/, "")}</div>;
                  if (line.trim() === "") return <div key={i} style={{ height: 12 }} />;
                  return <div key={i} style={{ margin: "4px 0" }}>{line}</div>;
                })}
              </div>
            </div>

            {/* Source Guests */}
            {response.guests?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#6a6860", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Sources consulted</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {response.guests.map((g, i) => (
                    <span key={i} style={{
                      padding: "5px 10px", borderRadius: 8, fontSize: 12,
                      background: "rgba(255,255,255,0.04)", color: "#8a8880",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>{g}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => navigator.clipboard?.writeText(response.text)}
                style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#8a8880", fontSize: 13, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => e.target.style.borderColor = "rgba(192,132,252,0.3)"}
                onMouseLeave={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}>
                Copy to clipboard
              </button>
              {response.mode === "advisor" && (
                <button onClick={() => { setMode("linkedin"); setQuery(response.query); handleSubmit(response.query); }}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(251,146,60,0.2)", background: "rgba(251,146,60,0.06)", color: "#fb923c", fontSize: 13, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s" }}>
                  → Turn into LinkedIn post
                </button>
              )}
              <button onClick={() => { setResponse(null); inputRef.current?.focus(); }}
                style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#8a8880", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                Ask another question
              </button>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && !loading && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, marginBottom: 40 }}>
            <div style={{ fontSize: 12, color: "#6a6860", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Previous questions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {history.slice(0, 5).map((h, i) => (
                <button key={i} onClick={() => { setResponse(h); }}
                  style={{
                    padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)",
                    background: "rgba(255,255,255,0.02)", color: "#8a8880", fontSize: 13,
                    fontFamily: "inherit", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.02)"}>
                  <span style={{ fontSize: 10, color: h.mode === "advisor" ? "#c084fc" : "#fb923c" }}>●</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.query}</span>
                  <span style={{ fontSize: 11, color: "#4a4840", flexShrink: 0 }}>{new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Featured Experts Grid */}
        {!response && !loading && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, marginBottom: 40 }}>
            <div style={{ fontSize: 12, color: "#6a6860", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Featured experts in the archive</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SAMPLE_EPISODES.slice(0, 12).map((ep, i) => (
                <button key={i} onClick={() => { const q = `What are ${ep.guest}'s key insights on product management?`; setQuery(q); handleSubmit(q); }}
                  style={{
                    padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.02)", color: "#a0a098", fontSize: 12,
                    fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.target.style.background = "rgba(192,132,252,0.08)"; e.target.style.color = "#c084fc"; }}
                  onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.02)"; e.target.style.color = "#a0a098"; }}>
                  {ep.guest}
                </button>
              ))}
              <span style={{ padding: "6px 12px", fontSize: 12, color: "#4a4840" }}>+300 more</span>
            </div>
          </div>
        )}

        {/* Topics */}
        {!response && !loading && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, paddingBottom: 48 }}>
            <div style={{ fontSize: 12, color: "#6a6860", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Browse by topic</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TOPICS.map((topic, i) => (
                <button key={i} onClick={() => {
                  const q = mode === "advisor"
                    ? `What do Lenny's guests recommend about ${topic}?`
                    : `Write a LinkedIn post about ${topic} insights from product leaders`;
                  setQuery(q); handleSubmit(q);
                }}
                  style={{
                    padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.02)", color: "#8a8880", fontSize: 12,
                    fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.target.style.background = "rgba(129,140,248,0.08)"; e.target.style.color = "#818cf8"; }}
                  onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.02)"; e.target.style.color = "#8a8880"; }}>
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "16px 0 24px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#3a3830", lineHeight: 1.6 }}>
            Built with data from Lenny's Podcast · ChatPRD transcript archive · Lenny's Newsletter
            <br />Open source prototype · Not affiliated with Lenny Rachitsky
          </div>
        </div>
      </div>
    </div>
  );
}
