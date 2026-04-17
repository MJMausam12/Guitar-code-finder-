import { useState, useRef, useEffect } from "react";

const CHORD_DIAGRAMS = {
  C: ["x32010", "C Major"],
  G: ["320003", "G Major"],
  Am: ["x02210", "A Minor"],
  F: ["133211", "F Major"],
  D: ["xx0232", "D Major"],
  Em: ["022000", "E Minor"],
  Dm: ["xx0231", "D Minor"],
  E: ["022100", "E Major"],
  A: ["x02220", "A Major"],
  Bm: ["x24432", "B Minor"],
};

// Demo data for when API key is missing or rate limited
const getDemoData = (videoId, url) => {
  const songTitle = "Song from YouTube";
  return {
    raw: `**Song Title & Artist** ${songTitle} (Demo Mode - Add API Key for Real Analysis)

**Key & Tempo** G Major · 120 BPM

**Chord Progression** G - D - Em - C

**Strumming Pattern** D DU UDU

**Lyrics with Chords**:
[G]This is a [D]demo [Em]song for [C]you
[G]Add your [D]Anthropic [Em]API key to [C]use

[G]The AI will [D]transcribe real [Em]chords from [C]YouTube
[G]Until then, [D]practice with [Em]this pattern [C]freely

**Tips for Beginners**:
- Start slowly with downstrokes only
- Practice chord transitions between G and D first
- Use a metronome at 80 BPM to build consistency`,
    songTitle: `${songTitle} (Demo Mode)`,
    key: "G Major",
    tempo: "120 BPM",
    strumming: "D DU UDU",
    chords: "G - D - Em - C",
    videoId: videoId,
    isDemo: true,
  };
};

function ChordBadge({ chord }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: "linear-gradient(135deg, #f97316, #ea580c)",
        color: "#fff",
        borderRadius: "6px",
        padding: "2px 10px",
        fontFamily: "'Courier Prime', monospace",
        fontWeight: "700",
        fontSize: "0.85rem",
        margin: "0 3px",
        boxShadow: "0 2px 8px rgba(249,115,22,0.4)",
        verticalAlign: "middle",
        letterSpacing: "0.05em",
      }}
    >
      {chord}
    </span>
  );
}

