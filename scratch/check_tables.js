
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listTables() {
  const { data, error } = await supabase.from('app_users').select('id').limit(1); // Test connection
  if (error) {
    console.error("Connection error:", error);
    return;
  }
  
  // We can't easily list tables via API, so we'll try to query common names
  const possibleTables = ['pdf_records', 'pdf_archive', 'files', 'documents', 'archives'];
  for (const table of possibleTables) {
    const { error: tErr } = await supabase.from(table).select('*').limit(1);
    if (!tErr) {
      console.log(`Table exists: ${table}`);
    } else {
      console.log(`Table does NOT exist: ${table} (${tErr.message})`);
    }
  }
}

listTables();
