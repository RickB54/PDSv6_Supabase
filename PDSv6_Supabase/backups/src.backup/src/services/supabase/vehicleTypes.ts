import supabase from '@/lib/supabase';

export async function getAll() {
  const { data, error } = await supabase.from('vehicle_types').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function create(row: any) {
  const { data, error } = await supabase.from('vehicle_types').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

export async function update(id: string | number, patch: any) {
  const { data, error } = await supabase.from('vehicle_types').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function remove(id: string | number) {
  const { error } = await supabase.from('vehicle_types').delete().eq('id', id);
  if (error) throw error;
  return true;
}
