import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AppContext";
import { QuestionDB } from "../utils/db";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL   = "llama-3.3-70b-versatile";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

// Styles OUTSIDE component — prevents re-render focus loss
const INPUT_STYLE = {
  flex: 1,
  background: "var(--bg2)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 14px",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
  fontFamily: "var(--font-body)",
  resize: "none",
};
const TEXTAREA_STYLE = { ...INPUT_STYLE, flex: "unset", width: "100%", resize: "vertical" };
const SELECT_STYLE   = { ...INPUT_STYLE, flex: "unset", width: "100%" };

const SYSTEM_PROMPT = `You are the VeriSOC Assistant — an AI helper for VeriSOC, India's social media KYC identity verification platform.

ABOUT VERISOC:
- Verifies social media users using government-issued Indian ID documents
- Accepted IDs: Aadhaar Card, PAN Card, Passport, Driving License, Voter ID
- Users submit 2 different IDs plus a selfie for biometric matching
- Each submission gets a unique KYC Code (format: VSC-YYYY-XXXXXX-CC)
- Admin reviews and approves or rejects submissions

KYC PROCESS (6 steps):
1. Personal Information (name, DOB, gender, address)
2. Contact Details (phone, city, state, PIN)
3. Primary ID document
4. Secondary ID document (different type)
5. Upload documents (ID photo + selfie)
6. Review and submit

LOGIN OPTIONS: Username + password, or Google Sign-In

TONE: Professional, friendly, concise. 2-4 sentences max. For complex issues suggest the Ask Admin tab.`;

const QUICK_ACTIONS = [
  { label: "How to complete KYC?",    msg: "What are the steps to complete KYC verification?" },
  { label: "Which IDs are accepted?", msg: "Which government ID documents are accepted?" },
  { label: "How long does review take?", msg: "How long does KYC review take after submission?" },
  { label: "Is my data safe?",        msg: "How is my personal data and documents kept secure?" },
  { label: "How to login?",           msg: "What login options are available on VeriSOC?" },
];

const FALLBACKS = {
  kyc:     "KYC on VeriSOC is a 6-step process: Personal Info → Contact → Primary ID → Secondary ID → Upload Documents → Review & Submit. You need two different government IDs and a selfie.",
  id:      "VeriSOC accepts: Aadhaar Card, PAN Card, Passport, Driving License, and Voter ID. You must submit two different ID types.",
  time:    "KYC review typically takes 24-48 hours. You will get a notification once your status is updated.",
  safe:    "Your documents are stored in your browser's encrypted IndexedDB. VeriSOC follows India's PDPB guidelines.",
  login:   "You can sign in with your username and password, or use Google Sign-In for a one-click login.",
  default: "I am the VeriSOC AI Assistant. I can help with KYC questions, document requirements, and account issues. What would you like to know?",
};

function getFallback(msg) {
  const m = msg.toLowerCase();
  if (m.includes("kyc") || m.includes("step") || m.includes("submit")) return FALLBACKS.kyc;
  if (m.includes("id") || m.includes("document") || m.includes("pan") || m.includes("passport")) return FALLBACKS.id;
  if (m.includes("time") || m.includes("long") || m.includes("review")) return FALLBACKS.time;
  if (m.includes("safe") || m.includes("secure") || m.includes("data")) return FALLBACKS.safe;
  if (m.includes("login") || m.includes("sign") || m.includes("google")) return FALLBACKS.login;
  return FALLBACKS.default;
}

