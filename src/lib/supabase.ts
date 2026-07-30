import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key missing! Check your .env file.');
}

const realClient = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl.startsWith('http') && supabaseAnonKey.length > 20;
};

// Chainable mock for intercepted queries
const createChainableMock = () => {
  const mock: any = {};
  const chain = () => mock;
  mock.select = chain;
  mock.insert = chain;
  mock.upsert = chain;
  mock.update = chain;
  mock.delete = chain;
  mock.eq = chain;
  mock.in = chain;
  mock.match = chain;
  mock.order = chain;
  mock.limit = chain;
  mock.single = async () => ({ data: {}, error: null });
  mock.maybeSingle = async () => ({ data: null, error: null });
  // Make it awaitable
  mock.then = (resolve: any) => resolve({ data: [], error: null });
  return mock;
};

// Proxy to globally intercept all writes during Demo Mode
export const supabase = new Proxy(realClient, {
  get(target, prop) {
    if (prop === 'from') {
      return (table: string) => {
        const queryBuilder = target.from(table);
        return new Proxy(queryBuilder, {
          get(qbTarget, qbProp) {
            const writeMethods = ['insert', 'update', 'upsert', 'delete'];
            if (typeof qbProp === 'string' && writeMethods.includes(qbProp)) {
               return (...args: any[]) => {
                 if (localStorage.getItem("demo_mode_active") === "true") {
                   console.log(`[DEMO MODE GUARD] Intercepted ${qbProp} on table: ${table}`);
                   // Optional: toast dispatch here
                   if (typeof window !== 'undefined') {
                       window.dispatchEvent(new CustomEvent('demo-blocked-action', { detail: { action: `${qbProp} ${table}` } }));
                   }
                   return createChainableMock();
                 }
                 // Not demo mode, call the real method
                 const result = (qbTarget as any)[qbProp](...args);
                 // Need to wrap the result to ensure subsequent chained calls aren't intercepted incorrectly,
                 // but typically write methods are at the start of the chain (e.g. .insert().select()),
                 // so returning the real result is fine as long as we only intercept the start of the chain.
                 return result;
               };
            }
            const value = (qbTarget as any)[qbProp];
            if (typeof value === 'function') {
                return value.bind(qbTarget);
            }
            return value;
          }
        });
      };
    }
    const value = (target as any)[prop];
    if (typeof value === 'function') {
        return value.bind(target);
    }
    return value;
  }
});

export default supabase;
