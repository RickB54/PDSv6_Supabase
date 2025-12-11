import supabase from '@/lib/supabase';

export interface BookingInput {
  customer_name: string;
  phone: string;
  email: string;
  vehicle_type: string;
  package: string;
  add_ons: string[];
  date: string; // ISO
  notes?: string;
  price_total: number;
  status?: string;
  created_by?: string;
}

export async function create(input: BookingInput) {
  const { data, error } = await supabase.from('bookings').insert({
    ...input,
    status: input.status || 'pending',
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function getAll() {
  const { data, error } = await supabase.from('bookings').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function update(id: string | number, patch: Partial<BookingInput>) {
  const { data, error } = await supabase.from('bookings').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function remove(id: string | number) {
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) throw error;
  return true;
}
