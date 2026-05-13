/**
 * restore_booking.cjs
 * Re-creates the Richard Berube booking for May 26, 2026 that was
 * accidentally deleted when the duplicate prospect record was removed.
 *
 * Run with: node scratch/restore_booking.cjs
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Try both known emails for Richard Berube
  const emails = ['rberube54@gmail.com', 'rick.primeautodetail@gmail.com'];
  let realCust = null;

  for (const email of emails) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, email, phone, type')
      .eq('email', email)
      .maybeSingle();

    console.log(`Checking email ${email}:`, data ? `Found (type=${data.type})` : `Not found`, error ? `Error: ${error.message}` : '');
    if (data && data.type === 'customer') {
      realCust = data;
      break;
    } else if (data) {
      // Found but might be prospect — still use it as fallback
      if (!realCust) realCust = data;
    }
  }

  if (!realCust) {
    // Last resort: fetch recent customers
    const { data: all, error } = await supabase
      .from('customers')
      .select('id, full_name, email, type')
      .order('created_at', { ascending: false })
      .limit(10);
    console.log('All recent customers:', all);
    console.log('Error:', error);
    console.error('❌ Could not find a Richard Berube customer record. Please check Supabase dashboard.');
    process.exit(1);
  }

  console.log(`\n✅ Using: ${realCust.full_name} (${realCust.email}) — ID: ${realCust.id} [type: ${realCust.type}]`);

  // 2. Insert the restored booking
  // Date: May 26, 2026 at 1:00 PM ET = 17:00 UTC
  const bookingPayload = {
    customer_id: realCust.id,
    service_package: 'Full Detail',   // Adjust if you know the exact package name
    service_price: 230,
    scheduled_at: '2026-05-26T17:00:00.000Z', // 1:00 PM ET
    status: 'pending',
    source_origin: 'Customer Web',
    notes: 'Restored booking — originally created via Book Now form on 2026-05-13. Booking was lost when duplicate prospect record was deleted.',
    add_ons: [],
    booking_vehicle: {
      customer_name: realCust.full_name,
      email: realCust.email,
      phone: realCust.phone || '',
      address: '',
      year: '',
      make: '',
      model: '',
      type: ''
    }
  };

  const { data: newBooking, error: bErr } = await supabase
    .from('bookings')
    .insert(bookingPayload)
    .select();

  if (bErr) {
    console.error('❌ Failed to insert booking:', bErr);
    process.exit(1);
  }

  console.log('\n✅ Booking restored successfully!');
  console.log('Booking ID:', newBooking[0]?.id);
  console.log('Scheduled:', newBooking[0]?.scheduled_at);
  console.log('Price:', newBooking[0]?.service_price);
  console.log('\n⚠️  NOTE: Please open the booking in the admin panel and verify/update:');
  console.log('  - Service Package (currently set to "Full Detail" — correct if wrong)');
  console.log('  - Vehicle details (year, make, model)');
  console.log('  - Any add-ons that were selected');
}

run().catch(console.error);
