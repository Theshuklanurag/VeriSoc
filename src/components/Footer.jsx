import { useAuth, usePage } from "../context/AppContext";

export default function Footer() {
  const { user } = useAuth();
  const { navigate } = usePage();

  // Bug 18 fixed: show relevant links based on auth state
  const baseLinks = [
    { id: "home", label: "Home" },
    { id: "kyc", label: "KYC Verify" },
    { id: "about", label: "About" },
    { id: "contact", label: "Contact" },
  ];

  const authLinks = user ? [
    { id: "dashboard", label: "Dashboard" },
    { id: "support", label: "Support" },
  ] : [
    { id: "login", label: "Sign In" },
    { id: "signup", label: "Register" },
  ];

  const allLinks = [...baseLinks, ...authLinks];

  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "40px 0", position: "relative", zIndex: 1 }}>
      <div className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("home")}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🛡️</div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "var(--cream)" }}>
            Veri<span style={{ color: "var(--gold)" }}>SOC</span>
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text3)" }}>
          © 2025 VeriSOC — Securing India's Digital Identity · A Yukti 2025 Project
        </p>
        <p style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
          Anurag Shukla · Adnan Parvez Khan · Aditya Shah
        </p>
        <div style={{ display: "flex", gap: 20, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
          {allLinks.map(p => (
            <span key={p.id} onClick={() => navigate(p.id)} style={{ fontSize: 13, color: "var(--text3)", cursor: "pointer", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = "var(--gold)"}
              onMouseLeave={e => e.target.style.color = "var(--text3)"}>
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
