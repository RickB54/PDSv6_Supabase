
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const { data } = await supabase.from('chemicals').select('*');
if (data) {
  const groups1 = new Set(data.map(c => ((c.name || '').trim().toLowerCase()) + '_' + ((c.brand || '').trim().toLowerCase())));
  console.log('Group by Name+Brand:', groups1.size);
  
  const groups2 = new Set(data.map(c => c.chemical_library_id ? 'lib_' + c.chemical_library_id : ((c.name || '').trim().toLowerCase()) + '_' + ((c.brand || '').trim().toLowerCase())));
  console.log('Group by libId or Name+Brand:', groups2.size);
}

