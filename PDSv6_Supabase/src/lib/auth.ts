// Authentication utilities with toggleable Netlify Identity integration.
// Default remains the existing test login until explicitly enabled.
export interface User {
  email: string;
  role: 'customer' | 'employee' | 'admin';
  name: string;
}

type AuthMode = 'test' | 'identity' | 'supabase';

function getEnvAuthMode(): AuthMode {
  try {
    const normalize = (v: unknown) => String(v ?? '')
      .trim()
      .replace(/^['"`]\s*/, '')
      .replace(/\s*['"`]$/, '');

    const envModeRaw = import.meta.env.VITE_AUTH_MODE;
    const envMode = normalize(envModeRaw).toLowerCase();
    // If explicitly set, respect it (after normalization)
    if (envMode === 'identity' || envMode === 'test' || envMode === 'supabase') return envMode as AuthMode;

    // Fallback: if Supabase keys are present and not placeholders, treat as supabase
    const url = normalize(import.meta.env.VITE_SUPABASE_URL);
    const anon = normalize(import.meta.env.VITE_SUPABASE_ANON_KEY);
    const looksConfigured = url.startsWith('http') && anon.length > 20 && !url.includes('YOUR-PROJECT') && !anon.includes('YOUR-ANON-KEY');
    if (looksConfigured) return 'supabase';
  } catch { }
  return 'test';
}

export function getAuthMode(): AuthMode {
  // Prefer environment over localStorage to avoid stale overrides
  const envMode = getEnvAuthMode();
  try {
    const prev = localStorage.getItem('auth_mode');
    if (prev !== envMode) localStorage.setItem('auth_mode', envMode);
  } catch { }
  return envMode;
}

export function isIdentityEnabled(): boolean {
  return getAuthMode() === 'identity';
}

export function isSupabaseEnabled(): boolean {
  return getAuthMode() === 'supabase' || isSupabaseConfigured();
}

export function setAuthMode(mode: AuthMode) {
  localStorage.setItem('auth_mode', mode);
  if (mode === 'identity') {
    initIdentity();
  } else if (mode === 'supabase') {
    initSupabaseAuth();
  }
}

const QUICK_ACCESS_USERS = {
  customer: {
    email: 'customer@gmail.com',
    role: 'customer' as const,
    name: 'Customer User'
  },
  employee: {
    email: 'employee@gmail.com',
    role: 'employee' as const,
    name: 'Employee User'
  },
  admin: {
    email: 'admin@gmail.com',
    role: 'admin' as const,
    name: 'Admin User'
  }
};

export function getCurrentUser(): User | null {
  const mode = (import.meta.env.VITE_AUTH_MODE || 'local').toLowerCase();
  if (mode === 'local') {
    const isAdmin = localStorage.getItem('adminMode') === 'true';
    if (isAdmin) return { email: 'admin@local', name: 'Admin', role: 'admin' };
    return null;
  }

  if (isIdentityEnabled()) {
    try {
      const user = identityCurrentUser();
      if (user) return user;
    } catch { }
  }
  if (isSupabaseEnabled()) {
    try {
      const sid = localStorage.getItem('session_user_id');
      if (!sid) return null;
    } catch { }
    const cached = localStorage.getItem('currentUser');
    if (cached) return JSON.parse(cached);
    return null;
  }
  const stored = localStorage.getItem('currentUser');
  if (!stored) return null;
  return JSON.parse(stored);
}

export function setCurrentUser(user: User | null): void {
  const mode = (import.meta.env.VITE_AUTH_MODE || 'local').toLowerCase();
  if (mode === 'local') {
    // In local mode, we primarily drive off adminMode, but if something tries to set user, we can sync it.
    if (user?.role === 'admin') localStorage.setItem('adminMode', 'true');
    else localStorage.removeItem('adminMode');
  }

  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
  try {
    // Notify app of auth state changes in same tab
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: user }));
  } catch {
    // noop
  }
}

export function quickAccessLogin(role: 'customer' | 'employee' | 'admin'): User {
  const user = QUICK_ACCESS_USERS[role];
  setCurrentUser(user);
  return user;
}

// Identity integration
let identityInitialized = false;
let identityListenersRegistered = false;

function ensureIdentityWidget(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as any;
    if (w.netlifyIdentity) {
      resolve();
      return;
    }
    // Avoid double-inject
    if (document.querySelector('script[data-netlify-identity]')) {
      (document.querySelector('script[data-netlify-identity]') as HTMLScriptElement).addEventListener('load', () => resolve());
      return;
    }
    const s = document.createElement('script');
    s.src = '/.netlify/identity/widget.js';
    s.async = true;
    s.defer = true;
    s.setAttribute('data-netlify-identity', 'true');
    s.onload = () => resolve();
    s.onerror = () => resolve(); // Resolve even if not available locally
    document.head.appendChild(s);
  });
}

