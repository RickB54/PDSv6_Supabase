import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function revert() {
  console.log('Starting revert...');
  const { data, error } = await supabase
    .from('customers')
    .update({ type: 'prospect' })
    .ilike('full_name', '%Forrest%');
  console.log('Forrest updated:', { error });

  const { data: d2, error: e2 } = await supabase
    .from('customers')
    .update({ type: 'prospect' })
    .ilike('full_name', '%Serge%');
  console.log('Serge updated:', { e2 });
}

revert();
