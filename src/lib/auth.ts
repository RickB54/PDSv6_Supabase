import { createClient } from '@supabase/supabase-js';
import supabase, { isSupabaseConfigured } from './supabase';

export interface User {
  email: string;
  role: 'customer' | 'employee' | 'admin';
  name: string;
}

type AuthMode = 'local' | 'supabase';

function getEnvAuthMode(): AuthMode {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && anon && url.startsWith('http')) return 'supabase';
  return 'local';
}

export function getAuthMode(): AuthMode {
  return getEnvAuthMode();
}

export function isSupabaseEnabled(): boolean {
  return getAuthMode() === 'supabase';
}

export function isIdentityEnabled(): boolean {
  return false;
}

export function setAuthMode(mode: AuthMode) {
  // No-op
}

export function getCurrentUser(): User | null {
  if (isSupabaseEnabled()) {
    try {
      const sid = localStorage.getItem('session_user_id');
      if (!sid) return null;
    } catch { }
    const cached = localStorage.getItem('currentUser');
    if (cached) return JSON.parse(cached);
    return null;
  }
  return null;
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
  try {
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: user }));
  } catch { }
}

// Role inference helper
function normalizeEnvList(v: unknown): string[] {
  return String(v ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function getEmailRoleOverride(email: string): 'admin' | 'employee' | null {
  try {
    const e = String(email || '').trim().toLowerCase();
    const admins = normalizeEnvList(import.meta.env.VITE_ADMIN_EMAILS || import.meta.env.VITE_ADMIN_EMAIL);
    const employees = normalizeEnvList(import.meta.env.VITE_EMPLOYEE_EMAILS || import.meta.env.VITE_EMPLOYEE_EMAIL);
    const defaultAdmins = ['primedetailsolutions.ma.nh@gmail.com'];
    const adminList = admins.length ? admins : defaultAdmins;
    if (adminList.includes(e)) return 'admin';
    if (employees.includes(e)) return 'employee';
  } catch { }
  return null;
}

// Helper to timeout promises
function timeoutPromise<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))
  ]);
}

async function getSupabaseUserProfile(userId: string): Promise<{ role: 'admin' | 'employee' | 'customer'; name?: string } | null> {
  try {
    console.log("getSupabaseUserProfile: request", userId);
    // Timeout the DB read to prevent hang
    // We cast to any because the Supabase builder is a "Thenable", not a strict Promise in all TS versions
    const res: any = await timeoutPromise(
      supabase.from('app_users').select('role,name').eq('id', userId).maybeSingle() as any,
      3000,
      "getSupabaseUserProfile"
    );

    if (res.error) {
      console.error("getSupabaseUserProfile error:", res.error);
      return null;
    }
    console.log("getSupabaseUserProfile response:", res.data);
    return (res.data as any) || null;
  } catch (e) {
    console.warn("getSupabaseUserProfile exc:", e);
    return null;
  }
}

async function getSupabaseCustomerProfile(userId: string): Promise<any | null> {
  try {
    const res: any = await timeoutPromise(
      supabase.from('customers').select('*').eq('id', userId).maybeSingle() as any,
      3000,
      "getSupabaseCustomerProfile"
    );
    if (res.error) return null;
    if (res.data) {
      try { localStorage.setItem('customerProfile', JSON.stringify(res.data)); } catch { }
      try { window.dispatchEvent(new CustomEvent('customer-profile-changed', { detail: res.data })); } catch { }
    }
    return res.data || null;
  } catch { return null; }
}

