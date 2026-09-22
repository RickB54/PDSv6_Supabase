import supabase from '@/lib/supabase';
import { isDemoActive } from '@/lib/supa-data';
import { appCache } from '@/lib/app-cache';

export async function getAll() {
  return appCache.fetchWithCache('general:packages_list', async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  }, { domain: 'general', ttlMs: 15 * 60 * 1000 });
}

export async function upsert(rows: any[]) {
  if (isDemoActive()) return rows;
  const { data, error } = await supabase.from('packages').upsert(rows, { onConflict: 'id' }).select('*');
  if (error) throw error;
  appCache.invalidateLocal('general:packages_list');
  return data || [];
}

export async function create(row: any) {
  if (isDemoActive()) return { ...row, id: row.id || `demo_${Date.now()}` };
  const { data, error } = await supabase.from('packages').insert(row).select('*').single();
  if (error) throw error;
  appCache.invalidateLocal('general:packages_list');
  return data;
}

export async function update(id: string | number, patch: any) {
  if (isDemoActive()) return { id, ...patch };
  const { data, error } = await supabase.from('packages').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  appCache.invalidateLocal('general:packages_list');
  return data;
}

export async function remove(id: string | number) {
  if (isDemoActive()) return true;
  const { error } = await supabase.from('packages').delete().eq('id', id);
  if (error) throw error;
  appCache.invalidateLocal('general:packages_list');
  return true;
}
