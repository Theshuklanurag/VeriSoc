// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────

import { usePage, useToast } from "../context/AppContext";
import { useState } from "react";
import { QuestionDB } from "../utils/db";

const TEAM = [
  {
    initials: "AS", name: "Anurag Shukla", role: "Project Manager & System Architect",
    bio: "Frontend developer and system architect passionate about structured, impactful web applications and India's digital future.",
    github: "https://github.com/Theshuklanurag",
    linkedin: "https://www.linkedin.com/in/anurag-shukla-48a05832b",
  },
  {
    initials: "AK", name: "Adnan Parvez Khan", role: "Frontend Developer & UI/UX Designer",
    bio: "Focused on building user-friendly interfaces and delivering smooth, intuitive user experiences across devices.",
    github: "https://github.com/adnankhan295",
    linkedin: "https://www.linkedin.com/in/adnan-parvez-khan-424307258",
  },
  {
    initials: "AS", name: "Aditya Shah", role: "Frontend Developer",
    bio: "Specializes in HTML, CSS, and JavaScript — crafting pixel-perfect, accessible web interfaces for modern browsers.",
    github: "https://github.com/Adityashah21",
    linkedin: "http://www.linkedin.com/in/aditya-shah-80040232a",
  },
];

export function AboutPage() {
  return (
    <div className="page-wrapper">
      <div className="container" style={{ paddingTop: 56, paddingBottom: 80 }}>
        <div className="section-header-center" style={{ marginBottom: 56 }}>
          <span className="section-eyebrow">The Team</span>
          <h2 className="section-title">Meet the Developers</h2>
          <p className="section-subtitle">Built at Yukti 2025 with a passion for securing India's digital identity layer.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, marginBottom: 80 }}>
          {TEAM.map((t, i) => (
            <div className="card" key={t.name} style={{ textAlign: "center", padding: 36 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${i === 0 ? "var(--gold), var(--gold2)" : i === 1 ? "var(--green), var(--green2)" : "var(--accent3), var(--gold)"})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "#0a0f0c", margin: "0 auto 18px", border: "3px solid var(--border2)" }}>
                {t.initials}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--cream)", marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 600, marginBottom: 12 }}>{t.role}</div>
              <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7, marginBottom: 20 }}>{t.bio}</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                <a href={t.github} target="_blank" rel="noreferrer" style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text2)", transition: "all 0.2s" }}>GitHub</a>
                <a href={t.linkedin} target="_blank" rel="noreferrer" style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text2)", transition: "all 0.2s" }}>LinkedIn</a>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 56 }}>
          <div className="section-header-center" style={{ marginBottom: 40 }}>
            <span className="section-eyebrow">The Vision</span>
            <h2 className="section-title">Securing Digital India</h2>
          </div>
          <div className="card-grid">
            {[
              ["🔬", "ib-gold",  "Yukti 2025 Project",  "VeriSOC was built for Yukti 2025, addressing India's rising fake account problem on social platforms."],
              ["🇮🇳", "ib-green", "Built for Bharat",    "Supports Aadhaar, PAN, Passport, Driving License and Voter ID — covering all major Indian identity documents."],
              ["🌐", "ib-earth", "Scalable Vision",      "Designed to plug into any social media platform, fintech app, or e-commerce site requiring verified Indian users."],
              ["⚖️", "ib-blue",  "PDPB Aligned",        "Built with India's Personal Data Protection Bill principles — data minimization, consent, and transparency."],
            ].map(([icon, cls, title, desc]) => (
              <div className="card" key={title}>
                <div className={`icon-badge ${cls}`}>{icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CONTACT PAGE ──────────────────────────────────────────────────────────────

export function ContactPage() {
  const { addToast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Bug 19 fixed: actually saves to QuestionDB instead of doing nothing
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const question = `[Contact Form] Subject: ${form.subject}\n\nFrom: ${form.name} (${form.email})\n\n${form.message}`;
      await QuestionDB.ask(
        form.email.split("@")[0] || "contact",
        form.name,
        question,
        "general"
      );
      addToast("Message sent! We'll respond within 24 hours.", "success");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      addToast("Failed to send message. Please try again.", "error");
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="page-wrapper">
      <div className="container" style={{ paddingTop: 56, paddingBottom: 80 }}>
        <div className="section-header-center" style={{ marginBottom: 56 }}>
          <span className="section-eyebrow">Get in Touch</span>
          <h2 className="section-title">Contact VeriSOC</h2>
          <p className="section-subtitle">For support, partnerships, or general inquiries — we're here to help.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 48, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              ["📧", "Email", "support@verisoc.in"],
              ["📞", "Phone", "+91 11 2345 6789"],
              ["📍", "Office", "New Delhi, India — 110001"],
              ["🕐", "Hours", "Mon–Fri · 9AM – 6PM IST"],
              ["🔒", "Security", "security@verisoc.in"],
            ].map(([icon, label, value]) => (
              <div key={label} style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text3)", letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "var(--cream)", marginTop: 3 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: "36px 32px" }}>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input name="name" value={form.name} onChange={handle} className="form-input" placeholder="Anurag Shukla" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input name="email" type="email" value={form.email} onChange={handle} className="form-input" placeholder="you@email.com" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select name="subject" value={form.subject} onChange={handle} className="form-select" required>
                  <option value="">Select a topic</option>
                  <option>KYC Verification Issue</option>
                  <option>Account Support</option>
                  <option>Security Concern</option>
                  <option>Partnership Inquiry</option>
                  <option>General Feedback</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea name="message" value={form.message} onChange={handle} className="form-input" placeholder="Describe your query or issue in detail..." rows={5} required style={{ resize: "vertical" }} />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ fontSize: 15 }}>
                {loading ? <><span className="spinner" style={{ width: 15, height: 15, marginRight: 8 }} /> Sending...</> : "Send Message →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
