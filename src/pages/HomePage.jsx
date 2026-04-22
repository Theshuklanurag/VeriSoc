import { usePage } from "../context/AppContext";

const FEATURES = [
  { icon: "🪪", cls: "ib-gold",  title: "Multi-Document KYC",    desc: "Submit Aadhaar, PAN, Passport, Driving License, or Voter ID — two IDs required for stronger verification." },
  { icon: "🤖", cls: "ib-green", title: "AI Biometric Matching",  desc: "Deep-learning face comparison between your government ID photo and live selfie in real time." },
  { icon: "🔐", cls: "ib-earth", title: "Unique KYC Codes",       desc: "Every submission receives a unique, trackable code (VSC-YYYY-XXXXXX) for transparent status tracking." },
  { icon: "📊", cls: "ib-blue",  title: "Admin Review Dashboard", desc: "Secure admin panel with approval workflow, suspicious flag system, CSV export, and full audit trail." },
  { icon: "⚡", cls: "ib-gold",  title: "Fast Verification",      desc: "Automated pipeline with live status updates. Most accounts reviewed within 24–48 hours." },
  { icon: "🛡️", cls: "ib-green", title: "PDPB Compliant",        desc: "Designed with India's Personal Data Protection Bill in mind — your data stays private and secure." },
];

const STEPS = [
  ["Register", "Create your account with email, name, and a secure password."],
  ["Fill Personal Info", "Provide your date of birth, address, and contact details."],
  ["Submit Two IDs", "Upload two different government-issued identity documents."],
  ["Upload Selfie", "Take a clear selfie for biometric face matching."],
  ["Receive KYC Code", "Get your unique VSC code to track your submission."],
  ["Get Verified", "Admin reviews and approves — you receive your trust badge."],
];

export default function HomePage() {
  const { navigate } = usePage();

  return (
    <div className="page-wrapper">
      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "calc(100vh - 72px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", textAlign: "center", padding: "80px 28px",
      }}>
        {/* Eyebrow */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(201,168,76,0.08)", border: "1px solid var(--border2)",
          borderRadius: 100, padding: "6px 18px", marginBottom: 32,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", animation: "liveDot 2s infinite", display: "inline-block" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-mono)", letterSpacing: 1 }}>
            INDIA'S SOCIAL MEDIA KYC PLATFORM
          </span>
        </div>

        {/* Heading */}
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(42px, 7vw, 80px)",
          fontWeight: 800, lineHeight: 1.06,
          letterSpacing: "-2px",
          color: "var(--cream)", marginBottom: 24,
          maxWidth: 820,
        }}>
          Trust Every<br />
          <span style={{ color: "var(--gold)" }}>Digital Identity</span>
        </h1>

        <p style={{
          fontSize: "clamp(16px, 2vw, 19px)",
          color: "var(--text2)", maxWidth: 560,
          lineHeight: 1.75, marginBottom: 44,
        }}>
          VeriSOC uses government-grade KYC to eliminate fake accounts,
          protect Indian citizens online, and build genuine digital trust.
        </p>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={() => navigate("signup")} style={{ fontSize: 16, padding: "14px 36px" }}>
            Start Verification →
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("about")} style={{ fontSize: 16, padding: "14px 36px" }}>
            Learn More
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 48, marginTop: 72, flexWrap: "wrap", justifyContent: "center" }}>
          {[["5+", "ID Types Accepted"], ["VSC", "Unique Code Per User"], ["24hr", "Avg. Review Time"], ["PDPB", "Compliant"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: "var(--gold)" }}>{n}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", letterSpacing: 1 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="section" style={{ background: "rgba(255,255,255,0.01)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="container">
          <div className="section-header-center">
            <span className="section-eyebrow">Why VeriSOC</span>
            <h2 className="section-title">Built for Digital India</h2>
            <p className="section-subtitle">Every feature designed to make online identity verification secure, transparent, and accessible.</p>
          </div>
          <div className="card-grid">
            {FEATURES.map(f => (
              <div className="card" key={f.title}>
                <div className={`icon-badge ${f.cls}`}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "flex-start" }}>
            <div>
              <span className="section-eyebrow">The Process</span>
              <h2 className="section-title" style={{ marginBottom: 40 }}>Verify in 6 Simple Steps</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {STEPS.map(([t, d], i) => (
                  <div key={t} style={{
                    display: "flex", gap: 18,
                    padding: "20px 24px",
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 12, transition: "all 0.3s",
                  }}>
                    <div style={{
                      width: 36, height: 36, flexShrink: 0,
                      background: "var(--gold)", borderRadius: 9,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "#0a0f0c",
                    }}>{i + 1}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: "var(--cream)" }}>{t}</div>
                      <div style={{ fontSize: 13, color: "var(--text2)" }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PREVIEW CARD */}
            <div>
              <div className="card" style={{ padding: 32 }}>
                <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: 2, color: "var(--text3)", marginBottom: 20, textTransform: "uppercase" }}>Sample KYC Record</div>

                {[
                  ["KYC Code", <span className="mono">VSC-2025-K7HN3Q-PR</span>],
                  ["Full Name", "Anurag Shukla"],
                  ["Primary ID", "Aadhaar Card"],
                  ["Secondary ID", "PAN Card"],
                  ["Submitted", "07 Apr 2025"],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                    <span style={{ color: "var(--text3)", fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>{l}</span>
                    <span style={{ color: "var(--cream)", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}

                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text3)", marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>Verification Status</div>
                  {[["Aadhaar Verified", "verified"], ["Face Match", "verified"], ["PAN Cross-check", "pending"]].map(([l, s]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 14 }}>{l}</span>
                      <span className={`badge badge-${s}`}><span className="badge-dot" />{s}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20, background: "var(--bg2)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>TRUST SCORE</div>
                  <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3 }}>
                    <div style={{ height: "100%", width: "73%", background: "linear-gradient(90deg, var(--gold), var(--success))", borderRadius: 3 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
                    <span style={{ color: "var(--text3)" }}>Pending 1 check</span>
                    <span style={{ color: "var(--gold)", fontWeight: 700 }}>73 / 100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────── */}
      <section className="section" style={{
        background: "linear-gradient(135deg, rgba(45,122,69,0.06), rgba(201,168,76,0.06))",
        borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
        textAlign: "center",
      }}>
        <div className="container">
          <h2 className="section-title">Ready to Get Verified?</h2>
          <p style={{ color: "var(--text2)", marginTop: 12, marginBottom: 36, fontSize: 17 }}>
            Join thousands of verified citizens building a trustworthy digital India.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("signup")} style={{ fontSize: 16, padding: "14px 40px" }}>
            Begin KYC Verification →
          </button>
        </div>
      </section>

      <style>{`
        @keyframes liveDot { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
      `}</style>
    </div>
  );
}
