import { createClient } from '@supabase/supabase-js';

// Normalize env strings to avoid issues with quotes/backticks/whitespace
function normalizeEnv(v: unknown): string {
  return String(v ?? '')
    .trim()
    .replace(/^['"`]\s*/, '')
    .replace(/\s*['"`]$/, '');
}

export const SUPABASE_URL = normalizeEnv(import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = normalizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

export function isSupabaseConfigured(): boolean {
  const urlOk = typeof SUPABASE_URL === 'string' && SUPABASE_URL.startsWith('http');
  const keyOk = typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.length > 20;
  const notPlaceholder = !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY');
  return urlOk && keyOk && notPlaceholder;
}

export const supabase = createClient(
  SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY || 'YOUR-ANON-KEY'
);

export default supabase;
