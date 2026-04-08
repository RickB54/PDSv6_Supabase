
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), 'supabase.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim();
});

const s = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log("Checking records directly via node mjs...");
  const { data: t } = await s.from('tools').select('id, name, where_purchased');
  const { data: m } = await s.from('materials').select('id, name, where_purchased');
  
  console.log(`Tools found: ${t?.length || 0}`);
  if (t) t.slice(0, 3).forEach(x => console.log(`Tool: ${x.name}, Source: ${x.where_purchased}`));
  
  console.log(`Materials found: ${m?.length || 0}`);
  if (m) m.slice(0, 3).forEach(x => console.log(`Material: ${x.name}, Source: ${x.where_purchased}`));
}
run();