// Exported helper: map current Supabase session to our User and persist
// Now accepts the Supabase user object directly to avoid blocking getUser() calls
export async function finalizeSupabaseSession(u: any): Promise<User | null> {
  try {
    console.log("finalizeSupabaseSession: starting for user", u?.id);
    if (!u) {
      console.log("finalizeSupabaseSession: no user provided");
      return null;
    }

    // 1. Fetch profile (with timeout protection now)
    let profile = await getSupabaseUserProfile(u.id);
    let role: 'admin' | 'employee' | 'customer' = 'customer';

    const email = u.email || '';

    // Check for pre-authorization in authorized_users table
    let authorizedRole: 'admin' | 'employee' | null = null;
    try {
      const { data: authUser } = await supabase
        .from('authorized_users')
        .select('role')
        .eq('email', email)
        .maybeSingle();
      if (authUser) authorizedRole = authUser.role as 'admin' | 'employee';
    } catch (e) { console.warn("Error checking authorized_users", e); }

    const overrideRole = getEmailRoleOverride(email) || authorizedRole;

    if (profile) {
      role = profile.role;
    } else if (overrideRole) {
      role = overrideRole;
    }

    // 3. Upsert profile if missing or needs update
    if (!profile || (overrideRole && profile.role !== overrideRole)) {
      console.log("finalizeSupabaseSession: attempting upsert...");
      try {
        const { error } = await timeoutPromise(
          supabase.from('app_users').upsert({
            id: u.id,
            email: email,
            role: role,
            name: (u.user_metadata?.full_name || email.split('@')[0]),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' }),
          3000,
          "finalizeSupabaseSession-upsert"
        );
        if (error) console.log("finalizeSupabaseSession: upsert error (ignoring if RLS)", error);
      } catch (err) {
        console.warn("finalizeSupabaseSession: upsert timed out or failed", err);
      }

      // Re-fetch profile to be sure (optional, but good verification)
      if (!profile) profile = await getSupabaseUserProfile(u.id);
    }

    // Construct User object guaranteed to return even if DB failed
    const finalRole = profile?.role || role || 'customer';
    const mapped: User = {
      email,
      name: profile?.name || (email || '').split('@')[0],
      role: finalRole as any
    };

    setCurrentUser(mapped);
    try { localStorage.setItem('session_user_id', u.id); } catch { }
    // Non-blocking background fetch
    getSupabaseCustomerProfile(u.id).catch(() => { });

    console.log("finalizeSupabaseSession: success", mapped);
    return mapped;
  } catch (e) {
    console.error('Session Init Error', e);
    // Emergency fallback to prevent total crash
    return { email: u?.email || '', name: 'User', role: 'customer' };
  }
}

export function initSupabaseAuth(): void {
  if (!isSupabaseEnabled()) return;
  try {
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Supabase Auth Change:", event);
      if (session?.user) {
        // We only actively finalize if we don't have a user or if the event implies a change
        // But to be safe and responsive, we attempt finalize.
        // However, finalize does upserts, so debouncing might be good.
        // For now, simpler is better.
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          await finalizeSupabaseSession(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        localStorage.removeItem('session_user_id');
      }
    });
  } catch { }
}

export async function loginSupabase(email: string, password: string): Promise<User | null> {
  console.log("loginSupabase: attempting login for", email);
  if (!isSupabaseEnabled()) {
    console.warn("loginSupabase: Supabase not enabled");
    return null;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("loginSupabase error:", error);
      throw error;
    }
    console.log("loginSupabase: auth successful, finalizing...");
    // Pass the user we just got - DO NOT fetch it again
    return await finalizeSupabaseSession(data.user);
  } catch (err) {
    console.error("loginSupabase: exception", err);
    throw err;
  }
}

export async function signupSupabase(email: string, password: string, name?: string): Promise<User | null> {
  console.log("signupSupabase: attempting signup for", email);
  if (!isSupabaseEnabled()) return null;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name || email.split('@')[0] } }
    });

    if (error) {
      console.error("signupSupabase error:", error);
      return null;
    }

    if (data.user) {
      if (!data.session) {
        console.log("signupSupabase: confirm email required");
        return { email, name: name || email.split('@')[0], role: 'customer' };
      }
      return await finalizeSupabaseSession(data.user);
    }
    return null;
  } catch (err) {
    console.error("signupSupabase exception:", err);
    return null;
  }
}

export function logout(): void {
  if (isSupabaseEnabled()) {
    supabase.auth.signOut().catch(() => { });
    localStorage.removeItem('customerProfile');
    localStorage.removeItem('session_user_id');
    setCurrentUser(null);
  }
}
