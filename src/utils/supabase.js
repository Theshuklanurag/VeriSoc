import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON);
export const BUCKET = 'kyc-documents';

let _client = null;

if (SUPABASE_URL && SUPABASE_ANON) {
  _client = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else {
  console.warn('[VeriSOC] No Supabase config — running in demo mode.');
}

const noop = () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } });

export const supabase = _client || {
  from: () => ({
    select: () => ({
      order: () => Promise.resolve({ data: [], error: null }),
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
    insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Demo mode' } }) }) }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
  }),
  storage: { from: () => ({ upload: noop, createSignedUrl: noop, list: noop }) },
  channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }),
  functions: { invoke: noop },
  auth: {
    signInWithOAuth: () => Promise.resolve({ data: null, error: { message: 'Add .env with Supabase keys to enable Google login' } }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: noop,
  },
};