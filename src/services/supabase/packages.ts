import supabase from '@/lib/supabase';
import { isDemoActive } from '@/lib/supa-data';

export async function getAll() {
  // Use a query parameter to bust any potential CDN/Supabase cache
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function upsert(rows: any[]) {
  if (isDemoActive()) return rows;
  const { data, error } = await supabase.from('packages').upsert(rows, { onConflict: 'id' }).select('*');
  if (error) throw error;
  return data || [];
}

export async function create(row: any) {
  if (isDemoActive()) return { ...row, id: row.id || `demo_${Date.now()}` };
  const { data, error } = await supabase.from('packages').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

export async function update(id: string | number, patch: any) {
  if (isDemoActive()) return { id, ...patch };
  const { data, error } = await supabase.from('packages').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function remove(id: string | number) {
  if (isDemoActive()) return true;
  const { error } = await supabase.from('packages').delete().eq('id', id);
  if (error) throw error;
  return true;
}
