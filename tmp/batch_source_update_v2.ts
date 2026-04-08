
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manual env parsing since dotenv might be picky with .env vs supabase.env
const envPath = path.join(process.cwd(), 'supabase.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in supabase.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting batch 'Where Purchased' update for Supplies (materials) and Equipment (tools)...");

  // 1. Update Tools (Equipment)
  console.log("Updating 'tools' table...");
  const { data: tools, error: toolErr } = await supabase
    .from('tools')
    .update({ where_purchased: 'Amazon' })
    .or('where_purchased.is.null,where_purchased.eq."",where_purchased.eq."Select Source..."')
    .select('id, name');

  if (toolErr) console.error("Error updating tools:", toolErr);
  else console.log(`Updated ${tools?.length || 0} items in 'tools' to Amazon.`);

  // 2. Update Materials (Supplies)
  console.log("Updating 'materials' table...");
  const { data: mats, error: matErr } = await supabase
    .from('materials')
    .update({ where_purchased: 'Amazon' })
    .or('where_purchased.is.null,where_purchased.eq."",where_purchased.eq."Select Source..."')
    .select('id, name');

  if (matErr) {
    if (matErr.message.includes('column "where_purchased" does not exist')) {
        console.log("Column 'where_purchased' does not exist in 'materials'. Skipping.");
    } else {
        console.error("Error updating materials:", matErr);
    }
  } else {
    console.log(`Updated ${mats?.length || 0} items in 'materials' to Amazon.`);
  }

  console.log("Batch update complete!");
}

run();
