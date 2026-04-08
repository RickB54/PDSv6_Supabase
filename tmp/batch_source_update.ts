
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting batch 'Where Purchased' update for Supplies and Equipment...");

  // 1. Update Tools (Equipment)
  console.log("Updating 'tools' table...");
  const { data: tools, error: toolErr } = await supabase
    .from('tools')
    .update({ where_purchased: 'Amazon' })
    .or('where_purchased.is.null,where_purchased.eq.""')
    .select('id, name');

  if (toolErr) console.error("Error updating tools:", toolErr);
  else console.log(`Updated ${tools?.length || 0} items in 'tools' to Amazon.`);

  // 2. Update Materials (Supplies)
  console.log("Updating 'materials' table...");
  const { data: mats, error: matErr } = await supabase
    .from('materials')
    .update({ where_purchased: 'Amazon' })
    .or('where_purchased.is.null,where_purchased.eq.""')
    .select('id, name');

  if (matErr) console.error("Error updating materials:", matErr);
  else console.log(`Updated ${mats?.length || 0} items in 'materials' to Amazon.`);

  console.log("Batch update complete!");
}

run();
