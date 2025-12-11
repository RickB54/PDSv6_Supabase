import supabase from '@/lib/supabase';

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export async function create(input: ContactInput) {
  const { data, error } = await supabase.from('contact_messages').insert({
    ...input,
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function getAll() {
  const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function update(id: string | number, patch: Partial<ContactInput>) {
  const { data, error } = await supabase.from('contact_messages').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function remove(id: string | number) {
  const { error } = await supabase.from('contact_messages').delete().eq('id', id);
  if (error) throw error;
  return true;
}
