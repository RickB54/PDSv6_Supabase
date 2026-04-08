
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
  console.log("Checking columns for 'tools'...");
  const { data: t, error: te } = await s.from('tools').select('*').limit(1);
  if (te) console.error("Tools error:", te);
  else console.log("Tools sample:", t?.[0] ? Object.keys(t[0]) : "No records");

  console.log("Checking columns for 'materials'...");
  const { data: m, error: me } = await s.from('materials').select('*').limit(1);
  if (me) console.error("Materials error:", me);
  else console.log("Materials sample:", m?.[0] ? Object.keys(m[0]) : "No records");
}
run();
