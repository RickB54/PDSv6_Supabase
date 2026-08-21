import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('chemicals').select('name, shelf, section, container_type, bottle_size, dilution_ratios');
  if (error) console.error(error);
  else {
      console.log('Chemicals:', data.map(d => `${d.name}: shelf=${d.shelf}, section=${d.section}, bs=${d.bottle_size}, ct=${d.container_type}, dr=${d.dilution_ratios?.length}`));
  }
}
run();
