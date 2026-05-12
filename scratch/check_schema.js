
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the project root
dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  const { data, error } = await supabase.from('bookings').select('*').limit(1);
  if (error) {
    console.error("Error fetching booking:", error);
  } else {
    console.log("Booking Record:", JSON.stringify(data[0], null, 2));
    console.log("Columns:", Object.keys(data[0] || {}));
  }
}

checkSchema();
