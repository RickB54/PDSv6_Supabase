import supabase from '@/lib/supabase';

// Helper to sanitize undefined checks
const clean = (s?: string) => s || null;

export interface BookingInput {
  customer_name: string;
  phone: string;
  email: string;
  vehicle_type: string;
  make?: string;   // Added
  model?: string;  // Added
  year?: string;   // Added
  package: string;
  add_ons: string[];
  date: string; // ISO
  notes?: string;
  price_total: number;
  status?: string;
  created_by?: string;
  booked_by?: string; // Add this
}

export async function create(input: BookingInput) {
  try {
    // 1. Upsert Customer (Match on Email)
    // 1. Upsert Customer (Match on Email if exists, otherwise create new)
    let customerId: string | null = null;
    if (input.email) {
      const { data: existing } = await supabase.from('customers').select('id').eq('email', input.email).single();
      if (existing) {
        customerId = existing.id;
      } else {
        const { data: newCust, error: cErr } = await supabase.from('customers').insert({
          full_name: input.customer_name,
          email: input.email,
          phone: input.phone,
          notes: 'Created via Book Now'
        }).select('id').single();
        if (cErr) throw cErr;
        customerId = newCust.id;
      }
    } else {
      // No email provided - Create name-only customer
      const { data: newCust, error: cErr } = await supabase.from('customers').insert({
        full_name: input.customer_name,
        phone: input.phone || null,
        notes: 'Created via Book Now (Staff Entry)'
      }).select('id').single();
      if (!cErr && newCust) {
        customerId = newCust.id;
      }
    }

    // 2. Upsert Vehicle (if we have customer)
    let vehicleId: string | null = null;
    if (customerId) {
      const { data: newVeh, error: vErr } = await supabase.from('vehicles').insert({
        customer_id: customerId,
        make: input.make || 'Unknown',
        model: input.model || 'Unknown',
        year: parseInt(input.year || '0') || null,
        type: input.vehicle_type
      }).select('id').single();
      if (!vErr && newVeh) vehicleId = newVeh.id;
      // Ignore vehicle error if duplicates? or simplistic insert. Ideally we check if it exists but for now we just insert a new vehicle record for the booking as "the vehicle being serviced"
    }

    // 3. Create Booking
    const { data, error } = await supabase.from('bookings').insert({
      customer_id: customerId,
      vehicle_id: vehicleId,
      service_package: input.package,
      service_price: input.price_total,
      scheduled_at: input.date,
      status: input.status || 'pending',
      booked_by: input.booked_by || 'Customer Web',
      notes: input.add_ons && input.add_ons.length > 0
        ? (input.notes ? `${input.notes}\n\nAdd-Ons: ${input.add_ons.join(', ')}` : `Add-Ons: ${input.add_ons.join(', ')}`)
        : input.notes,
    }).select('*').single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Supabase Booking Create Failed:", err);
    throw err;
  }
}

export async function getAll() {
  const { data, error } = await supabase.from('bookings').select('*, customers(full_name, email, phone), vehicles(make, model, year)').order('scheduled_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function update(id: string | number, patch: Partial<BookingInput>) {
  // Simplistic mapping for now
  const dbPatch: any = {};
  if (patch.status) dbPatch.status = patch.status;
  if (patch.date) dbPatch.scheduled_at = patch.date;

  const { data, error } = await supabase.from('bookings').update(dbPatch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function remove(id: string | number) {
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) throw error;
  return true;
}
