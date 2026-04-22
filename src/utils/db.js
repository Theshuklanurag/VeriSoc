import { supabase, BUCKET, isConfigured } from './supabase.js';

const USE_SUPABASE = isConfigured();

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS = {
  get:    (k)    => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  set:    (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  remove: (k)    => { localStorage.removeItem(k); },
};

// ─── PASSWORD HASHING (browser-native, no libraries needed) ──────────────────
async function hashPassword(password) {
  const msgBuffer  = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── KYC CODE GENERATOR ──────────────────────────────────────────────────────
function generateKycCode(username) {
  const year  = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random  = '';
  for (let i = 0; i < 6; i++) random += chars[Math.floor(Math.random() * chars.length)];
  const seed  = username + random + year;
  let sum     = 0;
  for (const c of seed) sum += c.charCodeAt(0);
  return `VSC-${year}-${random}-${chars[sum % chars.length]}${chars[Math.floor(sum / chars.length) % chars.length]}`;
}

async function createUniqueKycCode(username) {
  let code, attempts = 0;
  do {
    code = generateKycCode(username);
    const existing = await KycDB.findByKycCode(code);
    if (!existing) break;
  } while (++attempts < 20);
  return code;
}

// ─── SESSION ──────────────────────────────────────────────────────────────────
export const SessionDB = {
  get()    { return LS.get('vs_session'); },
  set(user){ const { password: _, password_hash: __, ...safe } = user; LS.set('vs_session', safe); return safe; },
  clear()  { LS.remove('vs_session'); },
  async refresh(username) {
    const user = await UserDB.findByUsername(username);
    if (!user) return null;
    return this.set(user);
  },
};

// ─── MAPPERS ─────────────────────────────────────────────────────────────────
function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id, fullname: row.fullname, email: row.email,
    username: row.username, phone: row.phone || '', role: row.role || 'user',
    kycStatus: row.kyc_status ?? row.kycStatus ?? 'not_submitted',
    digilockerLinked: row.digilocker_linked ?? row.digilockerLinked ?? false,
    digilockerData:   row.digilocker_data   ?? row.digilockerData   ?? null,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    // password_hash intentionally omitted — never expose to UI
  };
}

function mapKyc(row) {
  if (!row) return null;
  return {
    id: row.id, kycCode: row.kyc_code ?? row.kycCode,
    username: row.username, fullname: row.fullname,
    dob: row.dob, gender: row.gender, address: row.address,
    city: row.city, state: row.state, pincode: row.pincode, phone: row.phone,
    primaryIdType:    row.primary_id_type    ?? row.primaryIdType,
    primaryIdNumber:  row.primary_id_number  ?? row.primaryIdNumber,
    secondaryIdType:  row.secondary_id_type  ?? row.secondaryIdType,
    secondaryIdNumber:row.secondary_id_number?? row.secondaryIdNumber,
    aadhaarNumber:    row.aadhaar_number     ?? row.aadhaarNumber    ?? '',
    panNumber:        row.pan_number         ?? row.panNumber        ?? '',
    passportNumber:   row.passport_number    ?? row.passportNumber   ?? '',
    drivingLicense:   row.driving_license    ?? row.drivingLicense   ?? '',
    voterId:          row.voter_id           ?? row.voterId          ?? '',
    idProofPath:      row.id_proof_path      ?? row.idProofPath      ?? null,
    selfiePath:       row.selfie_path        ?? row.selfiePath       ?? null,
    idProofFileName:  row.id_proof_filename  ?? row.idProofFileName  ?? '',
    selfieFileName:   row.selfie_filename    ?? row.selfieFileName   ?? '',
    digilockerVerified: row.digilocker_verified ?? row.digilockerVerified ?? false,
    digilockerData:   row.digilocker_data    ?? row.digilockerData   ?? null,
    status:           row.status ?? 'pending',
    suspicious:       row.suspicious ?? false,
    adminNotes:       row.admin_notes ?? row.adminNotes ?? '',
    submittedAt:      row.submitted_at ?? row.submittedAt,
    reviewedAt:       row.reviewed_at  ?? row.reviewedAt  ?? null,
    reviewedBy:       row.reviewed_by  ?? row.reviewedBy  ?? null,
  };
}

