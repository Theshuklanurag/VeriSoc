import { useState } from "react";
import { useAuth, useToast, usePage } from "../context/AppContext";
import { AdminAuth } from "../utils/db";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const { navigate } = usePage();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (locked) return;
    setError("");
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));

    const valid = AdminAuth.verify(form.username, form.password);
    if (!valid) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLocked(true);
        setError("Too many failed attempts. Refresh the page to try again.");
      } else {
        setError(`Invalid credentials. ${5 - newAttempts} attempt(s) remaining.`);
      }
      setLoading(false);
      return;
    }

    const profile = AdminAuth.getProfile();
    login({ ...profile, role: "admin" });
    addToast("Admin access granted.", "success");
    navigate("admin");
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "calc(100vh - 72px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", zIndex: 1 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(201,76,76,0.15)", border: "1px solid rgba(201,76,76,0.25)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔑</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--cream)", marginBottom: 4 }}>Restricted Access</h1>
          <p style={{ color: "var(--text3)", fontSize: 14, fontFamily: "var(--font-mono)" }}>System Administrator Portal</p>
        </div>

        <div className="card" style={{ padding: "36px 32px" }}>
          {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>🚫 {error}</div>}

          {locked ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
              <p style={{ color: "var(--danger)", fontWeight: 600 }}>Access Locked</p>
              <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 8 }}>Refresh the page to try again.</p>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="form-group">
                <label className="form-label">Administrator Username</label>
                <input name="username" value={form.username} onChange={handle} className="form-input" placeholder="Admin username" autoComplete="off" required />
              </div>
              <div className="form-group">
                <label className="form-label">Administrator Password</label>
                <input name="password" type="password" value={form.password} onChange={handle} className="form-input" placeholder="Admin password" autoComplete="off" required />
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", padding: "10px 14px", background: "var(--bg2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                ⚠ Unauthorized access attempts are logged and monitored.
              </div>
              <button type="submit" className="btn btn-full" disabled={loading} style={{ background: "rgba(201,76,76,0.15)", color: "var(--danger)", border: "1px solid rgba(201,76,76,0.3)", fontSize: 15 }}>
                {loading ? <><span className="spinner" style={{ width: 15, height: 15, marginRight: 8 }} />Authenticating...</> : "Authenticate"}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <span onClick={() => navigate("login")} style={{ fontSize: 13, color: "var(--text3)", cursor: "pointer" }}>← Back to user login</span>
        </div>
      </div>
    </div>
  );
}