export function initIdentity(): void {
  if (identityInitialized) return;
  identityInitialized = true;
  ensureIdentityWidget().then(() => {
    const w = window as any;
    const id = w.netlifyIdentity;
    if (!id) return;
    // Initialize to pick up persisted sessions
    try { id.init(); } catch { }
    if (!identityListenersRegistered) {
      identityListenersRegistered = true;
      try {
        id.on('login', (u: any) => {
          const mapped = mapIdentityUser(u);
          setCurrentUser(mapped);
        });
        id.on('logout', () => {
          setCurrentUser(null);
        });
        id.on('init', (u: any) => {
          if (u) setCurrentUser(mapIdentityUser(u));
        });
      } catch { }
    }
  });
}

// Supabase integration
import supabase, { isSupabaseConfigured } from './supabase';

// Role inference via environment email lists to restore admin/employee menus
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
    // Hardcoded safety fallback for immediate restoration if env not set
    const defaultAdmins = ['primedetailsolutions.ma.nh@gmail.com'];
    const adminList = admins.length ? admins : defaultAdmins;
    if (adminList.includes(e)) return 'admin';
    if (employees.includes(e)) return 'employee';
  } catch { }
  return null;
}

// Exported helper: map current Supabase session to our User and persist
export async function finalizeSupabaseSession(): Promise<User | null> {
  try {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u) return null;
    const profile = await getSupabaseUserProfile(u.id);
    const email = u.email || '';
    const overrideRole = getEmailRoleOverride(email);
    const role = (profile?.role as any) || overrideRole || 'customer';
    const mapped: User = { email, name: profile?.name || (email || '').split('@')[0], role };
    setCurrentUser(mapped);
    // Persist role into auth.user_metadata for immediate claim availability
    try { await supabase.auth.updateUser({ data: { role } }); } catch { }
    // Ensure app_users has a row and role persisted on every session finalize
    try {
      const { data: existsRow } = await supabase.from('app_users').select('id').eq('id', u.id).maybeSingle();
      if (!existsRow) {
        // Try anon upsert first (works if RLS allows)
        const { error: upErr } = await supabase
          .from('app_users')
          .upsert({ id: u.id, email, role, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        if (upErr) {
          // Fall back to service role edge function to bootstrap the row
          try { await supabase.functions.invoke('bootstrap-role', { body: { userId: u.id, email, role } }); } catch { }
        }
      } else {
        // Keep role in sync for existing rows if needed
        try { await supabase.from('app_users').update({ role, updated_at: new Date().toISOString() }).eq('id', u.id); } catch { }
      }
    } catch { }
    try { localStorage.setItem('session_user_id', u.id); } catch { }
    try { await getSupabaseCustomerProfile(u.id); } catch { }
    return mapped;
  } catch {
    return null;
  }
}

export function initSupabaseAuth(): void {
  if (!isSupabaseEnabled()) return;
  try {
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await getSupabaseUserProfile(session.user.id);
        const email = session.user.email || '';
        const overrideRole = getEmailRoleOverride(email);
        const role = (profile?.role as any) || overrideRole || 'customer';
        const mapped: User = { email, name: profile?.name || (email || '').split('@')[0], role };
        setCurrentUser(mapped);
        try { localStorage.setItem('session_user_id', session.user.id); } catch { }
        // Ensure app_users has at least a customer row when missing
        if (!profile) {
          try {
            await supabase.from('app_users').upsert({ id: session.user.id, email, role, updated_at: new Date().toISOString() }, { onConflict: 'id' });
          } catch { }
        }
        try { await getSupabaseCustomerProfile(session.user.id); } catch { }
      } else {
        try { localStorage.removeItem('session_user_id'); } catch { }
        setCurrentUser(null);
      }
    });
    // Ensure initial session mapping on load
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (u) {
        const profile = await getSupabaseUserProfile(u.id);
        const email = u.email || '';
        const overrideRole = getEmailRoleOverride(email);
        const role = (profile?.role as any) || overrideRole || 'customer';
        const mapped: User = { email, name: profile?.name || (email || '').split('@')[0], role };
        setCurrentUser(mapped);
        // Ensure role claim available in session metadata
        try { await supabase.auth.updateUser({ data: { role } }); } catch { }
        try { localStorage.setItem('session_user_id', u.id); } catch { }
        try { await getSupabaseCustomerProfile(u.id); } catch { }
      } else {
        try { localStorage.removeItem('session_user_id'); } catch { }
        setCurrentUser(null);
      }
    })();
  } catch { }
}

