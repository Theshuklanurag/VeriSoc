import { useState, useEffect } from "react";
import { useAuth, useToast, usePage } from "../context/AppContext";
import { UserDB } from "../utils/db";
import { supabase } from "../utils/supabase.js";

export default function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const { navigate } = usePage();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Handle OAuth (Google) redirect callback
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const gUser = session.user;
        try {
          let user = await UserDB.findByEmail(gUser.email);
          if (!user) {
            const uname = gUser.email.split("@")[0].replace(/[^a-z0-9_]/gi, "_");
            const res = await UserDB.create({
              fullname: gUser.user_metadata?.full_name || uname,
              email: gUser.email,
              username: uname,
              phone: "",
              password: crypto.randomUUID(),
            });
            user = res.user;
          }
          if (user) {
            login(user);
            addToast(`Welcome, ${user.fullname || user.username}!`, "success");
            navigate("dashboard");
          }
        } catch (e) {
          console.error("OAuth login error", e);
          addToast("Sign-in error. Please try again.", "error");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.username.trim() || !form.password) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 400));

    // UserDB.verify now uses supabase.auth.signInWithPassword internally
    const user = await UserDB.verify(form.username.trim(), form.password);
    if (!user) {
      setError("Incorrect username or password.");
      setLoading(false);
      return;
    }

    login(user);
    addToast(`Welcome back, ${user.fullname || user.username}!`, "success");
    navigate("dashboard");
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (err) {
      addToast("Google sign-in failed: " + err.message, "error");
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 72px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", zIndex: 1 }}>
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))", border: "1px solid rgba(201,168,76,0.35)", margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: "0 0 30px rgba(201,168,76,0.15)" }}>🛡️</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--cream)", marginBottom: 6 }}>Welcome Back</h1>
          <p style={{ color: "var(--text2)", fontSize: 15 }}>Sign in to your VeriSOC account</p>
        </div>

        <div style={{ background: "linear-gradient(160deg, rgba(25,34,25,0.9) 0%, rgba(15,23,18,0.95) 100%)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 18, padding: "36px 32px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)", backdropFilter: "blur(20px)" }}>
          {error && (
            <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(201,76,76,0.08)", border: "1px solid rgba(201,76,76,0.25)", borderRadius: 10, fontSize: 13, color: "#e87070" }}>⚠ {error}</div>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input name="username" value={form.username} onChange={handle} className="form-input" placeholder="Enter your username" autoComplete="username" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" value={form.password} onChange={handle} className="form-input" placeholder="••••••••" autoComplete="current-password" required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 6, fontSize: 15, padding: "13px", borderRadius: 12 }}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} />Authenticating...</> : "Sign In →"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.1)" }} />
            <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)", letterSpacing: 2 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.1)" }} />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{ width: "100%", padding: "12px 20px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--cream)", fontWeight: 600, fontSize: 14, fontFamily: "var(--font-body)", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
          >
            {googleLoading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <p style={{ textAlign: "center", fontSize: 14, color: "var(--text2)", marginTop: 20 }}>
            Don't have an account?{" "}
            <span onClick={() => navigate("signup")} style={{ color: "var(--gold)", cursor: "pointer", fontWeight: 600 }}>Create one free</span>
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span onClick={() => navigate("admin-login")} style={{ fontSize: 11, color: "var(--text3)", cursor: "pointer", fontFamily: "var(--font-mono)", opacity: 0.4, transition: "opacity 0.2s" }}
            onMouseEnter={e => e.target.style.opacity = "0.8"} onMouseLeave={e => e.target.style.opacity = "0.4"}>● ● ●</span>
        </div>
      </div>
    </div>
  );
}