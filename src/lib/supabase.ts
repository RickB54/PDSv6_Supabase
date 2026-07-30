import { createClient } from '@supabase/supabase-js';
import * as mockData from './demoMockData';

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

const getMockDataForTable = (table: string) => {
  switch (table) {
    case 'customers': return mockData.MOCK_CUSTOMERS || [];
    case 'bookings': return mockData.MOCK_BOOKINGS || [];
    case 'invoices': return mockData.MOCK_INVOICES || [];
    case 'employees': return mockData.MOCK_EMPLOYEES || [];
    case 'estimates': return mockData.MOCK_ESTIMATES || [];
    case 'engagements': return mockData.MOCK_ENGAGEMENTS || [];
    case 'prospects': return mockData.MOCK_PROSPECTS || [];
    case 'learning_library_items': return (mockData as any).MOCK_LEARNING_LIBRARY || [];
    case 'mileage_logs': return (mockData as any).MOCK_MILEAGE || [];
    case 'payroll_records': return (mockData as any).MOCK_PAYROLL || [];
    case 'tax_expenses': return (mockData as any).MOCK_ACCOUNTING?.transactions?.filter((t: any) => t.type === 'expense' || t.type === 'Expense') || [];
    default: return [];
  }
};

// Chainable mock for intercepted queries
const createChainableMock = (table: string, method: string) => {
  const mock: any = {};
  
  // Start with full mock data for this table if it's a read, else empty array
  let currentData = (method === 'select') ? getMockDataForTable(table) : [];
  
  const chain = () => mock;
  mock.select = chain;
  mock.insert = chain;
  mock.upsert = chain;
  mock.update = chain;
  mock.delete = chain;
  
  mock.eq = (column: string, value: any) => {
    if (Array.isArray(currentData)) {
      currentData = currentData.filter((item: any) => item[column] === value);
    }
    return mock;
  };
  mock.in = chain; // Could implement array filtering if needed
  mock.match = chain;
  mock.order = chain; // Could implement sorting if needed
  mock.limit = (count: number) => {
    if (Array.isArray(currentData)) {
        currentData = currentData.slice(0, count);
    }
    return mock;
  };
  
  mock.single = async () => ({ data: Array.isArray(currentData) ? currentData[0] || null : currentData, error: null });
  mock.maybeSingle = async () => ({ data: Array.isArray(currentData) ? currentData[0] || null : currentData, error: null });
  
  // Make it awaitable
  mock.then = (resolve: any) => resolve({ data: currentData, error: null });
  return mock;
};

// Proxy to globally intercept all queries during Demo Mode
export const supabase = new Proxy(realClient, {
  get(target, prop) {
    if (prop === 'functions') {
      return new Proxy(target.functions, {
        get(fnTarget, fnProp) {
          if (fnProp === 'invoke') {
            return async (...args: any[]) => {
               if (localStorage.getItem("demo_mode_active") === "true") {
                   console.log(`[DEMO MODE GUARD] Intercepted FUNCTION INVOKE: ${args[0]}`);
                   if (typeof window !== 'undefined') {
                       window.dispatchEvent(new CustomEvent('demo-blocked-action', { detail: { action: `Function: ${args[0]}` } }));
                   }
                   return { data: { url: '/demo-checkout-success' }, error: null };
               }
               return (fnTarget as any)[fnProp](...args);
            };
          }
          return (fnTarget as any)[fnProp];
        }
      });
    }
    if (prop === 'from') {
      return (table: string) => {
        const queryBuilder = target.from(table);
        return new Proxy(queryBuilder, {
          get(qbTarget, qbProp) {
            const interceptedMethods = ['insert', 'update', 'upsert', 'delete', 'select'];
            if (typeof qbProp === 'string' && interceptedMethods.includes(qbProp)) {
               return (...args: any[]) => {
                 if (localStorage.getItem("demo_mode_active") === "true") {
                   if (qbProp !== 'select') {
                       console.log(`[DEMO MODE GUARD] Intercepted WRITE ${qbProp} on table: ${table}`);
                       if (typeof window !== 'undefined') {
                           window.dispatchEvent(new CustomEvent('demo-blocked-action', { detail: { action: `${qbProp} ${table}` } }));
                       }
                   } else {
                       console.log(`[DEMO MODE GUARD] Intercepted READ ${qbProp} on table: ${table}`);
                   }
                   return createChainableMock(table, qbProp);
                 }
                 // Not demo mode, call the real method
                 const result = (qbTarget as any)[qbProp](...args);
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
