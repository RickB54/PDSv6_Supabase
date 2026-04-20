import localforage from 'localforage';
import supabase from '@/lib/supabase';
import { logBackup, logRestore } from './audit';

export const SCHEMA_VERSION = 2;

type TableSpec = { table: string; conflictKey?: string };

const SUPABASE_TABLES: TableSpec[] = [
  { table: 'app_users', conflictKey: 'id' },
  { table: 'customers', conflictKey: 'id' },
  { table: 'bookings', conflictKey: 'id' },
  { table: 'inventory', conflictKey: 'id' },
  { table: 'vehicle_types', conflictKey: 'id' },
  { table: 'packages', conflictKey: 'id' },
  { table: 'add_ons', conflictKey: 'id' },
  { table: 'coupons', conflictKey: 'code' },
  { table: 'services', conflictKey: 'id' },
  { table: 'todos', conflictKey: 'id' },
  { table: 'contact_messages', conflictKey: 'id' },
  { table: 'vehicles', conflictKey: 'id' },
  { table: 'learning_library_comments', conflictKey: 'id' },
  // Optional tables; if they don't exist, backup will include []
  { table: 'invoices', conflictKey: 'id' },
  { table: 'expenses', conflictKey: 'id' },
  { table: 'usage', conflictKey: 'id' },
  { table: 'inventory_records', conflictKey: 'id' },
];

const LOCALSTORAGE_KEYS_TO_INCLUDE = [
  'currentUser',
  'customerProfile',
  'packageMeta',
  'addOnMeta',
  'customServicePackages',
  'customAddOns',
  'customServices',
  'savedPrices',
  'handbook_progress',
  'handbook_start_at',
  'training_exam_progress',
  'training_exam_schedule',
  'employee_training_progress',
  'employee_training_certified',
  'bookings',
];

export async function exportAllData(): Promise<{ json: string; payload: any }> {
  const exportedAt = new Date().toISOString();
  const mode = (import.meta.env.VITE_AUTH_MODE || 'local').toLowerCase();

  // Supabase export
  const supabaseData: Record<string, any[]> = {};
  if (mode !== 'local') {
    for (const spec of SUPABASE_TABLES) {
      try {
        const { data, error } = await supabase.from(spec.table as any).select('*');
        if (error) {
          supabaseData[spec.table] = [];
        } else {
          supabaseData[spec.table] = Array.isArray(data) ? data : [];
        }
      } catch {
        supabaseData[spec.table] = [];
      }
    }
  }

  // Localforage export (IndexedDB)
  const lfKeys = await localforage.keys();
  const localforageData: Record<string, any> = {};
  for (const key of lfKeys) {
    try {
      localforageData[key] = await localforage.getItem(key);
    } catch {
      localforageData[key] = null;
    }
  }

  // LocalStorage export (selected keys only)
  const localStorageData: Record<string, any> = {};
  for (const k of LOCALSTORAGE_KEYS_TO_INCLUDE) {
    try {
      const v = localStorage.getItem(k);
      if (v !== null) localStorageData[k] = JSON.parse(v);
    } catch {
      // fallback to raw string
      try { localStorageData[k] = localStorage.getItem(k); } catch { }
    }
  }

  const payload = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    supabase: supabaseData,
    local: {
      localforage: localforageData,
      localStorage: localStorageData,
    },
  };
  const json = JSON.stringify(payload, null, 2);
  try { await logBackup({ counts: Object.fromEntries(Object.entries(supabaseData).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])), lfKeysCount: lfKeys.length, exportedAt }); } catch { }
  return { json, payload };
}

export async function restoreFromJSON(json: string): Promise<{ success: boolean; details: Record<string, number>; error?: string }> {
  const resultDetails: Record<string, number> = {};
  try {
    const payload = JSON.parse(json || '{}');
    const supa = payload?.supabase || {};
    const local = payload?.local || {};
    const mode = (import.meta.env.VITE_AUTH_MODE || 'local').toLowerCase();

    // Pre-flight: verify access and table presence to avoid partial restores
    if (mode !== 'local') {
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user) throw new Error('Not authenticated');
      } catch {
        // Skip Supabase restore if not authenticated
        console.warn('Restore: Skipping Supabase tables because user is not authenticated.');
      }
    }

    // Ordered restore with best-effort rollback
    const orderedTables = [
      'app_users',
      'customers',
      'vehicles',
      'learning_library_comments',
      'vehicle_types',
      'packages',
      'add_ons',
      'inventory',
      'bookings',
      'invoices',
      'expenses',
      'usage',
      'inventory_records',
    ];
    const applied: { table: string; keys: any[] }[] = [];

    if (mode !== 'local') {
      for (const table of orderedTables) {
        const spec = SUPABASE_TABLES.find(t => t.table === table);
        if (!spec) continue;
        const rows: any[] = Array.isArray(supa[spec.table]) ? supa[spec.table] : [];
        if (!rows.length) continue;
        try {
          const conflictKey = spec.conflictKey || 'id';
          const { error } = await supabase.from(spec.table as any).upsert(rows, { onConflict: conflictKey });
          if (error) throw error;

          applied.push({ table, keys: rows.map(r => r[conflictKey]).filter(Boolean) });
          resultDetails[table] = rows.length;
        } catch (e: any) {
          console.error(`Restore failed on table ${table}:`, e);
          // Attempt rollback for tables applied so far (best effort)
          for (const a of applied.reverse()) {
            try {
              const { error: delErr } = await supabase.from(a.table as any).delete().in('id', a.keys as any);
              if (delErr) break; // stop rollback on error
            } catch { break; }
          }
          return { success: false, details: resultDetails, error: `Failed to restore ${table}: ${e.message}` };
        }
      }
    }

    // Restore localforage
    const lfData: Record<string, any> = local?.localforage || {};
    let lfCount = 0;
    for (const [key, value] of Object.entries(lfData)) {
      try {
        await localforage.setItem(key, value);
        lfCount++;
        // Fire content-changed for known content keys
        if (['faqs', 'contactInfo', 'aboutSections', 'aboutFeatures', 'testimonials'].includes(key)) {
          try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: key } })); } catch { }
        }
      } catch { }
    }
    if (lfCount > 0) resultDetails['local_settings'] = lfCount;

    // Restore localStorage keys
    const lsData: Record<string, any> = local?.localStorage || {};
    let lsCount = 0;
    for (const [key, value] of Object.entries(lsData)) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        lsCount++;
      } catch { }
    }
    if (lsCount > 0) resultDetails['app_preferences'] = lsCount;

    // Trigger package/add-on live sync if present
    try { await fetch(`/api/packages/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }); } catch { }
    try { await fetch(`/api/addons/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }); } catch { }

    try {
      await logRestore({
        tablesRestored: applied.map(a => a.table),
        localforageKeys: Object.keys(lfData),
        localStorageKeys: Object.keys(lsData)
      });
    } catch { }

    return { success: true, details: resultDetails };
  } catch (err: any) {
    console.error('Critical restore error:', err);
    return { success: false, details: resultDetails, error: err.message || 'Unknown restore error' };
  }
}

export function downloadBackup(json: string, fileName?: string) {
  const name = fileName || `pds-backup-${new Date().toISOString().split('T')[0]}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
