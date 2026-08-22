import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: lib, error: err1 } = await supabase.from('chemical_library').select('id, name, brand').order('name');
  if (err1) console.error(err1);
  console.log('Lib items:', lib.length);
  const dupes = {};
  lib.forEach(item => {
    const key = `${item.name} (${item.brand})`;
    if (!dupes[key]) dupes[key] = [];
    dupes[key].push(item.id);
  });
  for (const key in dupes) {
    if (dupes[key].length > 1) {
      console.log('Dupe:', key, dupes[key]);
    }
  }
}
run();
