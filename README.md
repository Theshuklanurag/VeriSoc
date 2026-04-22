# 🛡️ VeriSOC v3.0 — Supabase + Real DigiLocker Edition

---

## 📦 Installation

```bash
# 1. Install all dependencies (React + Supabase SDK)
npm install

# This installs:
#   react, react-dom            — UI framework
#   @supabase/supabase-js       — Supabase client (DB + Storage + Realtime)
```

Then configure `.env` and run:
```bash
npm run dev        # development
npm run build      # production build
npm run preview    # preview production build
```

---

## 🗄️ PART 1 — Supabase Setup (5 mins)

### Step 1: Create Project
1. Go to [supabase.com](https://supabase.com) → **Start your project** → **New Project**
2. Name: `verisoc` | Region: **South Asia (Mumbai)** 🇮🇳 | Set database password
3. Wait ~2 minutes

### Step 2: Run the Database Schema
1. Supabase Dashboard → **SQL Editor** → **New Query**
2. Open `supabase_schema.sql` from this project
3. Paste everything → Click **RUN ▶️**

### Step 3: Create Storage Bucket
1. Dashboard → **Storage** → **New Bucket**
2. Name: `kyc-documents` | Public: **OFF** (keep private)
3. Click **Create bucket**
4. Click **Policies** → **New Policy** → **Full access** (for dev)

### Step 4: Get API Keys
Dashboard → ⚙️ **Settings** → **API** → Copy:
- **Project URL**: `https://xxxx.supabase.co`
- **anon public key**: `eyJhbGci...`

### Step 5: Configure `.env`
```bash
cp .env.example .env
```
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📁 PART 2 — DigiLocker OAuth (Real API)

DigiLocker is a Government of India service. It uses **OAuth 2.0** — the same standard as "Login with Google". The user logs in on DigiLocker's government website, then gets redirected back to your app with their verified data.

### Why you need a backend (Edge Function)
OAuth requires a **Client Secret** — a password that must NEVER be in your frontend code (anyone could steal it from the browser). The Supabase Edge Function (`supabase/functions/digilocker-token/`) handles this server-side.

### Step 1: Apply for DigiLocker API Access
1. Go to [partners.digitallocker.gov.in](https://partners.digitallocker.gov.in)
2. Register your organization → Apply for API access
3. After approval (~1-2 weeks), you get:
   - **Client ID** (safe for frontend)
   - **Client Secret** (server-side only — NEVER in .env frontend)

> **For testing immediately:** DigiLocker provides a **sandbox** environment. Apply for sandbox access first — it works with test Aadhaar numbers, no real verification needed.

### Step 2: Configure Redirect URI
In DigiLocker partner portal, add your redirect URI:
- Dev: `http://localhost:5173/digilocker/callback`
- Prod: `https://yourdomain.com/digilocker/callback`

Add to `.env`:
```env
VITE_DIGILOCKER_CLIENT_ID=your_client_id_here
VITE_DIGILOCKER_REDIRECT_URI=http://localhost:5173/digilocker/callback
```

### Step 3: Deploy the Edge Function
The Client Secret lives here — never touches the browser.

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Set secrets (server-side only, never in .env)
supabase secrets set DIGILOCKER_CLIENT_ID=your_client_id
supabase secrets set DIGILOCKER_CLIENT_SECRET=your_client_secret
supabase secrets set DIGILOCKER_REDIRECT_URI=http://localhost:5173/digilocker/callback

# Deploy the function
supabase functions deploy digilocker-token
```

### Step 4: Done!
The DigiLocker page auto-detects if `VITE_DIGILOCKER_CLIENT_ID` is set:
- ✅ **Set** → Shows "Login with DigiLocker" button → Redirects to govt portal
- ⚠️ **Not set** → Falls back to demo/mock mode (OTP simulation)

### How the Real OAuth Flow Works

```
User clicks "Login with DigiLocker"
         ↓
Browser redirects → digilocker.gov.in/authorize?client_id=...
         ↓
User enters Aadhaar + OTP on GOVERNMENT website (not your app)
         ↓
DigiLocker redirects back → yourdomain.com/digilocker/callback?code=AUTH_CODE
         ↓
Your frontend sends AUTH_CODE → Supabase Edge Function
         ↓
Edge Function calls DigiLocker API with code + SECRET → gets access_token
         ↓
Edge Function fetches user profile + documents
         ↓
Returns SAFE data to frontend (no secrets exposed)
         ↓
User data pre-fills KYC form ✅
```

---

## 🤖 PART 3 — Groq AI Chatbot (Optional)

```bash
# Free at: console.groq.com/keys (no credit card)
```
```env
VITE_GROQ_API_KEY=gsk_your_key_here
```
Without key → chatbot uses smart local fallback responses.

---

## 🔑 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `VS_ADMIN_2025` | `Secure@KYC#2025` |
| User | Create via Signup | — |

Admin access: click the tiny `● ● ●` on the Login page.

---

## 📁 Project Structure

```
verisoc/
├── .env.example                    ← Copy to .env and fill values
├── package.json                    ← Run `npm install` to install everything
├── supabase_schema.sql             ← Run this in Supabase SQL Editor
│
├── supabase/
│   └── functions/
│       └── digilocker-token/
│           └── index.ts           ← Server-side OAuth token exchange
│                                     (keeps Client Secret safe)
│
└── src/
    ├── utils/
    │   ├── supabase.js             ← Supabase client
    │   ├── digilocker.js           ← OAuth URL builder + callback handler
    │   └── db.js                   ← All DB operations (Supabase)
    │
    ├── pages/
    │   ├── DigiLockerPage.jsx      ← Real OAuth + mock fallback
    │   ├── DashboardPage.jsx       ← Realtime subscriptions
    │   ├── AdminPage.jsx           ← Full admin panel
    │   ├── SupportPage.jsx         ← Q&A + notifications
    │   └── ...
    │
    └── components/
        ├── Chatbot.jsx             ← Groq AI + Ask Admin
        └── Navbar.jsx              ← Live notification badge
```

---

## 🗄️ What's in Supabase

| Table/Store | What's Stored |
|-------------|--------------|
| `users` | All accounts, KYC status, DigiLocker linkage |
| `kycs` | Full KYC submissions, all ID numbers |
| `questions` | Support tickets + admin answers |
| `notifications` | Real-time alerts |
| `kyc-documents` storage | ID proof images, selfie photos |

**Realtime features:**
- KYC status change → Dashboard updates instantly (no refresh)
- Admin answers question → User notified live
- New notifications → Navbar badge updates live

---

## 🔒 Production Checklist

- [ ] Replace custom password with `supabase.auth.signUp()` (Supabase Auth)
- [ ] Tighten RLS policies (use `auth.uid()` instead of `true`)
- [ ] Move to DigiLocker **production** environment (after sandbox testing)
- [ ] Set proper Storage policies (owner-only access)
- [ ] Add rate limiting on KYC submissions
- [ ] Enable [Supabase Vault](https://supabase.com/docs/guides/database/vault) for sensitive data

---

## ❓ FAQ

**Q: Can I use DigiLocker without applying for API access?**
A: No — you need API credentials from the DigiLocker partner portal. Until then, the mock/demo mode works perfectly for development and demos.

**Q: Does `npm install` install Supabase?**
A: Yes! `@supabase/supabase-js` is in `package.json`. Just run `npm install` and it's ready.

**Q: Why can't I put the DigiLocker Client Secret in `.env`?**
A: Vite exposes all `VITE_*` variables to the browser — anyone can see them in DevTools. The Client Secret must stay server-side (the Edge Function).

**Q: What Aadhaar numbers work in sandbox?**
A: DigiLocker sandbox provides test Aadhaar numbers in their developer documentation.
