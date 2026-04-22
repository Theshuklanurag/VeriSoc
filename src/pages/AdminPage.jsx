import { useState, useEffect } from "react";
import { useAuth, usePage, useToast } from "../context/AppContext";
import { KycDB, QuestionDB, DocumentDB, UserDB, NotificationDB } from "../utils/db";

export default function AdminPage() {
  const { user } = useAuth();
  const { navigate } = usePage();
  const { addToast } = useToast();

  const [adminTab, setAdminTab] = useState("dashboard");
  const [kycs, setKycs]         = useState([]);
  const [questions, setQuestions] = useState([]);
  const [users, setUsers]       = useState([]);
  const [stats, setStats]       = useState({});
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");
  const [selected, setSelected] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [selectedQ, setSelectedQ] = useState(null);
  const [answerInput, setAnswerInput] = useState("");
  const [docPreviews, setDocPreviews] = useState({});

  const refreshAll = async () => {
    const [ks, qs, us, st] = await Promise.all([
      KycDB.getAll(), QuestionDB.getAll(), UserDB.getAll(), KycDB.getStats(),
    ]);
    setKycs(ks.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)));
    setQuestions(qs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setUsers(us.filter(u => u.role !== "admin").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setStats(st);
  };

  useEffect(() => { refreshAll(); }, []);

  useEffect(() => {
    if (selected) loadDocPreviews(selected.username);
  }, [selected]);

  const loadDocPreviews = async (username) => {
    const [idProof, selfie] = await Promise.all([
      DocumentDB.getPreviewUrl(username, "id_proof"),
      DocumentDB.getPreviewUrl(username, "selfie"),
    ]);
    setDocPreviews({ idProof, selfie });
  };

  if (!user || user.role !== "admin") return (
    <div style={{ minHeight: "calc(100vh - 72px)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
      <div className="card" style={{ textAlign: "center", padding: 48, maxWidth: 380 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⛔</div>
        <h2 style={{ fontFamily: "var(--font-display)", marginBottom: 10 }}>Access Denied</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24 }}>Admin credentials required.</p>
        <button className="btn btn-primary" onClick={() => navigate("admin-login")}>Admin Login</button>
      </div>
    </div>
  );

  const approve = async (username) => {
    await KycDB.updateStatus(username, "approved", noteInput, user.username);
    addToast(`KYC approved for @${username}`, "success");
    setSelected(null); setNoteInput(""); refreshAll();
  };

  const reject = async (username) => {
    if (!noteInput.trim()) { addToast("Please provide a rejection reason.", "error"); return; }
    await KycDB.updateStatus(username, "rejected", noteInput, user.username);
    addToast(`KYC rejected for @${username}`, "error");
    setSelected(null); setNoteInput(""); refreshAll();
  };

  const toggleFlag = async (username, current) => {
    await KycDB.flagSuspicious(username, !current);
    addToast(current ? "Flag removed" : "Marked suspicious", "info");
    refreshAll();
  };

  const answerQuestion = async () => {
    if (!answerInput.trim()) { addToast("Please write an answer.", "error"); return; }
    await QuestionDB.answer(selectedQ.id, answerInput.trim(), user.username);
    addToast("Answer sent to user!", "success");
    setSelectedQ(null); setAnswerInput(""); refreshAll();
  };

  const exportCSV = async () => {
    const csv = await KycDB.exportCSV();
    if (!csv) { addToast("No data to export.", "info"); return; }
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `VeriSOC_KYC_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    addToast("CSV exported!", "success");
  };

  const filtered = kycs.filter(k => {
    const q = search.toLowerCase();
    const ms = !q || k.fullname?.toLowerCase().includes(q) || k.username?.toLowerCase().includes(q) || k.kycCode?.toLowerCase().includes(q);
    const mf = filter === "all" || k.status === filter || (filter === "flagged" && k.suspicious);
    return ms && mf;
  });

  const openQuestions = questions.filter(q => q.status === "open");
  const FILTERS = ["all", "pending", "approved", "rejected", "flagged"];

  const tabStyle = (t) => ({
    flex: 1, padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer",
    fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, transition: "all 0.2s",
    background: adminTab === t ? "var(--gold)" : "transparent",
    color: adminTab === t ? "#0a0f0c" : "var(--text2)",
    position: "relative",
  });

  return (
    <div className="page-wrapper">
      <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Administrator Portal</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: "var(--cream)" }}>Admin Dashboard</h2>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-secondary" onClick={exportCSV} style={{ fontSize: 13, padding: "9px 16px" }}>📄 Export CSV</button>
            <button className="btn btn-secondary" onClick={refreshAll} style={{ fontSize: 13, padding: "9px 16px" }}>↻ Refresh</button>
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 28 }}>
          {[
            ["Total KYC",  stats.total,           "stat-gold"],
            ["Pending",    stats.pending,          "stat-blue"],
            ["Approved",   stats.approved,         "stat-green"],
            ["Rejected",   stats.rejected,         "stat-red"],
            ["Flagged",    stats.flagged,           "stat-cream"],
            ["Open Q&A",   openQuestions.length,   "stat-blue"],
            ["Users",      users.length,           "stat-gold"],
          ].map(([l, v, c]) => (
            <div className="stat-card" key={l}>
              <div className="stat-label">{l}</div>
              <div className={`stat-value ${c}`}>{v ?? 0}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 12, padding: 4 }}>
          <button style={tabStyle("dashboard")} onClick={() => setAdminTab("dashboard")}>📊 Dashboard</button>
          <button style={tabStyle("kyc")} onClick={() => setAdminTab("kyc")}>🪪 KYC ({kycs.length})</button>
          <button style={tabStyle("messages")} onClick={() => setAdminTab("messages")}>
            💬 Messages
            {openQuestions.length > 0 && (
              <span style={{ position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: "50%", background: "var(--danger)", color: "white", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {openQuestions.length}
              </span>
            )}
          </button>
          <button style={tabStyle("users")} onClick={() => setAdminTab("users")}>👥 Users ({users.length})</button>
        </div>

        {/* ── DASHBOARD TAB ──────────────────────────────────────────────── */}
        {adminTab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {/* Recent KYC */}
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--cream)", marginBottom: 16 }}>🪪 Recent KYC Submissions</div>
              {kycs.length === 0 ? (
                <p style={{ color: "var(--text3)", fontSize: 13 }}>No submissions yet.</p>
              ) : (
                kycs.slice(0, 5).map((k, i) => (
                  <div key={i} onClick={() => { setAdminTab("kyc"); setSelected(k); setNoteInput(k.adminNotes || ""); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cream)" }}>{k.fullname}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>@{k.username}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: k.status === "approved" ? "rgba(79,192,110,0.12)" : k.status === "rejected" ? "rgba(201,76,76,0.12)" : "rgba(201,154,45,0.12)", color: k.status === "approved" ? "var(--success)" : k.status === "rejected" ? "var(--danger)" : "var(--warn)" }}>
                      {k.status}
                    </span>
                  </div>
                ))
              )}
              {kycs.length > 5 && (
                <button onClick={() => setAdminTab("kyc")} style={{ marginTop: 12, background: "none", border: "none", color: "var(--gold)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)" }}>View all {kycs.length} →</button>
              )}
            </div>

            {/* Open Questions */}
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--cream)", marginBottom: 16 }}>💬 Open Questions ({openQuestions.length})</div>
              {openQuestions.length === 0 ? (
                <p style={{ color: "var(--text3)", fontSize: 13 }}>No open questions.</p>
              ) : (
                openQuestions.slice(0, 5).map((q, i) => (
                  <div key={i} onClick={() => { setAdminTab("messages"); setSelectedQ(q); setAnswerInput(""); }} style={{ padding: "10px 0", borderBottom: i < Math.min(openQuestions.length, 5) - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
                    <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 3 }}>@{q.username} • {q.category}</div>
                    <div style={{ fontSize: 13, color: "var(--cream)" }}>{q.question.substring(0, 70)}{q.question.length > 70 ? "..." : ""}</div>
                  </div>
                ))
              )}
              {openQuestions.length > 5 && (
                <button onClick={() => setAdminTab("messages")} style={{ marginTop: 12, background: "none", border: "none", color: "var(--gold)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)" }}>View all →</button>
              )}
            </div>

            {/* Recent Users */}
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--cream)", marginBottom: 16 }}>👥 Recent Users</div>
              {users.length === 0 ? (
                <p style={{ color: "var(--text3)", fontSize: 13 }}>No users yet.</p>
              ) : (
                users.slice(0, 5).map((u, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cream)" }}>{u.fullname}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>@{u.username}</div>
                    </div>
                    <span style={{ fontSize: 11, color: u.kycStatus === "approved" ? "var(--success)" : "var(--text3)" }}>
                      {u.kycStatus?.replace("_", " ")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── KYC TAB ────────────────────────────────────────────────────── */}
        {adminTab === "kyc" && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <input className="form-input" placeholder="Search name, username, KYC code..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", background: filter === f ? "var(--gold)" : "transparent", color: filter === f ? "#0a0f0c" : "var(--text2)", border: filter === f ? "none" : "1px solid var(--border)" }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {selected && (
              <div className="card" style={{ marginBottom: 24, border: "1px solid var(--border2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--cream)" }}>{selected.fullname}</h3>
                    <span style={{ fontSize: 13, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>@{selected.username}</span>
                  </div>
                  <button onClick={() => { setSelected(null); setNoteInput(""); setDocPreviews({}); }} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 22, cursor: "pointer" }}>✕</button>
                </div>

                <div className="kyc-code-display" style={{ marginBottom: 20 }}>{selected.kycCode}</div>

                {(docPreviews.idProof || docPreviews.selfie) && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Uploaded Documents</div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {docPreviews.idProof && (
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>ID Proof: {selected.idProofFileName}</div>
                          <img src={docPreviews.idProof} alt="ID Proof" style={{ width: "100%", borderRadius: 10, border: "1px solid var(--border)", maxHeight: 200, objectFit: "contain", background: "var(--surface2)" }} />
                        </div>
                      )}
                      {docPreviews.selfie && (
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>Selfie: {selected.selfieFileName}</div>
                          <img src={docPreviews.selfie} alt="Selfie" style={{ width: "100%", borderRadius: 10, border: "1px solid var(--border)", maxHeight: 200, objectFit: "contain", background: "var(--surface2)" }} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
                  {[
                    ["DOB", selected.dob], ["Gender", selected.gender],
                    ["Phone", selected.phone], ["City", selected.city],
                    ["State", selected.state], ["PIN Code", selected.pincode],
                    ["Address", selected.address],
                    ["Primary ID", `${selected.primaryIdType?.toUpperCase()} — ${selected.primaryIdNumber}`],
                    ["Secondary ID", `${selected.secondaryIdType?.toUpperCase()} — ${selected.secondaryIdNumber}`],
                    ["Submitted", selected.submittedAt ? new Date(selected.submittedAt).toLocaleString("en-IN") : "—"],
                    ...(selected.reviewedAt ? [["Reviewed", new Date(selected.reviewedAt).toLocaleString("en-IN")]] : []),
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div className="stat-label">{l}</div>
                      <div style={{ fontSize: 14, color: "var(--cream)", fontWeight: 500 }}>{v || "—"}</div>
                    </div>
                  ))}
                </div>

                {selected.status === "pending" && (
                  <div>
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label className="form-label">Admin Notes (required for rejection)</label>
                      <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} className="form-input" rows={2} placeholder="Notes or rejection reason..." style={{ resize: "vertical" }} />
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="action-btn ab-approve" onClick={() => approve(selected.username)} style={{ padding: "9px 20px", fontSize: 13 }}>✓ Approve</button>
                      <button className="action-btn ab-reject" onClick={() => reject(selected.username)} style={{ padding: "9px 20px", fontSize: 13 }}>✗ Reject</button>
                      <button className="action-btn ab-flag" onClick={() => toggleFlag(selected.username, selected.suspicious)} style={{ padding: "9px 20px", fontSize: 13 }}>
                        {selected.suspicious ? "⚐ Unflag" : "⚑ Flag Suspicious"}
                      </button>
                    </div>
                  </div>
                )}
                {selected.status !== "pending" && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {selected.adminNotes && <div className="alert alert-info" style={{ flex: 1 }}>💬 {selected.adminNotes}</div>}
                    <button className="action-btn ab-flag" onClick={() => toggleFlag(selected.username, selected.suspicious)} style={{ padding: "9px 16px", fontSize: 13 }}>
                      {selected.suspicious ? "⚐ Unflag" : "⚑ Flag"}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="card" style={{ overflowX: "auto", padding: 0 }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60, color: "var(--text2)" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <p>No submissions found.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>KYC Code</th><th>Name</th><th>Username</th>
                      <th>Primary ID</th><th>Submitted</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((k, i) => (
                      <tr key={i} style={{ cursor: "pointer" }} onClick={() => { setSelected(k); setNoteInput(k.adminNotes || ""); }}>
                        <td><span className="mono" style={{ fontSize: 11 }}>{k.kycCode}</span></td>
                        <td>{k.fullname}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>@{k.username}</td>
                        <td style={{ textTransform: "capitalize" }}>{k.primaryIdType}</td>
                        <td>{k.submittedAt ? new Date(k.submittedAt).toLocaleDateString("en-IN") : "—"}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: k.status === "approved" ? "rgba(79,192,110,0.12)" : k.status === "rejected" ? "rgba(201,76,76,0.12)" : "rgba(201,154,45,0.12)", color: k.status === "approved" ? "var(--success)" : k.status === "rejected" ? "var(--danger)" : "var(--warn)" }}>
                            {k.status}
                          </span>
                          {k.suspicious && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--danger)" }}>⚑</span>}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          {k.status === "pending" && (
                            <>
                              <button className="action-btn ab-approve" onClick={async () => { await KycDB.updateStatus(k.username, "approved", "", user.username); addToast(`Approved @${k.username}`, "success"); refreshAll(); }}>✓</button>
                              <button className="action-btn ab-reject" onClick={() => { setSelected(k); setNoteInput(""); }}>✗</button>
                            </>
                          )}
                          {k.status !== "pending" && (
                            <button className="action-btn ab-flag" onClick={() => toggleFlag(k.username, k.suspicious)}>
                              {k.suspicious ? "Unflag" : "Flag"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── MESSAGES TAB ───────────────────────────────────────────────── */}
        {adminTab === "messages" && (
          <div>
            {selectedQ && (
              <div className="card" style={{ marginBottom: 20, border: "1px solid var(--border2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>From @{selectedQ.username} • {selectedQ.fullname} • {selectedQ.category}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--cream)" }}>{selectedQ.question}</div>
                  </div>
                  <button onClick={() => { setSelectedQ(null); setAnswerInput(""); }} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 20, cursor: "pointer" }}>✕</button>
                </div>
                {selectedQ.answer && (
                  <div style={{ padding: "12px 16px", background: "rgba(79,192,110,0.06)", border: "1px solid rgba(79,192,110,0.2)", borderRadius: 10, marginBottom: 14, fontSize: 13, color: "var(--success)" }}>
                    ✅ Previous answer: {selectedQ.answer}
                  </div>
                )}
                <textarea
                  value={answerInput}
                  onChange={e => setAnswerInput(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={4}
                  className="form-input"
                  style={{ resize: "vertical", marginBottom: 12, width: "100%" }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-primary" onClick={answerQuestion} style={{ fontSize: 13 }}>📩 Send Answer</button>
                  <button className="btn btn-secondary" onClick={() => { setSelectedQ(null); setAnswerInput(""); }} style={{ fontSize: 13 }}>Cancel</button>
                </div>
              </div>
            )}

            {questions.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <p style={{ color: "var(--text2)" }}>No questions submitted yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {questions.map(q => (
                  <div
                    key={q.id}
                    className="card"
                    style={{ cursor: "pointer", border: q.status === "open" ? "1px solid var(--border2)" : "1px solid var(--border)", transition: "all 0.2s" }}
                    onClick={() => { setSelectedQ(q); setAnswerInput(q.answer || ""); }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "var(--surface2)", color: "var(--gold)", border: "1px solid var(--border)" }}>{q.category}</span>
                          <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>@{q.username}</span>
                          <span style={{ fontSize: 11, color: "var(--text3)" }}>{new Date(q.createdAt).toLocaleDateString("en-IN")}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--cream)", marginBottom: q.answer ? 6 : 0 }}>{q.question}</div>
                        {q.answer && (
                          <div style={{ fontSize: 13, color: "var(--success)" }}>✅ {q.answer.substring(0, 100)}{q.answer.length > 100 ? "..." : ""}</div>
                        )}
                      </div>
                      <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0, background: q.status === "open" ? "rgba(201,154,45,0.12)" : "rgba(79,192,110,0.12)", color: q.status === "open" ? "var(--warn)" : "var(--success)", border: `1px solid ${q.status === "open" ? "rgba(201,154,45,0.3)" : "rgba(79,192,110,0.3)"}` }}>
                        {q.status === "open" ? "⏳ Open" : "✅ Answered"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── USERS TAB ──────────────────────────────────────────────────── */}
        {adminTab === "users" && (
          <div className="card" style={{ overflowX: "auto", padding: 0 }}>
            {users.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "var(--text2)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                <p>No registered users yet.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Full Name</th><th>Username</th><th>Email</th>
                    <th>Phone</th><th>KYC Status</th><th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={i}>
                      <td>{u.fullname}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>@{u.username}</td>
                      <td style={{ fontSize: 13 }}>{u.email}</td>
                      <td>{u.phone || "—"}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: u.kycStatus === "approved" ? "rgba(79,192,110,0.12)" : u.kycStatus === "submitted" ? "rgba(201,154,45,0.12)" : "rgba(100,100,100,0.12)", color: u.kycStatus === "approved" ? "var(--success)" : u.kycStatus === "submitted" ? "var(--warn)" : "var(--text3)" }}>
                          {u.kycStatus?.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}