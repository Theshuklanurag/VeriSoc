import { useState } from "react";
import { useAuth, useToast, usePage } from "../context/AppContext";
import { KycDB } from "../utils/db";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir",
  "Ladakh","Puducherry","Chandigarh","Lakshadweep","Dadra & Nagar Haveli",
];

const ID_TYPES = [
  { value: "aadhaar",  label: "Aadhaar Card",   hint: "12-digit Aadhaar number" },
  { value: "pan",      label: "PAN Card",        hint: "10-character PAN (e.g. ABCDE1234F)" },
  { value: "passport", label: "Passport",        hint: "8-character passport number" },
  { value: "driving",  label: "Driving License", hint: "State code + number" },
  { value: "voter",    label: "Voter ID",        hint: "Epic number on your voter card" },
];

const STEPS = ["Personal", "Contact", "Primary ID", "Secondary ID", "Documents", "Review"];

// Bug 16: ID number format validators
const ID_VALIDATORS = {
  aadhaar:  { regex: /^\d{12}$/,                    msg: "Must be exactly 12 digits" },
  pan:      { regex: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, msg: "Format: ABCDE1234F (uppercase)" },
  passport: { regex: /^[A-Z][0-9]{7}$/,             msg: "Format: A1234567 (1 letter + 7 digits)" },
  driving:  { regex: /^[A-Z]{2}\d{2,3}[A-Z0-9]{7,11}$/, msg: "State code + number (e.g. UP322006123456)" },
  voter:    { regex: /^[A-Z]{3}[0-9]{7}$/,           msg: "Format: ABC1234567 (3 letters + 7 digits)" },
};

const F = ({ name, label, type = "text", placeholder, children, value, onChange, error }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    {children || (
      <input name={name} type={type} value={value} onChange={onChange}
        className={`form-input ${error ? "form-input-error" : ""}`}
        placeholder={placeholder} />
    )}
    {error && <span className="form-error">⚠ {error}</span>}
  </div>
);

const FileZone = ({ field, label, icon, hint, value, onSet, error }) => (
  <div className="form-group full">
    <label className="form-label">{label}</label>
    <label className={`file-upload-zone ${error ? "form-input-error" : ""}`}>
      <input type="file" accept={field === "selfieFile" ? "image/*" : ".jpg,.jpeg,.png,.pdf"}
        onChange={e => { if (e.target.files[0]) onSet(field, e.target.files[0]); }} />
      <div className="file-upload-icon">{icon}</div>
      <div className="file-upload-text">Click to upload or drag & drop</div>
      <div className="file-upload-hint">{hint}</div>
      {value && <div className="file-name">✓ {value.name}</div>}
    </label>
    {error && <span className="form-error">⚠ {error}</span>}
  </div>
);

