import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: materials, error: matErr } = await supabase.from('materials').select('*').order('name');
  const { data: tools, error: toolErr } = await supabase.from('tools').select('*').order('name');

  if (matErr) console.error('materials error:', matErr);
  if (toolErr) console.error('tools error:', toolErr);

  console.log(`Materials count: ${materials?.length || 0}`);
  console.log(`Tools count: ${tools?.length || 0}`);

  console.log('\n--- MATERIALS (SUPPLIES) ---');
  materials?.forEach((m, idx) => {
    console.log(`${idx + 1}. [${m.category}] ${m.name} (qty: ${m.quantity}, id: ${m.id})`);
  });

  console.log('\n--- TOOLS (EQUIPMENT) ---');
  tools?.forEach((t, idx) => {
    console.log(`${idx + 1}. [${t.category}] ${t.name} (qty: ${t.quantity}, id: ${t.id})`);
  });
}

main();
