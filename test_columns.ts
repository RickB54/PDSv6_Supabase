import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('bookings').select('id, customer_id, scheduled_at, service_package, booking_vehicle').limit(1);
  if (error) {
    console.error("TEST FAILED:", error);
  } else {
    console.log("TEST SUCCESS:", data);
  }
}

test();
