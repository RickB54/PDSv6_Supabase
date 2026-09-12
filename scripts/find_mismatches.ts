import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: materials } = await supabase.from('materials').select('*').order('name');
  const { data: tools } = await supabase.from('tools').select('*').order('name');

  console.log(`Current DB: Materials = ${materials?.length}, Tools = ${tools?.length}, Total = ${(materials?.length || 0) + (tools?.length || 0)}`);

  // Check Gas Converter
  const gasConverter = tools?.find(t => t.name.toLowerCase().includes('gas converter'));
  if (gasConverter) {
    console.log('Gas Converter found in tools:', gasConverter);
  }

  // Check Pine lumber
  const pineLumber = materials?.find(m => m.name.toLowerCase().includes('pine lumber'));
  if (pineLumber) {
    console.log('Pine Lumber found in materials:', pineLumber);
  }
}

check();
