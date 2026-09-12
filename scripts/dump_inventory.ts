import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: materials } = await supabase.from('materials').select('*').order('name');
  const { data: tools } = await supabase.from('tools').select('*').order('name');

  const report = {
    materialsCount: materials?.length || 0,
    toolsCount: tools?.length || 0,
    materials: materials?.map(m => ({ id: m.id, name: m.name, category: m.category, qty: m.quantity })),
    tools: tools?.map(t => ({ id: t.id, name: t.name, category: t.category, qty: t.quantity }))
  };

  fs.writeFileSync('scratch/inventory_dump.json', JSON.stringify(report, null, 2));
  console.log('Saved to scratch/inventory_dump.json');
  console.log(`Materials: ${materials?.length}, Tools: ${tools?.length}, Total: ${(materials?.length || 0) + (tools?.length || 0)}`);
}

main();
