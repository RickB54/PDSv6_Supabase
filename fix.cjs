
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const supabaseKeyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const supabaseUrl = supabaseUrlMatch ? supabaseUrlMatch[1].trim() : '';
const supabaseKey = supabaseKeyMatch ? supabaseKeyMatch[1].trim() : '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const { data, error } = await supabase.from('bookings').select('*');
  if (error) { console.error('Error:', error); return; }
  let nicks = data.filter(b => b.customer === 'Nick Tolle' || b.customer_name === 'Nick Tolle' || (b.booking_vehicle && b.booking_vehicle.customer_name === 'Nick Tolle') || (b.notes && b.notes.includes('Nick Tolle')));
  console.log('Found Nick bookings:', nicks.length);
  for (const b of nicks) {
    let bv = b.booking_vehicle || {};
    if (bv.placeOfService === 'Customer\'s address' || b.place_of_service === 'Customer\'s address' || b.placeOfService === 'Customer\'s address') {
       bv.placeOfService = 'Shop in Methuen';
       await supabase.from('bookings').update({ booking_vehicle: bv, place_of_service: 'Shop in Methuen' }).eq('id', b.id);
       console.log('Fixed Nick booking:', b.id);
    } else {
       console.log('Nick booking already fine:', b.id, bv.placeOfService);
    }
  }
}
fix();