async function getSupabaseUserProfile(userId: string): Promise<{ role: 'admin' | 'employee' | 'customer'; name?: string } | null> {
  try {
    const { data, error } = await supabase.from('app_users').select('role,name').eq('id', userId).maybeSingle();
    if (error) return null;
    return (data as any) || null;
  } catch { return null; }
}

async function getSupabaseCustomerProfile(userId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase.from('customers').select('*').eq('id', userId).maybeSingle();
    if (error) return null;
    if (data) {
      try { localStorage.setItem('customerProfile', JSON.stringify(data)); } catch { }
      try { window.dispatchEvent(new CustomEvent('customer-profile-changed', { detail: data })); } catch { }
    }
    return data || null;
  } catch { return null; }
}

export async function loginSupabase(email: string, password: string): Promise<User | null> {
  if (!isSupabaseEnabled()) return null;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return null;
    const userId = data.user?.id;
    const profile = userId ? await getSupabaseUserProfile(userId) : null;
    const emailResolved = data.user?.email || email;
    const overrideRole = getEmailRoleOverride(emailResolved);
    const role = (profile?.role as any) || overrideRole || 'customer';
    const mapped: User = { email: emailResolved, name: profile?.name || (emailResolved.split('@')[0]), role };
    setCurrentUser(mapped);
    // Ensure role claim is written to auth.user_metadata for consistent routing
    try { await supabase.auth.updateUser({ data: { role } }); } catch { }
    // Upsert app_users role if missing; helps admin/employee assignment
    if (userId) {
      try {
        const { data: existsRow } = await supabase.from('app_users').select('id').eq('id', userId).maybeSingle();
        if (!existsRow) {
          const { error: upErr } = await supabase
            .from('app_users')
            .upsert({ id: userId, email: emailResolved, role, updated_at: new Date().toISOString() }, { onConflict: 'id' });
          if (upErr) {
            try { await supabase.functions.invoke('bootstrap-role', { body: { userId, email: emailResolved, role } }); } catch { }
          }
        }
      } catch { }
    }
    if (userId) { try { localStorage.setItem('session_user_id', userId); } catch { } }
    if (userId) { try { await getSupabaseCustomerProfile(userId); } catch { } }
    return mapped;
  } catch {
    return null;
  }
}