function mapQuestion(row) {
  if (!row) return null;
  return {
    id: row.id, username: row.username, fullname: row.fullname,
    question: row.question, category: row.category || 'general',
    answer: row.answer ?? null, answeredBy: row.answered_by ?? row.answeredBy ?? null,
    answeredAt: row.answered_at ?? row.answeredAt ?? null,
    status: row.status ?? 'open', aiResponse: row.ai_response ?? row.aiResponse ?? null,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  };
}

// ─── USER DB ─────────────────────────────────────────────────────────────────
export const UserDB = {
  async getAll() {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapUser);
    }
    return (LS.get('vs_users') || []).map(mapUser);
  },

  // Returns raw DB row (includes password_hash) — used internally by verify()
  async findByUsername(username) {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('users').select('*').eq('username', username).maybeSingle();
      if (error) throw error;
      return data; // raw row
    }
    const users = LS.get('vs_users') || [];
    return users.find(u => u.username === username) || null;
  },

  async findByEmail(email) {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('users').select('*').eq('email', email?.toLowerCase()).maybeSingle();
      if (error) throw error;
      return mapUser(data);
    }
    const users = LS.get('vs_users') || [];
    return mapUser(users.find(u => u.email === email?.toLowerCase()) || null);
  },

  // ── FIXED: insert directly into public.users with hashed password ──────────
  // Does NOT use supabase.auth.signUp() — avoids the trigger conflict that
  // caused "Database error saving new user"
  async create(data) {
    const [byUser, byEmail] = await Promise.all([
      this.findByUsername(data.username),
      this.findByEmail(data.email),
    ]);
    if (byUser)  return { error: 'Username already taken.' };
    if (byEmail) return { error: 'Email already registered.' };

    const password_hash = await hashPassword(data.password);

    if (USE_SUPABASE) {
      const userId = 'USR-' + Date.now();
      const { data: inserted, error } = await supabase.from('users').insert({
        id: userId,
        fullname: data.fullname,
        email: data.email.toLowerCase(),
        username: data.username,
        phone: data.phone || '',
        role: 'user',
        kyc_status: 'not_submitted',
        digilocker_linked: false,
        digilocker_data: null,
        password_hash,   // stored securely in Supabase, never in localStorage
      }).select().single();

      if (error) return { error: error.message };
      return { user: mapUser(inserted) };
    }

    // localStorage fallback (demo / offline mode)
    const user = {
      id: 'USR-' + Date.now(), fullname: data.fullname,
      email: data.email.toLowerCase(), username: data.username,
      phone: data.phone || '', role: 'user', kycStatus: 'not_submitted',
      digilockerLinked: false, digilockerData: null,
      password_hash,
      createdAt: new Date().toISOString(),
    };
    const users = LS.get('vs_users') || [];
    users.push(user);
    LS.set('vs_users', users);
    return { user: mapUser(user) };
  },

  // ── FIXED: fetch row → compare SHA-256 hash → return safe mapped user ──────
  async verify(username, password) {
    const row = await this.findByUsername(username); // raw row with password_hash
    if (!row) return null;
    const hash = await hashPassword(password);
    if (row.password_hash !== hash) return null;
    return mapUser(row);
  },

  async updateKycStatus(username, status) {
    if (USE_SUPABASE) {
      const { error } = await supabase.from('users').update({ kyc_status: status }).eq('username', username);
      if (error) throw error;
    } else {
      const users = LS.get('vs_users') || [];
      const idx = users.findIndex(u => u.username === username);
      if (idx !== -1) { users[idx].kycStatus = status; LS.set('vs_users', users); }
    }
    const msg = status === 'approved' ? 'Your KYC status: APPROVED 🎉 You are now verified!'
              : status === 'rejected' ? 'Your KYC status: REJECTED. Please review admin notes and resubmit.'
              : `Your KYC status updated to: ${status.toUpperCase()}`;
    await NotificationDB.add(username, { message: msg, type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info' });
    return true;
  },

  async updateProfile(username, updates) {
    if (USE_SUPABASE) {
      const dbUpdates = {};
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      const { data, error } = await supabase.from('users').update(dbUpdates).eq('username', username).select().single();
      if (error) throw error;
      return mapUser(data);
    }
    const users = LS.get('vs_users') || [];
    const idx   = users.findIndex(u => u.username === username);
    if (idx !== -1) { Object.assign(users[idx], updates); LS.set('vs_users', users); return mapUser(users[idx]); }
    return null;
  },
};

// ─── DOCUMENT DB ─────────────────────────────────────────────────────────────
function readFileAsBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

export const DocumentDB = {
  async save(username, type, file) {
    if (USE_SUPABASE) {
      const ext  = file.name.split('.').pop().toLowerCase();
      const path = `${username}/${type}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      return { path, fileName: file.name, size: file.size };
    }
    const base64 = await readFileAsBase64(file);
    const docId  = `${username}_${type}`;
    LS.set(`vs_doc_${docId}`, { id: docId, username, type, fileName: file.name, mimeType: file.type, size: file.size, base64, uploadedAt: new Date().toISOString() });
    return { path: docId, fileName: file.name, size: file.size };
  },

  async getSignedUrl(path, expiresIn = 3600) {
    if (!path) return null;
    if (USE_SUPABASE) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
      return error ? null : data.signedUrl;
    }
    return null;
  },

  async getPreviewUrl(username, type) {
    if (USE_SUPABASE) {
      for (const ext of ['jpg','jpeg','png','pdf','webp','gif']) {
        const url = await this.getSignedUrl(`${username}/${type}.${ext}`);
        if (url) return url;
      }
      return null;
    }
    const doc = LS.get(`vs_doc_${username}_${type}`);
    return doc ? doc.base64 : null;
  },
};

// ─── KYC DB ──────────────────────────────────────────────────────────────────
export const KycDB = {
  async getAll() {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('kycs').select('*').order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapKyc);
    }
    return (LS.get('vs_kycs') || []).map(mapKyc).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  },

  async findByUsername(username) {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('kycs').select('*').eq('username', username).maybeSingle();
      if (error) throw error;
      return mapKyc(data);
    }
    const kycs = LS.get('vs_kycs') || [];
    return mapKyc(kycs.find(k => k.username === username) || null);
  },

  async findByKycCode(code) {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('kycs').select('*').eq('kyc_code', code).maybeSingle();
      if (error) throw error;
      return mapKyc(data);
    }
    const kycs = LS.get('vs_kycs') || [];
    return mapKyc(kycs.find(k => (k.kyc_code ?? k.kycCode) === code) || null);
  },

  async submit(data) {
    const existing = await this.findByUsername(data.username);
    if (existing && existing.status !== 'rejected') return { error: 'KYC already submitted.' };

    let idProofPath = null, selfiePath = null;
    if (data.idProofFile instanceof File) {
      try { const r = await DocumentDB.save(data.username, 'id_proof', data.idProofFile); idProofPath = r.path; } catch (e) { console.error('ID upload error:', e.message); }
    }
    if (data.selfieFile instanceof File) {
      try { const r = await DocumentDB.save(data.username, 'selfie', data.selfieFile); selfiePath = r.path; } catch (e) { console.error('Selfie upload error:', e.message); }
    }

    const kycCode = await createUniqueKycCode(data.username);

    if (USE_SUPABASE) {
      if (existing) await supabase.from('kycs').delete().eq('username', data.username);
      const { data: inserted, error } = await supabase.from('kycs').insert({
        kyc_code: kycCode, username: data.username, fullname: data.fullname,
        dob: data.dob, gender: data.gender, address: data.address,
        city: data.city, state: data.state, pincode: data.pincode, phone: data.phone,
        primary_id_type: data.primaryIdType, primary_id_number: data.primaryIdNumber,
        secondary_id_type: data.secondaryIdType, secondary_id_number: data.secondaryIdNumber,
        aadhaar_number: data.aadhaarNumber || '', pan_number: data.panNumber || '',
        passport_number: data.passportNumber || '', driving_license: data.drivingLicense || '',
        voter_id: data.voterId || '',
        id_proof_path: idProofPath, selfie_path: selfiePath,
        id_proof_filename: data.idProofFile?.name || '',
        selfie_filename: data.selfieFile?.name || '',
        digilocker_verified: false, digilocker_data: null, status: 'pending',
      }).select().single();
      if (error) return { error: error.message };
      await UserDB.updateKycStatus(data.username, 'submitted');
      return { kycCode, entry: mapKyc(inserted) };
    }

    const entry = {
      kycCode, username: data.username, fullname: data.fullname,
      dob: data.dob, gender: data.gender, address: data.address,
      city: data.city, state: data.state, pincode: data.pincode, phone: data.phone,
      primaryIdType: data.primaryIdType, primaryIdNumber: data.primaryIdNumber,
      secondaryIdType: data.secondaryIdType, secondaryIdNumber: data.secondaryIdNumber,
      aadhaarNumber: data.aadhaarNumber || '', panNumber: data.panNumber || '',
      passportNumber: data.passportNumber || '', drivingLicense: data.drivingLicense || '',
      voterId: data.voterId || '', idProofPath, selfiePath,
      idProofFileName: data.idProofFile?.name || '', selfieFileName: data.selfieFile?.name || '',
      digilockerVerified: false, digilockerData: null,
      status: 'pending', suspicious: false, adminNotes: '',
      submittedAt: new Date().toISOString(), reviewedAt: null, reviewedBy: null,
    };
    const kycs = (LS.get('vs_kycs') || []).filter(k => k.username !== data.username);
    kycs.push(entry);
    LS.set('vs_kycs', kycs);
    await UserDB.updateKycStatus(data.username, 'submitted');
    return { kycCode, entry };
  },

  async updateStatus(username, status, adminNotes = '', reviewedBy = 'admin') {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('kycs').update({
        status, admin_notes: adminNotes, reviewed_at: new Date().toISOString(), reviewed_by: reviewedBy,
      }).eq('username', username).select().single();
      if (error) throw error;
      const s = status === 'approved' ? 'approved' : status === 'flagged' ? 'submitted' : 'rejected';
      await UserDB.updateKycStatus(username, s);
      return mapKyc(data);
    }
    const kycs = LS.get('vs_kycs') || [];
    const idx  = kycs.findIndex(k => k.username === username);
    if (idx === -1) return false;
    Object.assign(kycs[idx], { status, adminNotes, reviewedAt: new Date().toISOString(), reviewedBy });
    LS.set('vs_kycs', kycs);
    const s = status === 'approved' ? 'approved' : status === 'flagged' ? 'submitted' : 'rejected';
    await UserDB.updateKycStatus(username, s);
    return mapKyc(kycs[idx]);
  },

  async flagSuspicious(username, flag) {
    if (USE_SUPABASE) {
      const { error } = await supabase.from('kycs').update({ suspicious: flag }).eq('username', username);
      if (error) throw error;
    } else {
      const kycs = LS.get('vs_kycs') || [];
      const idx  = kycs.findIndex(k => k.username === username);
      if (idx !== -1) { kycs[idx].suspicious = flag; LS.set('vs_kycs', kycs); }
    }
    return true;
  },

  async getStats() {
    const kycs = await this.getAll();
    return {
      total:    kycs.length,
      pending:  kycs.filter(k => k.status === 'pending').length,
      approved: kycs.filter(k => k.status === 'approved').length,
      rejected: kycs.filter(k => k.status === 'rejected').length,
      flagged:  kycs.filter(k => k.suspicious).length,
    };
  },

  async exportCSV() {
    const kycs = await this.getAll();
    if (!kycs.length) return '';
    const hdrs = ['KYC Code','Username','Full Name','DOB','Gender','Phone','Primary ID','Primary ID No','Secondary ID','Secondary ID No','City','State','PIN','Status','Suspicious','Submitted','Reviewed','Notes'];
    const rows = kycs.map(k => [k.kycCode,k.username,k.fullname,k.dob,k.gender,k.phone,k.primaryIdType,k.primaryIdNumber,k.secondaryIdType,k.secondaryIdNumber,k.city,k.state,k.pincode,k.status,k.suspicious?'Yes':'No',k.submittedAt,k.reviewedAt||'',k.adminNotes].map(v=>`"${(v||'').toString().replace(/"/g,'""')}"`).join(','));
    return [hdrs.join(','), ...rows].join('\n');
  },
};

