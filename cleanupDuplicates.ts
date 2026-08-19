import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase Environment Variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDuplicates() {
  console.log('Fetching engagements...');
  const { data: engagements, error } = await supabase
    .from('engagements')
    .select('id, customer_id, note, created_at')
    .ilike('note', '%Sent: #%')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching engagements:', error);
    process.exit(1);
  }

  if (!engagements) {
    console.log('No engagements found.');
    return;
  }

  console.log(`Found ${engagements.length} "Sent:" engagements.`);

  // Group by customer_id + unique prefix
  const groups: Record<string, typeof engagements> = {};

  for (const eng of engagements) {
    const prefixMatch = eng.note.match(/^(Estimate Sent: #[0-9]+|Invoice Sent: #[0-9]+)/);
    if (!prefixMatch) continue;

    const uniqueKey = `${eng.customer_id}_${prefixMatch[1]}`;
    if (!groups[uniqueKey]) {
      groups[uniqueKey] = [];
    }
    groups[uniqueKey].push(eng);
  }

  const idsToDelete: string[] = [];

  for (const [key, group] of Object.entries(groups)) {
    if (group.length > 1) {
      console.log(`Duplicate found for ${key}: ${group.length} entries.`);
      // Keep the first one (oldest, since ordered by created_at)
      for (let i = 1; i < group.length; i++) {
        idsToDelete.push(group[i].id);
      }
    }
  }

  if (idsToDelete.length === 0) {
    console.log('No duplicates found to delete.');
    return;
  }

  console.log(`Found ${idsToDelete.length} duplicates to delete. Deleting in batches...`);

  // Delete in batches of 100
  for (let i = 0; i < idsToDelete.length; i += 100) {
    const batch = idsToDelete.slice(i, i + 100);
    const { error: deleteError } = await supabase
      .from('engagements')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error('Error deleting batch:', deleteError);
    } else {
      console.log(`Deleted batch of ${batch.length} engagements.`);
    }
  }

  console.log('Cleanup complete!');
}

cleanupDuplicates();
