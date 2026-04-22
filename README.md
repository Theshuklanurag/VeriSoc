# VeriSOC — India's Social Media KYC Verification Platform

VeriSOC is a government-grade KYC (Know Your Customer) identity verification platform built for Indian social media users. It eliminates fake accounts by verifying real identities using government-issued documents and AI-powered biometric matching.

---

## Features

- **Multi-Document KYC** — Accepts Aadhaar, PAN, Passport, Driving License, and Voter ID
- **AI Biometric Matching** — Face comparison between government ID photo and live selfie
- **Google Sign-In** — One-click login via Google OAuth through Supabase
- **Unique KYC Codes** — Every submission gets a trackable VSC-YYYY-XXXXXX code
- **Admin Dashboard** — Full review workflow with approve, reject, flag, and CSV export
- **AI Chatbot** — Powered by Groq (Llama 3.3) with smart fallback mode
- **Support System** — Users can ask questions, admin answers directly
- **Real-time Notifications** — Status updates pushed to users instantly
- **PDPB Compliant** — Designed with India's Personal Data Protection Bill in mind

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Custom CSS with CSS Variables |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth) |
| AI Chat | Groq API (Llama 3.3 70B) |
| Storage | Supabase Storage + IndexedDB fallback |
| Deployment | Vercel |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Theshuklanurag/VeriSoc.git
cd VeriSoc
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your `.env` file

Create a file called `.env` in the root folder:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
```

- Get Supabase keys from [supabase.com](https://supabase.com) → your project → Settings → API
- Get Groq key from [console.groq.com](https://console.groq.com)

### 4. Set up Supabase database

Go to your Supabase project → SQL Editor → paste and run the contents of `supabase_schema.sql`

This creates all required tables and the Google OAuth trigger automatically.

### 5. Enable Google Sign-In (optional)

1. Supabase Dashboard → Authentication → Providers → Google → Enable
2. Copy the Callback URL shown
3. Go to [console.cloud.google.com](https://console.cloud.google.com) → Credentials → Create OAuth Client ID
4. Paste the Callback URL under Authorized Redirect URIs
5. Copy Client ID and Secret back into Supabase → Save
6. Add `http://localhost:5173` to Supabase → Authentication → URL Configuration → Redirect URLs

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Admin Access

The admin panel is hidden — accessible via the `● ● ●` link at the bottom of the login page.

```
Username: @dmin
Password: @dmin123
```

Change these in `src/utils/db.js` in the `AdminAuth.init()` function before deploying.

---

## Deploying to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add these Environment Variables in Vercel dashboard:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_GROQ_API_KEY` | Your Groq API key |

4. Click Deploy

After deploying, add your Vercel URL to Supabase → Authentication → URL Configuration → Redirect URLs.

---

## Project Structure

```
src/
├── components/
│   ├── Navbar.jsx        # Navigation bar
│   ├── Footer.jsx        # Footer
│   └── Chatbot.jsx       # AI chat + Ask Admin widget
├── context/
│   └── AppContext.jsx    # Auth, Toast, Page state
├── pages/
│   ├── HomePage.jsx      # Landing page
│   ├── LoginPage.jsx     # Login with Google OAuth
│   ├── SignupPage.jsx    # Registration
│   ├── KycPage.jsx       # 6-step KYC form
│   ├── DashboardPage.jsx # User dashboard
│   ├── AdminPage.jsx     # Admin dashboard
│   ├── AdminLoginPage.jsx
│   ├── SupportPage.jsx
│   └── StaticPages.jsx   # About, Contact
├── utils/
│   ├── db.js             # All database operations
│   └── supabase.js       # Supabase client
└── styles/
    └── globals.css       # Global styles and design tokens
```

---

## KYC Process

1. **Register** — Create account with email and password or Google
2. **Personal Info** — Name, date of birth, gender, address
3. **Contact Details** — Phone, city, state, PIN code
4. **Primary ID** — Choose and enter one government ID
5. **Secondary ID** — Choose and enter a different government ID
6. **Upload Documents** — ID proof photo and live selfie
7. **Submit** — Receive unique VSC code for tracking
8. **Admin Review** — Approved or rejected within 24-48 hours

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_GROQ_API_KEY` | No | Groq API key for AI chat (falls back to smart mode without it) |

---

## Important Notes

- Never commit your `.env` file — it is listed in `.gitignore`
- The app runs in demo mode (localStorage) if Supabase is not configured
- Admin credentials should be changed before going live
- Groq API may not work from localhost due to CORS — it works fine on Vercel

---

## Made by

Anurag Shukla — VeriSOC Project