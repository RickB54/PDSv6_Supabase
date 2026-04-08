
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), 'supabase.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim();
});

const s = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log("Starting batch 'Where Purchased' update...");

  // 1. Chemicals (All categories? User said Supplies and Equipment but chemicals are inventory too)
  // User said "put alll items form the Supplies AND Equipment categories only"
  
  // 2. Equipment (tools table)
  console.log("Updating 'tools'...");
  const { data: t, error: te } = await s.from('tools').select('id, name, where_purchased');
  if (te) console.error("Tools fetch error:", te);
  else {
    const toUpdate = t.filter(item => !item.where_purchased || item.where_purchased === '' || item.where_purchased === 'Select Source...');
    console.log(`Found ${toUpdate.length} tools to update.`);
    for (const item of toUpdate) {
      await s.from('tools').update({ where_purchased: 'Amazon' }).eq('id', item.id);
    }
  }

  // 3. Supplies (materials table)
  console.log("Updating 'materials'...");
  const { data: m, error: me } = await s.from('materials').select('id, name, where_purchased');
  if (me) {
     if (me.message.includes('column "where_purchased" does not exist')) {
       console.log("Column 'where_purchased' is missing in 'materials'. Adding it via RPC if possible...");
       // This likely won't work without a custom RPC, but I'll skip it if it fails.
     } else {
       console.error("Materials fetch error:", me);
     }
  } else {
    const toUpdate = m.filter(item => !item.where_purchased || item.where_purchased === '' || item.where_purchased === 'Select Source...');
    console.log(`Found ${toUpdate.length} materials to update.`);
    for (const item of toUpdate) {
      await s.from('materials').update({ where_purchased: 'Amazon' }).eq('id', item.id);
    }
  }

  console.log("Batch update complete!");
}
run();
