import * as dotenv from 'dotenv';
dotenv.config(); // Reads .env
dotenv.config({ path: '.env.local' }); // Overrides with .env.local

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) throw new Error('Missing Supabase credentials');

const supabase = createClient(url, key);

async function check() { 
  const { data, error } = await supabase.from('tax_expenses').select('*'); 
  if (error) { console.error(error); return; }
  
  const suspicious = data.filter(e => e.vendor === 'Inventory Purchase' || e.vendor?.startsWith('Purchased ') || e.vendor?.startsWith('Stock Purchase')); 
  console.log('Total:', data.length, 'Suspicious:', suspicious.length); 
  
  // Find exact duplicates: same date, same amount, but one is "Inventory Purchase" and other is "Purchased ..."
  const toDelete = [];
  
  for (const e of suspicious) {
    if (e.vendor?.startsWith('Purchased ') || e.vendor?.startsWith('Stock Purchase')) {
        // Look for a matching "Inventory Purchase" on the same day with same amount
        const dateStr = e.date.split('T')[0];
        const match = suspicious.find(s => s.vendor === 'Inventory Purchase' && s.amount === e.amount && s.date.startsWith(dateStr));
        if (match) {
            toDelete.push(e);
        }
    }
  }
  
  console.log('Found', toDelete.length, 'duplicates to delete.');
  console.log('Sample to delete:', toDelete.slice(0, 5).map(s => s.date + ' | ' + s.amount + ' | ' + s.vendor));
  
  // Actually delete them
  if (toDelete.length > 0) {
      const ids = toDelete.map(t => t.id);
      const { error: delErr } = await supabase.from('tax_expenses').delete().in('id', ids);
      if (delErr) {
          console.error("Delete error:", delErr);
      } else {
          console.log("Successfully deleted", ids.length, "duplicate records.");
      }
  }
} 
check();
