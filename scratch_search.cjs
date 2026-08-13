const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: materials } = await supabase.from('materials').select('*').ilike('name', '%Hose%');
  console.log("Materials:", materials?.length);
  if (materials && materials.length > 0) {
    console.log(materials[0]);
  }
  const { data: tools } = await supabase.from('tools').select('*').ilike('name', '%Hose%');
  console.log("Tools:", tools?.length);
  const { data: chemicals } = await supabase.from('chemicals').select('*').ilike('name', '%Hose%');
  console.log("Chemicals:", chemicals?.length);
}
run();