// ─── QUESTIONS DB ─────────────────────────────────────────────────────────────
export const QuestionDB = {
  async ask(username, fullname, question, category = 'general') {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('questions').insert({ username, fullname, question, category, status: 'open' }).select().single();
      if (error) throw error;
      return data.id;
    }
    const qs = LS.get('vs_questions') || [];
    const id = Date.now();
    qs.push({ id, username, fullname, question, category, answer: null, answeredBy: null, answeredAt: null, status: 'open', aiResponse: null, createdAt: new Date().toISOString() });
    LS.set('vs_questions', qs);
    return id;
  },

  async getAll() {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapQuestion);
    }
    return (LS.get('vs_questions') || []).map(mapQuestion).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  },

  async getByUsername(username) {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('questions').select('*').eq('username', username).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapQuestion);
    }
    return (LS.get('vs_questions') || []).filter(q => q.username === username).map(mapQuestion).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  },

  async answer(id, answer, adminUsername) {
    const updates = { answer, answeredBy: adminUsername, answeredAt: new Date().toISOString(), status: 'answered' };
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('questions').update({ answer, answered_by: adminUsername, answered_at: updates.answeredAt, status: 'answered' }).eq('id', id).select().single();
      if (error) throw error;
      const q = mapQuestion(data);
      await NotificationDB.add(q.username, { message: `Admin answered your question: "${q.question.substring(0, 60)}..."`, type: 'info' });
      return q;
    }
    const qs  = LS.get('vs_questions') || [];
    const idx = qs.findIndex(q => q.id === id);
    if (idx === -1) throw new Error('Question not found');
    Object.assign(qs[idx], updates);
    LS.set('vs_questions', qs);
    await NotificationDB.add(qs[idx].username, { message: `Admin answered your question: "${qs[idx].question.substring(0, 60)}..."`, type: 'info' });
    return mapQuestion(qs[idx]);
  },

  async saveAiResponse(id, aiResponse) {
    if (USE_SUPABASE) { await supabase.from('questions').update({ ai_response: aiResponse }).eq('id', id); return; }
    const qs  = LS.get('vs_questions') || [];
    const idx = qs.findIndex(q => q.id === id);
    if (idx !== -1) { qs[idx].aiResponse = aiResponse; LS.set('vs_questions', qs); }
  },
};

