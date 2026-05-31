
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string);
async function run() {
  const { data } = await supabase.from('chemicals').select('*');
  if (!data) return;
  const groups1 = new Set(data.map(c => \\_\\));
  console.log('Group by Name+Brand:', groups1.size);
  
  const groups2 = new Set(data.map(c => c.chemical_library_id ? \lib_\\ : \\_\\));
  console.log('Group by libId or Name+Brand:', groups2.size);
}
run();

