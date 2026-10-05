import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) throw new Error('Configure as variáveis do Supabase.');

const customFetch: typeof fetch = (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sabado_user_session_token');
    if (token) headers.set('x-sabado-session', token);
  }
  return fetch(input, { ...init, headers });
};

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  global: { fetch: customFetch }
});