function LyricsDisplay({ content }) {
  if (!content) return null;

  const lines = content.split("\n");
  return (
    <div style={{ lineHeight: "2.2", fontFamily: "'Lora', serif", fontSize: "1.05rem", color: "#e2d9c8" }}>
      {lines.map((line, i) => {
        const chordPattern = /\[([A-G][#b]?(?:m|maj|min|sus|aug|dim|add)?[0-9]*(?:\/[A-G][#b]?)?)\]/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = chordPattern.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push(
              <span key={`t-${lastIndex}`} style={{ color: "#d4c5a9" }}>
                {line.slice(lastIndex, match.index)}
              </span>
            );
          }
          parts.push(<ChordBadge key={`c-${match.index}`} chord={match[1]} />);
          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < line.length) {
          parts.push(
            <span key={`t-end-${i}`} style={{ color: "#d4c5a9" }}>
              {line.slice(lastIndex)}
            </span>
          );
        }

        // Handle headings and empty chord lines
        if (parts.length === 0) {
          const isHeading = line.startsWith("##");
          const isSubheading = line.startsWith("#");
          const isSection = line.match(/^\*\*[^*]+\*\*/);
          
          let headingColor = "#d4c5a9";
          let fontWeight = "400";
          let fontSize = "1rem";
          let marginTop = "0";
          
          if (isHeading) {
            headingColor = "#f97316";
            fontWeight = "700";
            fontSize = "1.1rem";
            marginTop = "1.2em";
          } else if (isSubheading) {
            headingColor = "#fbbf24";
            fontWeight = "600";
            fontSize = "1rem";
            marginTop = "0.8em";
          } else if (isSection) {
            headingColor = "#fbbf24";
            fontWeight = "600";
            fontSize = "1rem";
            marginTop = "0.5em";
          }
          
          return (
            <div key={i} style={{ minHeight: "1.5em", color: headingColor, fontWeight, fontSize, marginTop }}>
              {line.replace(/^#+\s*/, "").replace(/\*\*/g, "")}
            </div>
          );
        }

        return (
          <div key={i} style={{ minHeight: "1.5em" }}>
            {parts}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("anthropic_api_key") || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("chords");
  const [usingDemo, setUsingDemo] = useState(false);
  const inputRef = useRef();

  // Save API key to localStorage when changed
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("anthropic_api_key", apiKey);
    } else {
      localStorage.removeItem("anthropic_api_key");
    }
  }, [apiKey]);

  const extractVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  };

  const fetchChords = async (useDemoMode = false) => {
    if (!url.trim()) {
      setError("Please paste a YouTube URL first.");
      return;
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError("Invalid YouTube URL. Please check and try again.");
      return;
    }

    // Demo mode override
    if (useDemoMode) {
      setLoading(true);
      setError("");
      setUsingDemo(true);
      // Simulate loading delay
      setTimeout(() => {
        const demoData = getDemoData(videoId, url);
        setResult(demoData);
        setLoading(false);
        setUsingDemo(true);
      }, 800);
      return;
    }

    // Check for API key
    if (!apiKey.trim()) {
      setError("Please enter your Anthropic API key, or click 'Try Demo Mode'.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setUsingDemo(false);

    const prompt = `You are a professional guitarist and music transcriber. The user has provided a YouTube video ID: "${videoId}" for URL: "${url}".

Based on this YouTube song URL, please provide:

1. **Song Title & Artist** (guess from the URL or provide a common song if unknown)
2. **Key & Tempo** 
3. **Chord Progression** with the main chords used
4. **Strumming Pattern** (use D for Down, U for Up, e.g., D DU UDU)
5. **Full Lyrics with Chords** - Place chords in [CHORD] format right before the syllable where they change, inline with lyrics

Format the lyrics section like this example:
[G]Twinkle twinkle [C]little [G]star
[C]How I [G]wonder [D]what you [G]are

Important notes:
- Support Assamese songs - if this appears to be an Assamese song, provide lyrics in both Assamese script and romanized form
- Be as accurate as possible with real chord placements
- Include verse, chorus, bridge sections clearly labeled
- Add a "Tips for Beginners" section at the end

If you cannot identify the exact song, create a realistic chord chart based on the URL hints. Always provide something useful and complete.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-sonnet-20240229",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API key. Please check your Anthropic API key.");
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later or use Demo Mode.");
        } else {
          throw new Error(data.error?.message || `API Error: ${response.status}`);
        }
      }

      let fullText = "";
      if (data.content && Array.isArray(data.content)) {
        fullText = data.content
          .map((item) => (item.type === "text" ? item.text : ""))
          .filter(Boolean)
          .join("\n");
      } else if (data.content && data.content.text) {
        fullText = data.content.text;
      } else {
        throw new Error("Unexpected API response format");
      }

      // Parse sections with more robust regex
      const songTitleMatch = fullText.match(/\*\*Song Title[^*]*\*\*[:\s]*([^\n]+)/i);
      const keyMatch = fullText.match(/\*\*Key[^*]*\*\*[:\s]*([^\n]+)/i);
      const tempoMatch = fullText.match(/\*\*Tempo[^*]*\*\*[:\s]*([^\n]+)/i);
      const strummingMatch = fullText.match(/\*\*Strumming Pattern[^*]*\*\*[:\s]*\n?([^\n*#]+)/i);
      const chordsMatch = fullText.match(/\*\*Chord Progression[^*]*\*\*[:\s]*\n?([^\n*#]+(?:\n[^\n*#]+)*)/i);

      setResult({
        raw: fullText,
        songTitle: songTitleMatch?.[1]?.trim() || "Song Analysis",
        key: keyMatch?.[1]?.trim() || "Unknown",
        tempo: tempoMatch?.[1]?.trim() || "Unknown",
        strumming: strummingMatch?.[1]?.trim() || "D DU UDU",
        chords: chordsMatch?.[1]?.trim() || "",
        videoId,
        isDemo: false,
      });
    } catch (e) {
      console.error("API Error:", e);
      setError(e.message || "Something went wrong. Please try again or use Demo Mode.");
    }

    setLoading(false);
  };

  const tabs = [
    { id: "chords", label: "🎸 Chords & Lyrics" },
    { id: "strumming", label: "🥁 Strumming" },
    { id: "video", label: "▶ Video" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0f0a05 0%, #1a0f02 40%, #0d1a0a 100%)",
        fontFamily: "'Lora', serif",
        color: "#e2d9c8",
        padding: "0",
      }}
    >
      {/* Noise texture overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <header
          style={{
            textAlign: "center",
            padding: "3rem 1rem 2rem",
            borderBottom: "1px solid rgba(249,115,22,0.15)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎸</div>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontFamily: "'Playfair Display', serif",
              fontWeight: "900",
              background: "linear-gradient(135deg, #fbbf24, #f97316, #ea580c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: "0 0 0.5rem",
              letterSpacing: "-0.02em",
            }}
          >
            ChordCraft
          </h1>
          <p
            style={{
              color: "#a89070",
              fontSize: "1rem",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            YouTube → Guitar Chords, Strumming & Lyrics · Supports Assamese Songs
          </p>
        </header>

        {/* Input Section */}
        <div
          style={{
            maxWidth: "720px",
            margin: "2.5rem auto",
            padding: "0 1.5rem",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(249,115,22,0.25)",
              borderRadius: "16px",
              padding: "1.5rem",
              backdropFilter: "blur(10px)",
            }}
          >
            {/* API Key Input */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.7rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#a89070",
                  marginBottom: "0.5rem",
                  fontFamily: "'Courier Prime', monospace",
                }}
              >
                🔑 Anthropic API Key
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  style={{
                    flex: 1,
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(249,115,22,0.3)",
                    borderRadius: "10px",
                    padding: "0.65rem 1rem",
                    color: "#e2d9c8",
                    fontSize: "0.85rem",
                    fontFamily: "'Courier Prime', monospace",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(249,115,22,0.2)",
                    borderRadius: "8px",
                    padding: "0.65rem 0.8rem",
                    color: "#a89070",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  {showApiKey ? "🙈" : "👁️"}
                </button>
              </div>
              <p style={{ fontSize: "0.7rem", color: "#7a6a55", marginTop: "0.4rem" }}>
                Get your API key from{" "}
                <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#f97316" }}>
                  Anthropic Console
                </a>
              </p>
            </div>

            {/* URL Input */}
            <label
              style={{
                display: "block",
                fontSize: "0.7rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#f97316",
                marginBottom: "0.5rem",
                fontFamily: "'Courier Prime', monospace",
              }}
            >
              🎵 YouTube Song URL
            </label>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <input
                ref={inputRef}
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && fetchChords()}
                placeholder="https://www.youtube.com/watch?v=... or video ID"
                style={{
                  flex: 1,
                  minWidth: "220px",
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(249,115,22,0.3)",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  color: "#e2d9c8",
                  fontSize: "0.95rem",
                  fontFamily: "'Courier Prime', monospace",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#f97316")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(249,115,22,0.3)")}
              />
            </div>
            
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                onClick={() => fetchChords(false)}
                disabled={loading}
                style={{
                  flex: 1,
                  background: loading
                    ? "rgba(249,115,22,0.3)"
                    : "linear-gradient(135deg, #f97316, #ea580c)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0.85rem 1.8rem",
                  color: "#fff",
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: "700",
                  fontSize: "1rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "transform 0.1s, box-shadow 0.2s",
                  boxShadow: loading ? "none" : "0 4px 20px rgba(249,115,22,0.4)",
                }}
              >
                {loading ? "Analyzing..." : "Get Chords ✦"}
              </button>
              <button
                onClick={() => fetchChords(true)}
                disabled={loading}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(249,115,22,0.3)",
                  borderRadius: "10px",
                  padding: "0.85rem 1.2rem",
                  color: "#a89070",
                  fontFamily: "'Lora', serif",
                  fontSize: "0.9rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                🎸 Demo Mode
              </button>
            </div>
            
            {error && (
              <p style={{ color: "#f87171", fontSize: "0.85rem", marginTop: "0.75rem", fontFamily: "'Courier Prime', monospace" }}>
                ⚠ {error}
              </p>
            )}
            {usingDemo && result && (
              <p style={{ color: "#fbbf24", fontSize: "0.8rem", marginTop: "0.75rem", fontFamily: "'Courier Prime', monospace" }}>
                🎵 Currently showing demo data. Add an API key for real YouTube transcriptions!
              </p>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "#a89070",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  width: "48px",
                  height: "48px",
                  border: "3px solid rgba(249,115,22,0.2)",
                  borderTopColor: "#f97316",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  marginBottom: "1rem",
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ fontStyle: "italic" }}>🎵 Transcribing chords & lyrics...</p>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div style={{ marginTop: "2rem" }}>
              {/* Song Info Bar */}
              <div
                style={{
                  background: result.isDemo ? "rgba(251,191,36,0.08)" : "rgba(249,115,22,0.08)",
                  border: `1px solid ${result.isDemo ? "rgba(251,191,36,0.2)" : "rgba(249,115,22,0.2)"}`,
                  borderRadius: "12px",
                  padding: "1rem 1.25rem",
                  marginBottom: "1.5rem",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1rem",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1, minWidth: "160px" }}>
                  <div style={{ fontSize: "0.7rem", color: "#a89070", textTransform: "uppercase", letterSpacing: "0.1em" }}>Song</di
