import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('get_table_info', { tname: 'bookings' });
  if (error) {
    // If RPC doesn't exist, try query
    const { data: d2, error: e2 } = await supabase.from('bookings').select('*').limit(1);
    console.log('Sample row:', JSON.stringify(d2[0], null, 2));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

check();
