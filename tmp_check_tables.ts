import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tables = ['expenses', 'invoices', 'receivables', 'tax_expenses', 'income'];
  const results: any = {};
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    results[t] = !!data && !error;
  }
  console.log(JSON.stringify(results, null, 2));
}

run();
