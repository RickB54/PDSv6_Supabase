import supabase from '@/lib/supabase';
import { isDemoActive } from '@/lib/supa-data';

export async function getAll() {
  const { data, error } = await supabase.from('services').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function create(row: any) {
  if (isDemoActive()) return { ...row, id: row.id || `demo_${Date.now()}` };
  const { data, error } = await supabase.from('services').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

export async function update(id: string | number, patch: any) {
  if (isDemoActive()) return { id, ...patch };
  const { data, error } = await supabase.from('services').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function remove(id: string | number) {
  if (isDemoActive()) return true;
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
  return true;
}
