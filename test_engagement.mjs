import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = '.env';
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

const supabaseUrl = (env.match(/VITE_SUPABASE_URL=(.*)/) || [])[1];
const serviceRoleKey = (env.match(/SERVICE_ROLE_KEY=(.*)/) || [])[1];

if (!serviceRoleKey) {
  console.log("Error: SERVICE_ROLE_KEY not found in the project's .env file. I cannot bypass RLS without it.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('Running test against Rick Berube Test profile...');
  const { data: customers, error: cErr } = await supabase.from('customers').select('*').ilike('full_name', '%Rick Berube Test%').limit(1);
  if (cErr) {
    console.log('Error fetching customer:', cErr);
    return;
  }
  if (!customers || customers.length === 0) {
    console.log('Rick Berube Test profile not found in customers table.');
    return;
  }
  const customer = customers[0];
  console.log(`Found Customer: ${customer.full_name} (ID: ${customer.id})`);

  const { data: insertData, error: iErr } = await supabase.from('engagements').insert({
    customer_id: customer.id,
    customer_name: customer.full_name,
    type: 'correspondence',
    note: 'Google Review Request: Sent Google Review request email to Rick Berube Test.'
  }).select();

  if (iErr) {
    console.log('Error inserting engagement:', iErr);
    return;
  }
  
  console.log('\n[SUPABASE DB] Row successfully landed:');
  console.log(JSON.stringify(insertData[0], null, 2));

  console.log('\n[UI SIMULATION] Correspondences Tab / Engagement Section:');
  console.log(`- Type: ${insertData[0].type}`);
  console.log(`- Customer: ${insertData[0].customer_name}`);
  console.log(`- Note: ${insertData[0].note}`);
  console.log(`- Created At: ${insertData[0].created_at}`);
}
run();
