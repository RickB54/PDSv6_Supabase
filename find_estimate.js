import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findEstimate() {
  const { data, error } = await supabase
    .from('estimates')
    .select('id, notes, customerName')
    .ilike('customerName', '%Rick Berube%')
    .ilike('notes', '%[MENU_MODE]%')
    .limit(1);
    
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

findEstimate();
