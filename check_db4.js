import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('chemicals').select('name, dilution_ratios').eq('name', 'Carpet Bomber').limit(1);
  if (error) console.error(error);
  else {
      console.log(JSON.stringify(data[0].dilution_ratios, null, 2));
  }
}
run();
