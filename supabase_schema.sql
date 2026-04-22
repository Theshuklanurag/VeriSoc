-- ─────────────────────────────────────────────────────────────────────────────
-- VeriSOC Supabase Schema  (FULL — run this in SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS TABLE ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            TEXT PRIMARY KEY DEFAULT 'USR-' || extract(epoch from now())::bigint::text,
  auth_id       UUID UNIQUE,                    -- links to Supabase Auth Google login
  fullname      TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  phone         TEXT DEFAULT '',
  role          TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  kyc_status    TEXT DEFAULT 'not_submitted'
                  CHECK (kyc_status IN ('not_submitted','submitted','approved','rejected')),
  digilocker_linked  BOOLEAN DEFAULT FALSE,
  digilocker_data    JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── KYC SUBMISSIONS TABLE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kycs (
  id                  BIGSERIAL PRIMARY KEY,
  kyc_code            TEXT UNIQUE NOT NULL,
  username            TEXT UNIQUE NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
  fullname            TEXT NOT NULL,
  dob                 TEXT,
  gender              TEXT,
  address             TEXT,
  city                TEXT,
  state               TEXT,
  pincode             TEXT,
  phone               TEXT,
  primary_id_type     TEXT,
  primary_id_number   TEXT,
  secondary_id_type   TEXT,
  secondary_id_number TEXT,
  aadhaar_number      TEXT DEFAULT '',
  pan_number          TEXT DEFAULT '',
  passport_number     TEXT DEFAULT '',
  driving_license     TEXT DEFAULT '',
  voter_id            TEXT DEFAULT '',
  id_proof_path       TEXT,
  selfie_path         TEXT,
  id_proof_filename   TEXT DEFAULT '',
  selfie_filename     TEXT DEFAULT '',
  digilocker_verified BOOLEAN DEFAULT FALSE,
  digilocker_data     JSONB,
  status              TEXT DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected','flagged')),
  suspicious          BOOLEAN DEFAULT FALSE,
  admin_notes         TEXT DEFAULT '',
  submitted_at        TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         TEXT
);

-- ─── QUESTIONS / SUPPORT TABLE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.questions (
  id            BIGSERIAL PRIMARY KEY,
  username      TEXT NOT NULL,
  fullname      TEXT NOT NULL,
  question      TEXT NOT NULL,
  category      TEXT DEFAULT 'general',
  answer        TEXT,
  answered_by   TEXT,
  answered_at   TIMESTAMPTZ,
  status        TEXT DEFAULT 'open' CHECK (status IN ('open','answered','closed')),
  ai_response   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICATIONS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          BIGSERIAL PRIMARY KEY,
  username    TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT DEFAULT 'info' CHECK (type IN ('info','success','error','warn')),
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kycs_username          ON public.kycs(username);
CREATE INDEX IF NOT EXISTS idx_kycs_status            ON public.kycs(status);
CREATE INDEX IF NOT EXISTS idx_questions_username     ON public.questions(username);
CREATE INDEX IF NOT EXISTS idx_questions_status       ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_username ON public.notifications(username);
CREATE INDEX IF NOT EXISTS idx_notifications_read     ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_users_auth_id          ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email            ON public.users(email);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kycs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow anon key full access (app handles its own auth)
CREATE POLICY "anon_all_users"         ON public.users         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_kycs"          ON public.kycs          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_questions"     ON public.questions     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_notifications" ON public.notifications FOR ALL TO anon USING (true) WITH CHECK (true);

-- Authenticated users can also access their own data (needed for Google OAuth)
CREATE POLICY "auth_all_users"         ON public.users         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_kycs"          ON public.kycs          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_questions"     ON public.questions     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_notifications" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── GOOGLE AUTH TRIGGER ─────────────────────────────────────────────────────
-- This auto-creates a row in public.users when someone signs up via Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Build a clean username from their email
  base_username := lower(split_part(NEW.email, '@', 1));
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '_', 'g');
  final_username := base_username;

  -- Make it unique if taken
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  -- Only insert if not already linked
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_id = NEW.id) THEN
    INSERT INTO public.users (
      id, auth_id, fullname, email, username, phone, role, kyc_status
    ) VALUES (
      'USR-' || extract(epoch from now())::bigint::text,
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      final_username,
      '',
      'user',
      'not_submitted'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger to Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
