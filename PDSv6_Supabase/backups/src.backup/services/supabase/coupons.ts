import supabase from '@/lib/supabase';

export async function getAll() {
  const { data, error } = await supabase.from('coupons').select('*').order('code');
  if (error) throw error;
  return data || [];
}

export async function upsert(rows: any[]) {
  const { data, error } = await supabase.from('coupons').upsert(rows, { onConflict: 'code' }).select('*');
  if (error) throw error;
  return data || [];
}

export async function create(row: any) {
  const { data, error } = await supabase.from('coupons').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

export async function update(code: string, patch: any) {
  const { data, error } = await supabase.from('coupons').update(patch).eq('code', code).select('*').single();
  if (error) throw error;
  return data;
}

export async function remove(code: string) {
  const { error } = await supabase.from('coupons').delete().eq('code', code);
  if (error) throw error;
  return true;
}

export async function toggle(code: string, active: boolean) {
  const { data, error } = await supabase.from('coupons').update({ active }).eq('code', code).select('*').single();
  if (error) throw error;
  return data;
}

