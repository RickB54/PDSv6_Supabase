const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Cleaning up duplicate materials...");
  const { data: materials, error } = await supabase.from('materials').select('*');
  if (error) {
    console.error(error);
    return;
  }
  
  // Group by name
  const groups = {};
  materials.forEach(m => {
    if (!groups[m.name]) groups[m.name] = [];
    groups[m.name].push(m);
  });
  
  for (const name in groups) {
    if (groups[name].length > 1) {
      console.log(`Found ${groups[name].length} duplicates for ${name}`);
      // Sort to keep the most recently updated one
      groups[name].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      // Delete the rest
      const toDelete = groups[name].slice(1).map(x => x.id);
      console.log('Deleting material IDs:', toDelete);
      
      const { error: delErr } = await supabase.from('materials').delete().in('id', toDelete);
      if (delErr) {
        console.error("Error deleting materials:", delErr);
      }
    }
  }
  
  console.log("Cleaning up duplicate tools...");
  const { data: tools } = await supabase.from('tools').select('*');
  const tgroups = {};
  tools.forEach(m => {
    if (!tgroups[m.name]) tgroups[m.name] = [];
    tgroups[m.name].push(m);
  });
  
  for (const name in tgroups) {
    if (tgroups[name].length > 1) {
      console.log(`Found ${tgroups[name].length} duplicates for ${name}`);
      tgroups[name].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      const toDelete = tgroups[name].slice(1).map(x => x.id);
      console.log('Deleting tool IDs:', toDelete);
      
      const { error: delErr } = await supabase.from('tools').delete().in('id', toDelete);
      if (delErr) {
        console.error("Error deleting tools:", delErr);
      }
    }
  }
  console.log("Deduplication complete!");
}
run();
