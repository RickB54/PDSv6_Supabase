const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function runTest() {
  const estNumber = 999111999;
  
  const { data: created, error: createErr } = await supabase
    .from('estimates')
    .insert([{
      estimate_number: estNumber,
      customer_name: 'RB Test Verification',
      total: 250,
      status: 'open',
      notes: '[MENU_MODE]\nStandard Estimate',
      date: new Date().toISOString().split('T')[0]
    }])
    .select()
    .single();

  if (createErr) {
    console.error('Create error:', createErr);
    return;
  }

  console.log('--- BEFORE ACCEPTANCE ---');
  console.log('ID:', created.id);
  console.log('Estimate #:', created.estimate_number);
  console.log('Status:', created.status);
  console.log('Notes:', JSON.stringify(created.notes));

  const newNotes = created.notes + '\n\n[ACCEPTED_BY_CUSTOMER]\n[PRE_CHECK_DATA]: {"petHair":false,"exteriorPaint":"Good"}';
  const { data: updated, error: updateErr } = await supabase
    .from('estimates')
    .update({ status: 'accepted', notes: newNotes })
    .eq('id', created.id)
    .select()
    .single();

  if (updateErr) {
    console.error('Update error:', updateErr);
    return;
  }

  console.log('\n--- AFTER ACCEPTANCE ---');
  console.log('ID:', updated.id);
  console.log('Estimate #:', updated.estimate_number);
  console.log('Status:', updated.status);
  console.log('Notes:', JSON.stringify(updated.notes));

  const { data: fetched } = await supabase.from('estimates').select('*').eq('id', created.id).single();
  const s = (fetched.status || '').toLowerCase();
  const isSent = fetched.isSent || s === 'sent' || s === 'accepted' || s === 'declined' || s === 'denied';
  
  console.log('\n--- DOWNSTREAM MAPPING VERIFICATION ---');
  console.log('Estimates List Status:', (fetched.status || 'open').toUpperCase());
  console.log('Analytics Outcome Display:', s === 'accepted' ? 'Accepted' : 'Pending');
  console.log('Analytics Delivery Display:', isSent ? 'Sent' : 'Not Received');

  await supabase.from('estimates').delete().eq('id', created.id);
  console.log('\nTest record cleaned up successfully.');
}

runTest();
