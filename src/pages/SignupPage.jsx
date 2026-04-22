import { useState } from "react";
import { useAuth, useToast, usePage } from "../context/AppContext";
import { UserDB } from "../utils/db";
import { supabase } from "../utils/supabase.js";

// Field OUTSIDE component — prevents cursor losing focus on every keystroke
const Field = ({ name, label, type = "text", placeholder, value, onChange, error }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input
      name={name} type={type} value={value} onChange={onChange}
      className={`form-input ${error ? "form-input-error" : ""}`}
      placeholder={placeholder}
      autoComplete={type === "password" ? "new-password" : name}
    />
    {error && <span className="form-error">⚠ {error}</span>}
  </div>
);

export default function SignupPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const { navigate } = usePage();

  const [form, setForm] = useState({ fullname: "", email: "", username: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.fullname.trim()) e.fullname = "Required";
    if (!form.email.includes("@")) e.email = "Valid email required";
    if (form.username.length < 3) e.username = "Min 3 characters";
    if (!/^\d{10}$/.test(form.phone)) e.phone = "Enter valid 10-digit phone";
    if (form.password.length < 8) e.password = "Min 8 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    await new Promise(r => setTimeout(r, 400));

    const result = await UserDB.create({
      fullname: form.fullname.trim(),
      email: form.email.trim(),
      username: form.username.trim(),
      phone: form.phone.trim(),
      password: form.password,
    });

    if (result.error) {
      setErrors({ general: result.error });
      setLoading(false);
      return;
    }

    login(result.user);
    addToast("Account created! Please complete your KYC verification.", "success");
    navigate("kyc");
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (err) {
      addToast("Google sign-up failed: " + err.message, "error");
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 72px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", zIndex: 1 }}>
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 700, height: 350, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(45,122,69,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))", border: "1px solid rgba(201,168,76,0.35)", margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: "0 0 30px rgba(201,168,76,0.15)" }}>🪪</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--cream)", marginBottom: 6 }}>Create Account</h1>
          <p style={{ color: "var(--text2)", fontSize: 15 }}>Join VeriSOC and verify your digital identity</p>
        </div>

        <div style={{ background: "linear-gradient(160deg, rgba(25,34,25,0.9) 0%, rgba(15,23,18,0.95) 100%)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 18, padding: "36px 32px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)", backdropFilter: "blur(20px)" }}>

          <button
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            style={{ width: "100%", padding: "12px 20px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--cream)", fontWeight: 600, fontSize: 14, fontFamily: "var(--font-body)", transition: "all 0.2s", marginBottom: 24 }}
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

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.1)" }} />
            <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)", letterSpacing: 2 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.1)" }} />
          </div>

          {errors.general && <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {errors.general}</div>}

          <form onSubmit={submit}>
            <div className="form-grid" style={{ marginBottom: 18 }}>
              <Field name="fullname" label="Full Name" placeholder="Anurag Shukla" value={form.fullname} onChange={handle} error={errors.fullname} />
              <Field name="username" label="Username" placeholder="anurag_s" value={form.username} onChange={handle} error={errors.username} />
              <Field name="email" label="Email Address" type="email" placeholder="you@email.com" value={form.email} onChange={handle} error={errors.email} />
              <Field name="phone" label="Phone Number" placeholder="9876543210" value={form.phone} onChange={handle} error={errors.phone} />
            </div>
            <div className="form-grid" style={{ marginBottom: 24 }}>
              <Field name="password" label="Password" type="password" placeholder="Min 8 characters" value={form.password} onChange={handle} error={errors.password} />
              <Field name="confirm" label="Confirm Password" type="password" placeholder="Repeat password" value={form.confirm} onChange={handle} error={errors.confirm} />
            </div>

            <div style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.1)", borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
              🔒 Your account is secured using Supabase Auth. Documents are stored in encrypted cloud storage.
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ fontSize: 15, padding: "13px", borderRadius: 12 }}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} />Creating account...</> : "Create Account & Start KYC →"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 14, color: "var(--text2)", marginTop: 20 }}>
            Already registered?{" "}
            <span onClick={() => navigate("login")} style={{ color: "var(--gold)", cursor: "pointer", fontWeight: 600 }}>Sign in</span>
          </p>
        </div>
      </div>
    </div>
  );
}