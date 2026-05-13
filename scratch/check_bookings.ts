
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, customer_name, booking_vehicle, created_at, customer_id')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching bookings:", error);
    return;
  }

  console.log("RECENT BOOKINGS:");
  data.forEach(b => {
    console.log(`ID: ${b.id}, Status: ${b.status}, Name: ${b.customer_name}, CustomerID: ${b.customer_id}, Notified: ${b.booking_vehicle?.notified}, Created: ${b.created_at}`);
  });
}

check();