export async function signupSupabase(email: string, password: string, name?: string): Promise<User | null> {
  if (!isSupabaseEnabled()) return createAccount(email, password, name || email.split('@')[0]);
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return null;
    const userId = data.user?.id;
    if (userId) {
      try {
        const { data: existsRow } = await supabase.from('app_users').select('id').eq('id', userId).maybeSingle();
        if (!existsRow) {
          const { error: upErr } = await supabase
            .from('app_users')
            .upsert({ id: userId, email, role: 'customer', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'id' });
          if (upErr) {
            try { await supabase.functions.invoke('bootstrap-role', { body: { userId, email, role: 'customer' } }); } catch { }
          }
        }
        // Customers profile best-effort
        try { await supabase.from('customers').upsert({ id: userId, email, name: name || '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'id' }); } catch { }
      } catch { }
      // Persist a default customer role claim into auth.user_metadata
      try { await supabase.auth.updateUser({ data: { role: 'customer' } }); } catch { }
    }
    const mapped: User = { email, name: name || (email.split('@')[0]), role: 'customer' };
    setCurrentUser(mapped);
    if (userId) { try { localStorage.setItem('session_user_id', userId); } catch { } }
    if (userId) { try { await getSupabaseCustomerProfile(userId); } catch { } }
    return mapped;
  } catch {
    return null;
  }
}

function mapIdentityUser(u: any): User {
  const email: string = u?.email ?? '';
  const name: string = u?.user_metadata?.full_name ?? (email ? email.split('@')[0] : '');
  const roles: string[] = (u?.app_metadata?.roles || u?.user_metadata?.roles || []) as string[];
  let role: 'customer' | 'employee' | 'admin' = 'customer';
  if (roles.includes('admin')) role = 'admin';
  else if (roles.includes('employee')) role = 'employee';
  return { email, name, role };
}

function identityCurrentUser(): User | null {
  const w = window as any;
  const id = w.netlifyIdentity;
  if (!id) return null;
  try {
    const raw = id.currentUser();
    if (!raw) return null;
    return mapIdentityUser(raw);
  } catch {
    return null;
  }
}

export function beginLogin(_roleHint?: 'employee' | 'admin') {
  if (!isIdentityEnabled()) return quickAccessLogin(_roleHint || 'employee');
  initIdentity();
  const w = window as any;
  const id = w.netlifyIdentity;
  if (!id) return null;
  try {
    id.open('login');
  } catch {
    // Fallback: open default
    try { id.open(); } catch { }
  }
  return null;
}

export function login(email: string, password: string): User {
  if (isIdentityEnabled()) {
    // In Identity mode, use the hosted widget; interactive login handled by beginLogin()
    beginLogin();
    const user = identityCurrentUser();
    if (user) return user;
    // Return a neutral customer until widget completes
    return { email, role: 'customer', name: email.split('@')[0] };
  }
  // Test mode: never grant admin/employee by email heuristics
  const user: User = {
    email,
    role: 'customer',
    name: email.split('@')[0]
  };

  setCurrentUser(user);
  return user;
}

export function createAccount(email: string, password: string, name: string): User {
  if (isIdentityEnabled()) {
    initIdentity();
    const w = window as any;
    const id = w.netlifyIdentity;
    // Use widget signup; mapping occurs on 'login' once completed
    try { id.open('signup'); } catch { try { id.open(); } catch { } }
    const user = identityCurrentUser();
    if (user) return user;
    return { email, role: 'customer', name };
  }
  const user: User = {
    email,
    role: 'customer',
    name
  };

  setCurrentUser(user);
  return user;
}

export function logout(): void {
  if (isIdentityEnabled()) {
    try {
      const w = window as any;
      const id = w.netlifyIdentity;
      if (id) id.logout();
    } catch { }
    setCurrentUser(null);
    return;
  }
  if (isSupabaseEnabled()) {
    (async () => { try { await supabase.auth.signOut(); } catch { } })();
    try { localStorage.removeItem('customerProfile'); } catch { }
    try { window.dispatchEvent(new CustomEvent('customer-profile-changed', { detail: null })); } catch { }
    try { localStorage.removeItem('session_user_id'); } catch { }
    setCurrentUser(null);
    return;
  }
  // Local mode cleanup
  localStorage.removeItem('adminMode');

  try {
    const prev = localStorage.getItem('impersonator');
    if (prev) {
      const admin = JSON.parse(prev);
      localStorage.removeItem('impersonator');
      setCurrentUser(admin);
      return;
    }
  } catch { }
  setCurrentUser(null);
}
