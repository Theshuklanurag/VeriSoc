import { useState, useEffect } from "react";
import { useAuth, usePage } from "../context/AppContext";
import { QuestionDB, NotificationDB } from "../utils/db";

export default function SupportPage() {
  const { user } = useAuth();
  const { navigate } = usePage();
  const [questions, setQuestions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState("questions"); // questions | notifications
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const [qs, ns] = await Promise.all([
      QuestionDB.getByUsername(user.username),
      NotificationDB.getByUsername(user.username),
    ]);
    setQuestions(qs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setNotifications(ns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user]);

  const markAllRead = async () => {
    await NotificationDB.markAllRead(user.username);
    refresh();
  };

  if (!user) return (
    <div style={{ minHeight: "calc(100vh - 72px)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
      <div className="card" style={{ textAlign: "center", padding: 48, maxWidth: 380 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: "var(--font-display)", marginBottom: 10 }}>Login Required</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24 }}>Please login to view your support history.</p>
        <button className="btn btn-primary" onClick={() => navigate("login")}>Login Now</button>
      </div>
    </div>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const statusColor = { open: "var(--warn)", answered: "var(--success)", closed: "var(--text3)" };
  const statusIcon = { open: "⏳", answered: "✅", closed: "🔒" };

  const catLabels = { general: "General", kyc: "KYC Process", documents: "Documents", digilocker: "DigiLocker", status: "Status Check", technical: "Technical" };

  return (
    <div className="page-wrapper">
      <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>My Support</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: "var(--cream)" }}>Questions & Notifications</h2>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--surface2)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {[
            ["questions", `📩 My Questions (${questions.length})`],
            ["notifications", `🔔 Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`],
          ].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, transition: "all 0.2s",
              background: tab === t ? "var(--gold)" : "transparent",
              color: tab === t ? "#0a0f0c" : "var(--text2)",
            }}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text2)" }}>Loading...</div>
        ) : (
          <>
            {/* QUESTIONS TAB */}
            {tab === "questions" && (
              <div>
                {questions.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: 60 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                    <div style={{ color: "var(--text2)", marginBottom: 16 }}>No questions submitted yet.</div>
                    <div style={{ fontSize: 13, color: "var(--text3)" }}>Use the 💬 chat button to ask questions — click "Ask Admin" tab.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {questions.map((q) => (
                      <div key={q.id} className="card" style={{ border: q.status === "answered" ? "1px solid rgba(79,192,110,0.3)" : "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{
                              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                              background: "var(--surface2)", color: "var(--gold)", border: "1px solid var(--border)",
                            }}>{catLabels[q.category] || q.category}</span>
                            <span style={{ fontSize: 12, color: statusColor[q.status], fontWeight: 600 }}>
                              {statusIcon[q.status]} {q.status?.toUpperCase()}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
                            {new Date(q.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>

                        <div style={{ fontWeight: 600, color: "var(--cream)", marginBottom: q.answer ? 12 : 0, fontSize: 15 }}>
                          {q.question}
                        </div>

                        {q.answer && (
                          <div style={{
                            marginTop: 12, padding: "14px 16px",
                            background: "rgba(79,192,110,0.06)",
                            border: "1px solid rgba(79,192,110,0.2)",
                            borderRadius: 10,
                          }}>
                            <div style={{ fontSize: 11, color: "var(--success)", fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)", letterSpacing: 1 }}>
                              ADMIN REPLY • {q.answeredBy} • {q.answeredAt ? new Date(q.answeredAt).toLocaleDateString("en-IN") : ""}
                            </div>
                            <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{q.answer}</div>
                          </div>
                        )}

                        {q.status === "open" && !q.answer && (
                          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text3)", fontStyle: "italic" }}>
                            Awaiting admin response. Typically within 24 hours.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {tab === "notifications" && (
              <div>
                {notifications.length > 0 && unreadCount > 0 && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                    <button onClick={markAllRead} className="btn btn-secondary" style={{ fontSize: 13, padding: "8px 16px" }}>
                      ✓ Mark All Read
                    </button>
                  </div>
                )}

                {notifications.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: 60 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔕</div>
                    <div style={{ color: "var(--text2)" }}>No notifications yet.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {notifications.map(n => (
                      <div key={n.id} style={{
                        padding: "14px 18px", borderRadius: 12,
                        background: n.read ? "var(--surface)" : "var(--surface2)",
                        border: `1px solid ${n.read ? "var(--border)" : "var(--border2)"}`,
                        display: "flex", alignItems: "flex-start", gap: 12,
                      }}>
                        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                          {n.type === "success" ? "✅" : n.type === "error" ? "❌" : "ℹ️"}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, color: n.read ? "var(--text2)" : "var(--cream)", lineHeight: 1.6 }}>{n.message}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                            {new Date(n.createdAt).toLocaleString("en-IN")}
                          </div>
                        </div>
                        {!n.read && (
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", flexShrink: 0, marginTop: 6 }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
