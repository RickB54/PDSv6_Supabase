const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: materials } = await supabase.from('materials').select('*');
  console.log("Materials:", materials?.length);
  if (materials?.length > 0) {
     console.log("Names:", materials.map(m => m.name).slice(0, 5));
  }
}
run();
