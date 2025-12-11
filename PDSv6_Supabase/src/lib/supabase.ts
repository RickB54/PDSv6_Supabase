// src/lib/supabase.ts
// Runtime compatibility stub: when VITE_AUTH_MODE=local this stub prevents network calls.
// Keep this file in place. It MUST NOT throw. It should return harmless results.

const MODE = (import.meta.env.VITE_AUTH_MODE || 'local').toLowerCase();

if (MODE === 'supabase') {
  // If you later re-enable Supabase, restore the original client here.
  // For now, we intentionally do not initialize a real client in this branch.
  // (This prevents accidental network usage in local dev.)
}

// Minimal supabase-like stubs used by the app.
// Extend if you find additional methods the app calls.
export const supabase = {
  auth: {
    getUser: async () => ({ data: null, error: null }),
    getSession: async () => ({ data: null, error: null }),
    signInWithPassword: async () => ({ data: null, error: { message: 'supabase-disabled' } }),
    signUp: async () => ({ data: null, error: { message: 'supabase-disabled' } }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    updateUser: async () => ({ data: null, error: null }),
  },
  from: (table: string) => {
    const createBuilder = (data: any = []) => {
      const result = { data, error: null };
      const builder: any = {
        select: () => builder,
        order: () => builder,
        eq: () => builder,
        in: () => builder,
        single: async () => ({ data: Array.isArray(data) ? data[0] || {} : data, error: null }),
        maybeSingle: async () => ({ data: Array.isArray(data) ? data[0] || null : data, error: null }),
        upsert: () => builder,
        insert: () => builder,
        update: () => builder,
        delete: () => builder,
        then: (resolve: any) => resolve(result)
      };
      return builder;
    };
    return createBuilder([]);
  },
  storage: {
    from: () => ({ upload: async () => ({ error: null }), download: async () => ({ data: null, error: null }) })
  },
  functions: {
    invoke: async () => ({ data: null, error: null }),
  },
  rpc: async () => ({ data: null, error: null }),
};

export const isSupabaseConfigured = () => false;

export default supabase;
