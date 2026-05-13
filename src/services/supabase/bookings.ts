import supabase from '@/lib/supabase';
import { isDemoActive } from '@/lib/supa-data';

// Helper to sanitize undefined checks
const clean = (s?: string) => s || null;

export interface BookingInput {
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  end_time?: string;
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
    // 1. Find or create Customer
    // Priority: email match → name match → phone match → create new prospect
    let customerId: string | null = null;

    // Step 1a: Try to find existing customer by email
    if (input.email) {
      const { data: byEmail } = await supabase
        .from('customers')
        .select('id, type')
        .eq('email', input.email)
        .maybeSingle();
      if (byEmail) {
        customerId = byEmail.id;
        console.log('[bookings.ts] Matched existing customer by email:', customerId);
      }
    }

    // Step 1b: If no email match, try by full name
    if (!customerId && input.customer_name) {
      const { data: byName } = await supabase
        .from('customers')
        .select('id, type')
        .ilike('full_name', input.customer_name.trim())
        .maybeSingle();
      if (byName) {
        customerId = byName.id;
        console.log('[bookings.ts] Matched existing customer by name:', customerId);
      }
    }

    // Step 1c: If still no match, try by phone
    if (!customerId && input.phone) {
      const normalizedPhone = input.phone.replace(/\D/g, '');
      if (normalizedPhone.length >= 7) {
        const { data: byPhone } = await supabase
          .from('customers')
          .select('id, type')
          .ilike('phone', `%${normalizedPhone}%`)
          .maybeSingle();
        if (byPhone) {
          customerId = byPhone.id;
          console.log('[bookings.ts] Matched existing customer by phone:', customerId);
        }
      }
    }

    // Step 1d: No match at all — create a new prospect record
    if (!customerId) {
      const insertPayload: any = {
        full_name: input.customer_name,
        phone: input.phone || null,
        type: 'prospect',
        notes: input.email ? 'Created via Book Now' : 'Created via Book Now (Staff Entry)'
      };
      if (input.email) insertPayload.email = input.email;

      const { data: newCust, error: cErr } = await supabase
        .from('customers')
        .insert(insertPayload)
        .select('id');

      if (cErr) {
        console.warn("Customer creation warning (likely RLS or duplicate):", cErr);
      }
      customerId = newCust && newCust[0] ? newCust[0].id : null;
      console.log('[bookings.ts] Created new prospect:', customerId);
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
      vehicle_id: vehicleId,
      service_package: input.package,
      service_price: input.price_total,
      scheduled_at: input.date,
      status: input.status || 'pending',
      notes: fullNotes,
      add_ons: input.add_ons,  // Store add-ons
      end_time: input.end_time || null,
      source_origin: bookedByInfo,
      // SNAPSHOT: Store vehicle & customer details in booking_vehicle JSONB so they appear even if not joined
      booking_vehicle: {
        customer_name: input.customer_name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        year: input.year || '',
        make: input.make || '',
        model: input.model || '',
        type: input.vehicle_type || ''
      }
    };

    console.log('[bookings.ts] SAVING BOOKING PAYLOAD:', JSON.stringify(bookingPayload, null, 2));

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