// ─── NOTIFICATION DB ─────────────────────────────────────────────────────────
export const NotificationDB = {
  async add(username, { message, type = 'info' }) {
    if (USE_SUPABASE) {
      await supabase.from('notifications').insert({ username, message, type, read: false });
      return;
    }
    const ns = LS.get('vs_notifications') || [];
    ns.push({ id: Date.now(), username, message, type, read: false, createdAt: new Date().toISOString() });
    LS.set('vs_notifications', ns);
  },

  async getByUsername(username) {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('notifications').select('*').eq('username', username).order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    }
    return (LS.get('vs_notifications') || []).filter(n => n.username === username).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  },

  async markRead(id) {
    if (USE_SUPABASE) { await supabase.from('notifications').update({ read: true }).eq('id', id); return; }
    const ns  = LS.get('vs_notifications') || [];
    const idx = ns.findIndex(n => n.id === id);
    if (idx !== -1) { ns[idx].read = true; LS.set('vs_notifications', ns); }
  },

  async markAllRead(username) {
    if (USE_SUPABASE) { await supabase.from('notifications').update({ read: true }).eq('username', username).eq('read', false); return; }
    const ns = LS.get('vs_notifications') || [];
    ns.filter(n => n.username === username).forEach(n => n.read = true);
    LS.set('vs_notifications', ns);
  },
};

