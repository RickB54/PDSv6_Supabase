import supabase from '@/lib/supabase';
import { isDemoActive } from '@/lib/supa-data';

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
  if (isDemoActive()) return { ...input, id: `demo_book_${Date.now()}` };
  try {
    // 1. Upsert Customer (Match on Email)
    // 1. Upsert Customer (Match on Email if exists, otherwise create new)
    let customerId: string | null = null;
    if (input.email) {
      const { data: existing } = await supabase.from('customers').select('id').eq('email', input.email).maybeSingle();
      if (existing) {
        customerId = existing.id;
      } else {
        // Create new customer - Don't use .single() as it requires SELECT permissions which anon might not have
        const { data: newCust, error: cErr } = await supabase.from('customers').insert({
          full_name: input.customer_name,
          email: input.email,
          phone: input.phone,
          type: 'customer',
          notes: 'Created via Book Now'
        }).select('id');
        
        if (cErr) {
          console.warn("Customer creation warning (likely RLS or duplicate):", cErr);
          // If we can't create/select the customer, we'll try to proceed with a name-only booking
          // or a late-binding approach.
        }
        customerId = newCust && newCust[0] ? newCust[0].id : null;
      }
    } else {
      // No email provided - Create name-only customer
      const { data: newCust, error: cErr } = await supabase.from('customers').insert({
        full_name: input.customer_name,
        phone: input.phone || null,
        type: 'customer',
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
    const bookedByInfo = input.booked_by || 'Customer Web';
    const fullNotes = input.add_ons && input.add_ons.length > 0
      ? (input.notes ? `${input.notes}\n\nAdd-Ons: ${input.add_ons.join(', ')}\nBooked by: ${bookedByInfo}` : `Add-Ons: ${input.add_ons.join(', ')}\nBooked by: ${bookedByInfo}`)
      : (input.notes ? `${input.notes}\nBooked by: ${bookedByInfo}` : `Booked by: ${bookedByInfo}`);

    const bookingPayload = {
      customer_id: customerId,
      customer_name: input.customer_name, // Direct backup
      vehicle_id: vehicleId,
      service_package: input.package,
      service_price: input.price_total,
      scheduled_at: input.date,
      status: input.status || 'pending',
      notes: fullNotes,
      add_ons: input.add_ons,  // Store add-ons
      source_origin: bookedByInfo,
      // SNAPSHOT: Store vehicle & customer details in booking_vehicle JSONB so they appear even if not joined
      booking_vehicle: {
        customer_name: input.customer_name,
        customer_email: input.email,
        customer_phone: input.phone,
        year: input.year || '',
        make: input.make || '',
        model: input.model || '',
        type: input.vehicle_type || ''
      }
    };

    const { data, error } = await supabase.from('bookings').insert(bookingPayload).select();

    if (error) {
      console.error("Booking Table Insert Error:", error);
      throw error;
    }
    return data && data[0] ? data[0] : bookingPayload;
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
  if (isDemoActive()) return { id, ...patch };
  // Simplistic mapping for now
  const dbPatch: any = {};
  if (patch.status) dbPatch.status = patch.status;
  if (patch.date) dbPatch.scheduled_at = patch.date;

  const { data, error } = await supabase.from('bookings').update(dbPatch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function remove(id: string | number) {
  if (isDemoActive()) return true;
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function purgeMockData() {
  // Specifically delete bookings labeled with administrative test signatures
  // We use multiple filters to ensure all varieties of test data are caught
  const { error } = await supabase
    .from('bookings')
    .delete()
    .or('notes.ilike.%[MOCK_DATA]%,notes.ilike.%Test booking - can be deleted%');
  
  if (error) throw error;
  return true;
}
