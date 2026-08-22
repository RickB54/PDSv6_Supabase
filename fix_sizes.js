import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSizes() {
  const { data, error } = await supabase.from('chemicals').select('id, name, bottle_size');
  if (error) {
    console.error("Error fetching chemicals:", error);
    return;
  }
  const sizes = new Set();
  data.forEach(chem => {
    if (chem.bottle_size) {
        sizes.add(chem.bottle_size.split('|__CT__|')[0]);
    }
  });
  console.log("Unique sizes in DB:", Array.from(sizes));
}

checkSizes();