export default function Chatbot() {
  const { user } = useAuth();
  const [open, setOpen]   = useState(false);
  const [tab, setTab]     = useState("chat");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Welcome to VeriSOC! I'm your AI assistant. How can I help with your KYC verification today?" }
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState("idle");

  const [askQuestion, setAskQuestion]     = useState("");
  const [askCategory, setAskCategory]     = useState("general");
  const [askSubmitting, setAskSubmitting] = useState(false);
  const [askDone, setAskDone]             = useState(false);

  const endRef   = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (open && tab === "chat") inputRef.current?.focus(); }, [open, tab]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      if (GROQ_API_KEY) {
        const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
        const res = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
          body: JSON.stringify({
            model: GROQ_MODEL,
            max_tokens: 512,
            temperature: 0.7,
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Groq error ${res.status}`);
        }
        const data = await res.json();
        setMessages(prev => [...prev, { role: "assistant", content: data.choices?.[0]?.message?.content || "Sorry, I could not respond. Try again." }]);
        setApiStatus("ok");
      } else {
        await new Promise(r => setTimeout(r, 500));
        setMessages(prev => [...prev, { role: "assistant", content: getFallback(text) + "\n\n💡 Add VITE_GROQ_API_KEY to .env for full AI. Use Ask Admin tab for human support." }]);
        setApiStatus("fallback");
      }
    } catch (err) {
      console.error("Groq error:", err);
      setMessages(prev => [...prev, { role: "assistant", content: getFallback(text) + "\n\n⚠ AI error: " + err.message }]);
      setApiStatus("fallback");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };

  const handleAskSubmit = async () => {
    if (!askQuestion.trim()) return;
    setAskSubmitting(true);
    try {
      await QuestionDB.ask(user?.username || "guest", user?.fullname || "Guest", askQuestion.trim(), askCategory);
      setAskDone(true);
      setAskQuestion("");
      setTimeout(() => setAskDone(false), 4000);
    } catch (e) { console.error(e); }
    finally { setAskSubmitting(false); }
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 800 }}>
      {open && (
        <div style={{ position: "absolute", bottom: 68, right: 0, width: 360, maxHeight: 560, background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 16, display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ background: "linear-gradient(135deg, var(--surface2), var(--surface3))", borderBottom: "1px solid var(--border)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛡️</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--cream)" }}>VeriSOC Assistant</div>
              <div style={{ fontSize: 11, color: apiStatus === "ok" ? "var(--success)" : "var(--warn)", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: apiStatus === "ok" ? "var(--success)" : "var(--warn)", display: "inline-block" }} />
                {apiStatus === "ok" ? "Groq AI • Online" : apiStatus === "fallback" ? "Smart Mode • Active" : "AI Ready"}
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text3)", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
            {[["chat", "💬 AI Chat"], ["ask", "📩 Ask Admin"]].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: tab === t ? "var(--gold)" : "var(--text3)", borderBottom: tab === t ? "2px solid var(--gold)" : "2px solid transparent", fontFamily: "var(--font-body)", transition: "all 0.2s" }}>{label}</button>
            ))}
          </div>

          {/* CHAT TAB */}
          {tab === "chat" && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? "linear-gradient(135deg, var(--green), var(--green2))" : "var(--surface2)", border: m.role === "assistant" ? "1px solid var(--border)" : "none", color: m.role === "user" ? "white" : "var(--text)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: "flex" }}>
                    <div style={{ padding: "10px 14px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "14px 14px 14px 4px", display: "flex", gap: 4, alignItems: "center" }}>
                      {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", animation: `chatDot 1.2s ${i*0.2}s infinite` }} />)}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {messages.length <= 2 && (
                <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {QUICK_ACTIONS.map(a => (
                    <button key={a.label} onClick={() => sendMessage(a.msg)} style={{ padding: "5px 10px", borderRadius: 20, background: "transparent", border: "1px solid var(--border2)", color: "var(--gold)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)", whiteSpace: "nowrap" }}>{a.label}</button>
                  ))}
                </div>
              )}

              <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask me anything..."
                  style={INPUT_STYLE}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: input.trim() && !loading ? "var(--gold)" : "var(--surface2)", border: "none", cursor: input.trim() ? "pointer" : "not-allowed", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
                >↑</button>
              </div>
            </>
          )}

          {/* ASK ADMIN TAB */}
          {tab === "ask" && (
            <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, padding: "10px 14px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                📋 Submit a question and our admin team will answer it personally.
              </div>
              {askDone ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--success)" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Question Submitted!</div>
                  <div style={{ fontSize: 13, color: "var(--text2)" }}>Admin will respond soon. Check your notifications.</div>
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text3)", letterSpacing: 1, textTransform: "uppercase", fontFamily: "var(--font-mono)", display: "block", marginBottom: 6 }}>Category</label>
                    <select value={askCategory} onChange={e => setAskCategory(e.target.value)} style={SELECT_STYLE}>
                      <option value="general">General Query</option>
                      <option value="kyc">KYC Process</option>
                      <option value="documents">Documents</option>
                      <option value="status">Status Check</option>
                      <option value="technical">Technical Issue</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text3)", letterSpacing: 1, textTransform: "uppercase", fontFamily: "var(--font-mono)", display: "block", marginBottom: 6 }}>Your Question</label>
                    <textarea
                      value={askQuestion}
                      onChange={e => setAskQuestion(e.target.value)}
                      placeholder="Describe your question or issue..."
                      rows={4}
                      style={TEXTAREA_STYLE}
                    />
                  </div>
                  {user && <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>Submitting as: @{user.username}</div>}
                  {!user && <div style={{ fontSize: 12, color: "var(--warn)", padding: "8px 12px", background: "rgba(201,154,45,0.08)", borderRadius: 8, border: "1px solid rgba(201,154,45,0.2)" }}>⚠️ Login to link your question and receive notifications.</div>}
                  <button
                    onClick={handleAskSubmit}
                    disabled={!askQuestion.trim() || askSubmitting}
                    style={{ padding: "12px", borderRadius: 10, border: "none", cursor: askQuestion.trim() ? "pointer" : "not-allowed", background: askQuestion.trim() ? "var(--gold)" : "var(--surface3)", color: askQuestion.trim() ? "#0a0f0c" : "var(--text3)", fontWeight: 700, fontSize: 14, fontFamily: "var(--font-body)" }}
                  >
                    {askSubmitting ? "Submitting..." : "📩 Submit to Admin"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: 52, height: 52, borderRadius: "50%", background: open ? "var(--surface2)" : "var(--gold)", border: open ? "1px solid var(--border2)" : "none", cursor: "pointer", fontSize: 22, boxShadow: open ? "none" : "0 8px 24px rgba(201,168,76,0.35)", transition: "all 0.25s", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {open ? "✕" : "💬"}
      </button>

      <style>{`@keyframes chatDot { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
    </div>
  );
}