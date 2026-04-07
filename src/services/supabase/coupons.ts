import supabase from '@/lib/supabase';
import { isDemoActive } from '@/lib/supa-data';

export async function getAll() {
  const { data, error } = await supabase.from('coupons').select('*').order('code');
  if (error) throw error;
  return data || [];
}

export async function upsert(rows: any[]) {
  if (isDemoActive()) return rows;
  const { data, error } = await supabase.from('coupons').upsert(rows, { onConflict: 'code' }).select('*');
  if (error) throw error;
  return data || [];
}

export async function create(row: any) {
  if (isDemoActive()) return { ...row, id: row.id || `demo_${Date.now()}` };
  const { data, error } = await supabase.from('coupons').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

export async function update(code: string, patch: any) {
  if (isDemoActive()) return { code, ...patch };
  const { data, error } = await supabase.from('coupons').update(patch).eq('code', code).select('*').single();
  if (error) throw error;
  return data;
}

export async function remove(code: string) {
  if (isDemoActive()) return true;
  const { error } = await supabase.from('coupons').delete().eq('code', code);
  if (error) throw error;
  return true;
}

export async function toggle(code: string, active: boolean) {
  if (isDemoActive()) return { code, active };
  const { data, error } = await supabase.from('coupons').update({ active }).eq('code', code).select('*').single();
  if (error) throw error;
  return data;
}

