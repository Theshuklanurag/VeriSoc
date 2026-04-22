import { useState, useEffect } from "react";
import { useAuth, usePage } from "../context/AppContext";
import { NotificationDB } from "../utils/db";

const navLinks = [
  { id: "home",    label: "Home" },
  { id: "kyc",     label: "KYC Verify" },
  { id: "about",   label: "About" },
  { id: "contact", label: "Contact" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { page, navigate } = usePage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!user || user.role === "admin") { setUnreadCount(0); return; }
    const check = async () => {
      const ns = await NotificationDB.getByUsername(user.username);
      setUnreadCount(ns.filter(n => !n.read).length);
    };
    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, [user]);

  const handleLogout = () => { logout(); navigate("home"); setMenuOpen(false); };

  // ── Admin sees only a minimal header with logout
  if (user?.role === "admin") {
    return (
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 500, height: 72,
        background: scrolled ? "rgba(10,15,12,0.98)" : "rgba(10,15,12,0.9)",
        backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(201,76,76,0.2)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px",
        transition: "all 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, background: "rgba(201,76,76,0.2)", border: "1px solid rgba(201,76,76,0.4)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔑</div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--cream)" }}>
            Veri<span style={{ color: "var(--gold)" }}>SOC</span>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--danger)", marginLeft: 10, letterSpacing: 2 }}>ADMIN</span>
          </span>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleLogout}
          style={{ padding: "7px 16px", fontSize: 13, borderColor: "rgba(201,76,76,0.3)", color: "var(--danger)" }}
        >
          Logout
        </button>
      </header>
    );
  }

  // ── Regular user nav
  const links = [
    ...navLinks,
    ...(user ? [{ id: "dashboard", label: "Dashboard" }, { id: "support", label: "Support", badge: unreadCount }] : []),
  ];

  const NavBtn = ({ id, label, badge }) => (
    <button onClick={() => { navigate(id); setMenuOpen(false); }} style={{
      background: page === id ? "rgba(201,168,76,0.1)" : "transparent",
      border: page === id ? "1px solid var(--border2)" : "1px solid transparent",
      borderRadius: 8, padding: "8px 16px",
      color: page === id ? "var(--gold)" : "var(--text2)",
      fontSize: 14, fontWeight: 500, cursor: "pointer",
      transition: "all 0.2s", fontFamily: "var(--font-body)",
      position: "relative",
    }}
      onMouseEnter={e => { if (page !== id) e.currentTarget.style.color = "var(--text)"; }}
      onMouseLeave={e => { if (page !== id) e.currentTarget.style.color = "var(--text2)"; }}
    >
      {label}
      {badge > 0 && (
        <span style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "var(--danger)", color: "white", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 500, height: 72,
      background: scrolled ? "rgba(10,15,12,0.95)" : "rgba(10,15,12,0.75)",
      backdropFilter: "blur(24px)",
      borderBottom: scrolled ? "1px solid rgba(201,168,76,0.15)" : "1px solid rgba(201,168,76,0.08)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px",
      transition: "all 0.3s",
      boxShadow: scrolled ? "0 4px 30px rgba(0,0,0,0.3)" : "none",
    }}>
      <div onClick={() => navigate("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #c9a84c, #a88530)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 2px 12px rgba(201,168,76,0.3)" }}>🛡️</div>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--cream)", letterSpacing: "-0.5px" }}>
          Veri<span style={{ color: "var(--gold)" }}>SOC</span>
        </span>
      </div>

      <nav style={{ display: "flex", alignItems: "center", gap: 4 }} className="desktop-nav">
        {links.map(l => <NavBtn key={l.id} {...l} />)}
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))", border: "1px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>
              {(user.fullname || user.username)[0].toUpperCase()}
            </div>
            <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: "7px 16px", fontSize: 13 }}>Logout</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
            <button className="btn btn-secondary" onClick={() => navigate("login")} style={{ padding: "7px 16px", fontSize: 13 }}>Sign In</button>
            <button className="btn btn-primary" onClick={() => navigate("signup")} style={{ padding: "8px 18px", fontSize: 13 }}>Get Started →</button>
          </div>
        )}
      </nav>

      <button className="mobile-only" onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: "none", color: "var(--text)", fontSize: 24, cursor: "pointer", display: "none" }}>
        {menuOpen ? "✕" : "☰"}
      </button>

      {menuOpen && (
        <div style={{ position: "absolute", top: 72, left: 0, right: 0, background: "rgba(10,15,12,0.98)", border: "1px solid var(--border)", backdropFilter: "blur(20px)", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {links.map(l => (
            <button key={l.id} onClick={() => { navigate(l.id); setMenuOpen(false); }} style={{ background: page === l.id ? "rgba(201,168,76,0.08)" : "transparent", border: "none", borderRadius: 8, padding: "12px 16px", textAlign: "left", color: page === l.id ? "var(--gold)" : "var(--text2)", fontSize: 15, cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
              {l.label}
              {l.badge > 0 && <span style={{ padding: "1px 7px", borderRadius: 10, background: "var(--danger)", color: "white", fontSize: 11, fontWeight: 700 }}>{l.badge}</span>}
            </button>
          ))}
          {user
            ? <button className="btn btn-danger" onClick={handleLogout} style={{ marginTop: 8 }}>Logout</button>
            : <>
                <button className="btn btn-secondary" onClick={() => { navigate("login"); setMenuOpen(false); }} style={{ marginTop: 8 }}>Sign In</button>
                <button className="btn btn-primary" onClick={() => { navigate("signup"); setMenuOpen(false); }}>Get Started →</button>
              </>
          }
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-only { display: block !important; }
        }
      `}</style>
    </header>
  );
}