// ─── ADMIN AUTH ───────────────────────────────────────────────────────────────
const ADMIN_KEY = 'vs_adm_cfg';
export const AdminAuth = {
  init() {
    localStorage.setItem(ADMIN_KEY, JSON.stringify({
      u: btoa('@dmin'),
      p: btoa('@dmin123'),
      name: 'System Administrator',
      email: 'admin@verisoc.in',
    }));
  },
  verify(username, password) {
    this.init();
    try {
      const cfg = JSON.parse(localStorage.getItem(ADMIN_KEY));
      return cfg && atob(cfg.u) === username && atob(cfg.p) === password;
    } catch { return false; }
  },
  getProfile() {
    this.init();
    try {
      const cfg = JSON.parse(localStorage.getItem(ADMIN_KEY));
      return { fullname: cfg.name, email: cfg.email, username: atob(cfg.u), role: 'admin' };
    } catch { return null; }
  },
};

// ─── REALTIME ─────────────────────────────────────────────────────────────────
export function subscribeToNotifications(username, callback) {
  if (!USE_SUPABASE) return { unsubscribe: () => {} };
  return supabase
    .channel(`notif_${username}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `username=eq.${username}` }, payload => callback(payload.new))
    .subscribe();
}

export function subscribeToKycUpdates(username, callback) {
  if (!USE_SUPABASE) return { unsubscribe: () => {} };
  return supabase
    .channel(`kyc_${username}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kycs', filter: `username=eq.${username}` }, payload => callback(mapKyc(payload.new)))
    .subscribe();
}