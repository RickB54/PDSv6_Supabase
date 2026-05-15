import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
  const { error } = await supabase.from('business_drive').select('*').limit(1);
  if (error) {
    console.log('Table "business_drive" does not exist or error:', error.message);
  } else {
    console.log('Table "business_drive" EXISTS!');
  }
}

checkTable();
