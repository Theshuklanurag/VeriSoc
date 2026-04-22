import { useEffect, useState, useCallback } from "react";
import { useAuth, usePage } from "../context/AppContext";
import { KycDB, DocumentDB, NotificationDB, subscribeToNotifications, subscribeToKycUpdates } from "../utils/db";

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const { navigate } = usePage();

  const [kyc, setKyc] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [docPreviews, setDocPreviews] = useState({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [k, ns] = await Promise.all([
        KycDB.findByUsername(user.username),
        NotificationDB.getByUsername(user.username),
      ]);
      setKyc(k);
      setNotifications(ns.filter(n => !n.read).slice(0, 5));

      // Load signed URLs from Supabase Storage
      if (k) {
        const [idProofUrl, selfieUrl] = await Promise.all([
          k.idProofPath ? DocumentDB.getSignedUrl(k.idProofPath) : DocumentDB.getPreviewUrl(user.username, 'id_proof'),
          k.selfiePath  ? DocumentDB.getSignedUrl(k.selfiePath)  : DocumentDB.getPreviewUrl(user.username, 'selfie'),
        ]);
        setDocPreviews({ idProof: idProofUrl, selfie: selfieUrl });
      }
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
    if (!user) return;

    // ─── Realtime: new notifications ────────────────────────────────────────
    const notifSub = subscribeToNotifications(user.username, (newNotif) => {
      setNotifications(prev => [newNotif, ...prev].slice(0, 5));
    });

    // ─── Realtime: KYC status changes ───────────────────────────────────────
    const kycSub = subscribeToKycUpdates(user.username, async (updatedKyc) => {
      setKyc(updatedKyc);
      await refreshUser(user.username); // update session with new kycStatus
    });

    return () => {
      notifSub.unsubscribe();
      kycSub.unsubscribe();
    };
  }, [user, loadData]);

  const dismissNotif = async (id) => {
    await NotificationDB.markRead(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!user) return (
    <div style={{ minHeight: "calc(100vh - 72px)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
      <div className="card" style={{ textAlign: "center", padding: 48, maxWidth: 380 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: "var(--font-display)", marginBottom: 10 }}>Login Required</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24 }}>Please login to view your dashboard.</p>
        <button className="btn btn-primary" onClick={() => navigate("login")}>Login</button>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: "calc(100vh - 72px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text2)", fontFamily: "var(--font-mono)" }}>Loading dashboard...</div>
    </div>
  );

  const statusBadge = {
    not_submitted: <span className="badge badge-not_submitted"><span className="badge-dot" />Not Submitted</span>,
    submitted:     <span className="badge badge-submitted"><span className="badge-dot" />Under Review</span>,
    approved:      <span className="badge badge-verified"><span className="badge-dot" />Verified ✓</span>,
    rejected:      <span className="badge badge-rejected"><span className="badge-dot" />Rejected</span>,
  }[user.kycStatus] || null;

  const trustScore = user.kycStatus === "approved" ? (user.digilockerLinked ? 99 : 95) : user.kycStatus === "submitted" ? 50 : 10;
  const fl = { fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text3)", marginBottom: 5, letterSpacing: 1.5, textTransform: "uppercase" };
  const vl = { fontWeight: 500, color: "var(--cream)" };

  return (
    <div className="page-wrapper">
      <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Your Dashboard</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--cream)" }}>
              Welcome, {user.fullname?.split(" ")[0] || user.username}
            </h2>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {user.digilockerLinked && (
              <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(41,128,185,0.15)", color: "#5dade2", border: "1px solid rgba(41,128,185,0.3)" }}>📁 DigiLocker Linked</span>
            )}
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(79,192,110,0.08)", color: "var(--success)", border: "1px solid rgba(79,192,110,0.2)" }}>
              🟢 Supabase Connected
            </span>
            {statusBadge}
          </div>
        </div>

        {/* Live Notifications */}
        {notifications.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {notifications.map(n => (
              <div key={n.id} style={{
                padding: "12px 16px", borderRadius: 10, marginBottom: 8,
                background: n.type === "success" ? "rgba(79,192,110,0.08)" : n.type === "error" ? "rgba(201,76,76,0.08)" : "rgba(201,168,76,0.08)",
                border: `1px solid ${n.type === "success" ? "rgba(79,192,110,0.25)" : n.type === "error" ? "rgba(201,76,76,0.25)" : "rgba(201,168,76,0.2)"}`,
                display: "flex", alignItems: "center", gap: 10, fontSize: 13,
              }}>
                <span>{n.type === "success" ? "✅" : n.type === "error" ? "❌" : "ℹ️"}</span>
                <span style={{ flex: 1, color: "var(--text)" }}>{n.message}</span>
                <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>{new Date(n.created_at || n.createdAt).toLocaleDateString("en-IN")}</span>
                <button onClick={() => dismissNotif(n.id)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
          <div className="stat-card"><div className="stat-label">Trust Score</div><div className="stat-value stat-gold">{trustScore}</div></div>
          <div className="stat-card"><div className="stat-label">KYC Status</div><div style={{ marginTop: 10 }}>{statusBadge}</div></div>
          <div className="stat-card"><div className="stat-label">Database</div><div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: "var(--success)" }}>🟢 Supabase</div></div>
          <div className="stat-card"><div className="stat-label">DigiLocker</div><div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: user.digilockerLinked ? "#5dade2" : "var(--text3)" }}>{user.digilockerLinked ? "📁 Linked" : "Not Linked"}</div></div>
        </div>

        {/* Profile */}
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Profile Information</span>
            {!user.digilockerLinked && (
              <button onClick={() => navigate("digilocker")} style={{ padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(41,128,185,0.4)", background: "rgba(41,128,185,0.1)", color: "#5dade2", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-body)" }}>📁 Link DigiLocker</button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            {[["Full Name", user.fullname], ["Username", "@" + user.username], ["Email", user.email], ["Phone", user.phone || "—"]].map(([l, v]) => (
              <div key={l}><div style={fl}>{l}</div><div style={vl}>{v}</div></div>
            ))}
          </div>
        </div>

        {/* KYC Details */}
        {kyc && (
          <div className="card" style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>KYC Submission</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {kyc.digilockerVerified && <span style={{ fontSize: 11, color: "#5dade2", background: "rgba(41,128,185,0.1)", padding: "2px 10px", borderRadius: 20, border: "1px solid rgba(41,128,185,0.3)" }}>📁 DigiLocker Verified</span>}
                <span className={`badge badge-${kyc.status === "approved" ? "verified" : kyc.status === "rejected" ? "rejected" : "submitted"}`}>
                  <span className="badge-dot" />{kyc.status}
                </span>
              </div>
            </div>

            {kyc.kycCode && (
              <div style={{ marginBottom: 20 }}>
                <div style={fl}>Your KYC Code</div>
                <div className="kyc-code-display">{kyc.kycCode}</div>
              </div>
            )}

            {/* Supabase Storage document previews */}
            {(docPreviews.idProof || docPreviews.selfie) && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ ...fl, marginBottom: 12 }}>Uploaded Documents <span style={{ color: "var(--success)", fontWeight: 700 }}>• Stored in Supabase</span></div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {docPreviews.idProof && (
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>ID Proof</div>
                      <img src={docPreviews.idProof} alt="ID Proof" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", maxHeight: 160, objectFit: "contain", background: "var(--surface2)" }} />
                    </div>
                  )}
                  {docPreviews.selfie && (
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>Selfie</div>
                      <img src={docPreviews.selfie} alt="Selfie" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", maxHeight: 160, objectFit: "cover", background: "var(--surface2)" }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 20 }}>
              {[
                ["Primary ID", kyc.primaryIdType], ["Primary ID No.", kyc.primaryIdNumber],
                ["Secondary ID", kyc.secondaryIdType], ["Secondary ID No.", kyc.secondaryIdNumber],
                ["City / State", `${kyc.city || "—"}, ${kyc.state || "—"}`],
                ["Submitted On", kyc.submittedAt ? new Date(kyc.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"],
                ...(kyc.reviewedAt ? [["Reviewed On", new Date(kyc.reviewedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })]] : []),
                ...(kyc.adminNotes ? [["Admin Notes", kyc.adminNotes]] : []),
              ].map(([l, v]) => (
                <div key={l}><div style={fl}>{l}</div><div style={vl}>{v || "—"}</div></div>
              ))}
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text3)", letterSpacing: 1 }}>TRUST SCORE</span>
                <span style={{ color: "var(--gold)", fontWeight: 700 }}>{trustScore} / 100</span>
              </div>
              <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${trustScore}%`, background: "linear-gradient(90deg, var(--gold), var(--success))", borderRadius: 3, transition: "width 1s ease" }} />
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
          <button onClick={() => navigate("support")} className="card" style={{ padding: 20, textAlign: "left", cursor: "pointer", border: "1px solid var(--border)", background: "var(--surface)", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border2)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📩</div>
            <div style={{ fontWeight: 700, color: "var(--cream)", marginBottom: 4 }}>Support & Q&A</div>
            <div style={{ fontSize: 13, color: "var(--text3)" }}>Ask questions, view admin answers</div>
          </button>
          {!user.digilockerLinked && (
            <button onClick={() => navigate("digilocker")} className="card" style={{ padding: 20, textAlign: "left", cursor: "pointer", border: "1px solid rgba(41,128,185,0.3)", background: "rgba(41,128,185,0.05)", transition: "all 0.2s" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
              <div style={{ fontWeight: 700, color: "#5dade2", marginBottom: 4 }}>Link DigiLocker</div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>Aadhaar-based instant verification</div>
            </button>
          )}
          {user.kycStatus === "not_submitted" && (
            <button onClick={() => navigate("kyc")} className="card" style={{ padding: 20, textAlign: "left", cursor: "pointer", border: "1px solid var(--border2)", background: "rgba(201,168,76,0.04)", transition: "all 0.2s" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🪪</div>
              <div style={{ fontWeight: 700, color: "var(--gold)", marginBottom: 4 }}>Start KYC</div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>Verify your identity now</div>
            </button>
          )}
        </div>

        {user.kycStatus === "not_submitted" && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🪪</div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 10 }}>Complete Your KYC</h3>
            <p style={{ color: "var(--text2)", marginBottom: 28, maxWidth: 400, margin: "0 auto 28px" }}>Verify your identity to unlock all platform features and earn your VeriSOC trust badge.</p>
            <button className="btn btn-primary" onClick={() => navigate("kyc")} style={{ fontSize: 16, padding: "13px 36px" }}>Start KYC Verification →</button>
          </div>
        )}

        {user.kycStatus === "rejected" && (
          <div className="alert alert-error" style={{ padding: 20 }}>
            ❌ Your KYC was rejected. {kyc?.adminNotes && `Reason: ${kyc.adminNotes}`} Please{" "}
            <span onClick={() => navigate("kyc")} style={{ color: "var(--gold)", cursor: "pointer", fontWeight: 600 }}>re-submit your KYC</span>{" "}with correct documents.
          </div>
        )}
      </div>
    </div>
  );
}
