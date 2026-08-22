import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: lib, error: err1 } = await supabase.from('chemical_library').select('*').order('name');
  if (err1) { console.error(err1); return; }
  
  const dupes = {};
  lib.forEach(item => {
    // Normalize name and brand to find fuzzy duplicates too!
    const key = `${(item.name||'').trim().toLowerCase()}__${(item.brand||'').trim().toLowerCase()}`;
    if (!dupes[key]) dupes[key] = [];
    dupes[key].push(item);
  });

  for (const key in dupes) {
    if (dupes[key].length > 1) {
      console.log('Resolving duplicates for:', key);
      // Sort by updated_at descending, so index 0 is the newest
      const items = dupes[key].sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
      
      const kept = items[0];
      const deleted = items.slice(1);

      for (const del of deleted) {
        console.log(`  Keeping ${kept.id}, Deleting ${del.id}`);
        // 1. Update inventory
        await supabase.from('chemicals').update({ chemical_library_id: kept.id }).eq('chemical_library_id', del.id);
        // 2. Delete from library
        await supabase.from('chemical_library').delete().eq('id', del.id);
      }
    }
  }
  console.log('Deduplication complete.');
}
run();