export default function KycPage() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const { navigate } = usePage();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [kycCode, setKycCode] = useState(null);

  const [data, setData] = useState({
    fullname: user?.fullname || "", dob: "", gender: "",
    address: "", city: "", state: "", pincode: "", phone: user?.phone || "",
    primaryIdType: "", primaryIdNumber: "",
    secondaryIdType: "", secondaryIdNumber: "",
    aadhaarNumber: "", panNumber: "", passportNumber: "", drivingLicense: "", voterId: "",
    idProofFile: null, selfieFile: null,
  });
  const [errors, setErrors] = useState({});

  if (!user) return (
    <div style={{ minHeight: "calc(100vh - 72px)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
      <div className="card" style={{ textAlign: "center", padding: 48, maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: "var(--font-display)", marginBottom: 10 }}>Login Required</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24 }}>Please login to access KYC verification.</p>
        <button className="btn btn-primary" onClick={() => navigate("login")}>Login Now</button>
      </div>
    </div>
  );

  if (kycCode) return (
    <div style={{ minHeight: "calc(100vh - 72px)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
      <div className="card" style={{ textAlign: "center", padding: 48, maxWidth: 480 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginBottom: 8, color: "var(--cream)" }}>KYC Submitted!</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24, fontSize: 15 }}>Your KYC application is now under admin review.</p>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text3)", marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>Your Unique KYC Code</div>
          <div className="kyc-code-display">{kycCode}</div>
          <p style={{ fontSize: 13, color: "var(--text3)" }}>Save this code to track your verification status.</p>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="btn btn-secondary" onClick={() => { navigator.clipboard?.writeText(kycCode); addToast("KYC Code copied!", "success"); }}>Copy Code</button>
          <button className="btn btn-primary" onClick={() => navigate("dashboard")}>Go to Dashboard</button>
        </div>
      </div>
    </div>
  );

  if (user.kycStatus === "submitted" || user.kycStatus === "approved") return (
    <div style={{ minHeight: "calc(100vh - 72px)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
      <div className="card" style={{ textAlign: "center", padding: 48, maxWidth: 440 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{user.kycStatus === "approved" ? "🏆" : "⏳"}</div>
        <h2 style={{ fontFamily: "var(--font-display)", marginBottom: 10 }}>{user.kycStatus === "approved" ? "Already Verified" : "Under Review"}</h2>
        <p style={{ color: "var(--text2)", marginBottom: 24 }}>{user.kycStatus === "approved" ? "Your identity is already verified. No further action needed." : "Your KYC is being reviewed. You'll be notified once processed."}</p>
        <button className="btn btn-primary" onClick={() => navigate("dashboard")}>View Dashboard</button>
      </div>
    </div>
  );

  const set = (field, value) => setData(d => ({ ...d, [field]: value }));
  const handle = e => set(e.target.name, e.target.value);
  const availableSecondary = ID_TYPES.filter(t => t.value !== data.primaryIdType);

  // Bug 16 fixed: ID format validation
  const validateIdNumber = (idType, idNumber) => {
    if (!idType || !idNumber) return null;
    const v = ID_VALIDATORS[idType];
    if (!v) return null;
    return v.regex.test(idNumber.trim().toUpperCase()) ? null : v.msg;
  };

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!data.fullname.trim()) e.fullname = "Required";
      if (!data.dob) e.dob = "Required";
      if (!data.gender) e.gender = "Required";
      if (!data.address.trim()) e.address = "Required";
    }
    if (step === 1) {
      if (!data.city.trim()) e.city = "Required";
      if (!data.state) e.state = "Required";
      if (!/^\d{6}$/.test(data.pincode)) e.pincode = "6-digit PIN required";
      if (!/^\d{10}$/.test(data.phone)) e.phone = "10-digit number required";
    }
    if (step === 2) {
      if (!data.primaryIdType) e.primaryIdType = "Select an ID type";
      if (!data.primaryIdNumber.trim()) {
        e.primaryIdNumber = "Enter ID number";
      } else {
        const fmt = validateIdNumber(data.primaryIdType, data.primaryIdNumber);
        if (fmt) e.primaryIdNumber = fmt;
      }
    }
    if (step === 3) {
      if (!data.secondaryIdType) e.secondaryIdType = "Select a different ID type";
      if (!data.secondaryIdNumber.trim()) {
        e.secondaryIdNumber = "Enter ID number";
      } else {
        const fmt = validateIdNumber(data.secondaryIdType, data.secondaryIdNumber);
        if (fmt) e.secondaryIdNumber = fmt;
      }
    }
    if (step === 4) {
      if (!data.idProofFile) e.idProofFile = "Upload required";
      if (!data.selfieFile) e.selfieFile = "Upload required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const back = () => { setErrors({}); setStep(s => s - 1); };

  // Bug 6 fixed: removed digilockerVerified and digilockerData from payload
  const submit = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    const result = await KycDB.submit({
      username:          user.username,
      fullname:          data.fullname,
      dob:               data.dob,
      gender:            data.gender,
      address:           data.address,
      city:              data.city,
      state:             data.state,
      pincode:           data.pincode,
      phone:             data.phone,
      primaryIdType:     data.primaryIdType,
      primaryIdNumber:   data.primaryIdNumber.trim().toUpperCase(),
      secondaryIdType:   data.secondaryIdType,
      secondaryIdNumber: data.secondaryIdNumber.trim().toUpperCase(),
      aadhaarNumber:     data.aadhaarNumber,
      panNumber:         data.panNumber,
      passportNumber:    data.passportNumber,
      drivingLicense:    data.drivingLicense,
      voterId:           data.voterId,
      idProofFile:       data.idProofFile,
      selfieFile:        data.selfieFile,
      idProofFileName:   data.idProofFile?.name || "",
      selfieFileName:    data.selfieFile?.name || "",
    });
    if (result.error) {
      addToast(result.error, "error");
      setSubmitting(false);
      return;
    }
    await refreshUser(user.username);
    setKycCode(result.kycCode);
    setSubmitting(false);
  };

  const idHint = (type) => ID_TYPES.find(t => t.value === type)?.hint || "";

  return (
    <div className="page-wrapper">
      <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="section-header-center" style={{ marginBottom: 40 }}>
          <span className="section-eyebrow">Identity Verification</span>
          <h2 className="section-title">KYC Verification Form</h2>
          <p className="section-subtitle">Provide your details and government ID documents to verify your identity.</p>
        </div>

        <div className="progress-track" style={{ maxWidth: 720, margin: "0 auto 36px" }}>
          {STEPS.map((s, i) => (
            <div key={s} className={`progress-step-item ${i === step ? "active" : i < step ? "done" : ""}`}>
              {i < step ? "✓ " : ""}{s}
            </div>
          ))}
        </div>

        <div className="card" style={{ maxWidth: 720, margin: "0 auto", padding: "40px 36px" }}>

          {step === 0 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: "var(--cream)" }}>Personal Information</h3>
              <div className="form-grid">
                <F name="fullname" label="Full Name (as on ID)" placeholder="Anurag Shukla" value={data.fullname} onChange={handle} error={errors.fullname} />
                <F name="dob" label="Date of Birth" type="date" value={data.dob} onChange={handle} error={errors.dob} />
                <F name="gender" label="Gender">
                  <select name="gender" value={data.gender} onChange={handle} className={`form-select ${errors.gender ? "form-input-error" : ""}`}>
                    <option value="">Select gender</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                  {errors.gender && <span className="form-error">⚠ {errors.gender}</span>}
                </F>
                <div className="form-group full">
                  <F name="address" label="Residential Address" placeholder="House No., Street, Area" value={data.address} onChange={handle} error={errors.address} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: "var(--cream)" }}>Contact & Location</h3>
              <div className="form-grid">
                <F name="phone" label="Mobile Number" placeholder="9876543210" value={data.phone} onChange={handle} error={errors.phone} />
                <F name="city" label="City / District" placeholder="Lucknow" value={data.city} onChange={handle} error={errors.city} />
                <F name="state" label="State">
                  <select name="state" value={data.state} onChange={handle} className={`form-select ${errors.state ? "form-input-error" : ""}`}>
                    <option value="">Select state</option>
                    {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  {errors.state && <span className="form-error">⚠ {errors.state}</span>}
                </F>
                <F name="pincode" label="PIN Code" placeholder="226001" value={data.pincode} onChange={handle} error={errors.pincode} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--cream)" }}>Primary ID Document</h3>
              <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 24 }}>Select your main government-issued identity document.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
                {ID_TYPES.map(t => (
                  <div key={t.value} onClick={() => { set("primaryIdType", t.value); set("primaryIdNumber", ""); }}
                    style={{ padding: "16px 12px", borderRadius: 10, textAlign: "center", cursor: "pointer", border: `1px solid ${data.primaryIdType === t.value ? "var(--gold)" : "var(--border)"}`, background: data.primaryIdType === t.value ? "rgba(201,168,76,0.08)" : "var(--bg2)", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{t.value === "aadhaar" ? "🪪" : t.value === "pan" ? "💳" : t.value === "passport" ? "📘" : t.value === "driving" ? "🚗" : "🗳️"}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: data.primaryIdType === t.value ? "var(--gold)" : "var(--text2)" }}>{t.label}</div>
                  </div>
                ))}
              </div>
              {errors.primaryIdType && <span className="form-error">⚠ {errors.primaryIdType}</span>}
              {data.primaryIdType && (
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="form-label">{ID_TYPES.find(t => t.value === data.primaryIdType)?.label} Number</label>
                  <input name="primaryIdNumber" value={data.primaryIdNumber} onChange={handle}
                    className={`form-input ${errors.primaryIdNumber ? "form-input-error" : ""}`}
                    placeholder={idHint(data.primaryIdType)} style={{ textTransform: "uppercase" }} />
                  {errors.primaryIdNumber && <span className="form-error">⚠ {errors.primaryIdNumber}</span>}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--cream)" }}>Secondary ID Document</h3>
              <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 24 }}>Select a <strong style={{ color: "var(--gold)" }}>different</strong> ID type from your primary document.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
                {availableSecondary.map(t => (
                  <div key={t.value} onClick={() => { set("secondaryIdType", t.value); set("secondaryIdNumber", ""); }}
                    style={{ padding: "16px 12px", borderRadius: 10, textAlign: "center", cursor: "pointer", border: `1px solid ${data.secondaryIdType === t.value ? "var(--gold)" : "var(--border)"}`, background: data.secondaryIdType === t.value ? "rgba(201,168,76,0.08)" : "var(--bg2)", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{t.value === "aadhaar" ? "🪪" : t.value === "pan" ? "💳" : t.value === "passport" ? "📘" : t.value === "driving" ? "🚗" : "🗳️"}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: data.secondaryIdType === t.value ? "var(--gold)" : "var(--text2)" }}>{t.label}</div>
                  </div>
                ))}
              </div>
              {errors.secondaryIdType && <span className="form-error">⚠ {errors.secondaryIdType}</span>}
              {data.secondaryIdType && (
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="form-label">{ID_TYPES.find(t => t.value === data.secondaryIdType)?.label} Number</label>
                  <input name="secondaryIdNumber" value={data.secondaryIdNumber} onChange={handle}
                    className={`form-input ${errors.secondaryIdNumber ? "form-input-error" : ""}`}
                    placeholder={idHint(data.secondaryIdType)} style={{ textTransform: "uppercase" }} />
                  {errors.secondaryIdNumber && <span className="form-error">⚠ {errors.secondaryIdNumber}</span>}
                </div>
              )}
              <div style={{ marginTop: 28 }}>
                <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text3)", marginBottom: 16, letterSpacing: 2, textTransform: "uppercase" }}>Optional: Additional IDs for stronger verification</div>
                <div className="form-grid">
                  {["aadhaar", "pan", "passport", "driving", "voter"].filter(t => t !== data.primaryIdType && t !== data.secondaryIdType).map(t => (
                    <div className="form-group" key={t}>
                      <label className="form-label">{ID_TYPES.find(i => i.value === t)?.label}</label>
                      <input
                        value={data[t === "aadhaar" ? "aadhaarNumber" : t === "pan" ? "panNumber" : t === "passport" ? "passportNumber" : t === "driving" ? "drivingLicense" : "voterId"]}
                        onChange={e => set(t === "aadhaar" ? "aadhaarNumber" : t === "pan" ? "panNumber" : t === "passport" ? "passportNumber" : t === "driving" ? "drivingLicense" : "voterId", e.target.value)}
                        className="form-input" placeholder="Optional" style={{ fontSize: 13, textTransform: "uppercase" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--cream)" }}>Upload Documents</h3>
              <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 24 }}>Upload a scan or photo of your primary ID and a clear selfie.</p>
              {/* Bug 13 fix: warning about page refresh */}
              <div style={{ padding: "10px 14px", background: "rgba(201,154,45,0.08)", border: "1px solid rgba(201,154,45,0.2)", borderRadius: 8, marginBottom: 20, fontSize: 12, color: "var(--warn)" }}>
                ⚠ Files are selected for this session only. Do not refresh the page or you will need to re-select them.
              </div>
              <div className="form-grid">
                <FileZone field="idProofFile" label="Primary ID Proof (Front)" icon="📄" hint="JPG, PNG or PDF — clear, all 4 corners visible" value={data.idProofFile} onSet={set} error={errors.idProofFile} />
                <FileZone field="selfieFile" label="Live Selfie Photo" icon="🤳" hint="Face clearly visible, good lighting, no filters" value={data.selfieFile} onSet={set} error={errors.selfieFile} />
              </div>
              <div className="alert alert-info" style={{ marginTop: 16 }}>
                💡 Ensure your face on the selfie clearly matches the photo on your ID document for faster approval.
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: "var(--cream)" }}>Review & Submit</h3>
              {[
                ["Full Name", data.fullname], ["Date of Birth", data.dob], ["Gender", data.gender],
                ["Address", data.address], ["City", data.city], ["State", data.state], ["PIN", data.pincode],
                ["Phone", data.phone], ["Primary ID", `${ID_TYPES.find(t => t.value === data.primaryIdType)?.label} — ${data.primaryIdNumber}`],
                ["Secondary ID", `${ID_TYPES.find(t => t.value === data.secondaryIdType)?.label} — ${data.secondaryIdNumber}`],
                ["ID Proof File", data.idProofFile?.name], ["Selfie File", data.selfieFile?.name],
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "11px 0", borderBottom: "1px solid var(--border)", fontSize: 14, gap: 16 }}>
                  <span style={{ color: "var(--text3)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>{l}</span>
                  <span style={{ color: v ? "var(--cream)" : "var(--danger)", textAlign: "right" }}>{v || "⚠ Missing"}</span>
                </div>
              ))}
              <div className="alert alert-info" style={{ marginTop: 20 }}>
                🔐 By submitting, you confirm all information is accurate and you consent to VeriSOC processing your documents for identity verification purposes.
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            {step > 0 && <button className="btn btn-secondary" onClick={back} style={{ flex: 1 }}>← Back</button>}
            {step < 5 ? (
              <button className="btn btn-primary" onClick={next} style={{ flex: 2 }}>Continue →</button>
            ) : (
              <button className="btn btn-primary" onClick={submit} disabled={submitting} style={{ flex: 2 }}>
                {submitting ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} /> Submitting KYC...</> : "🚀 Submit KYC Application"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
