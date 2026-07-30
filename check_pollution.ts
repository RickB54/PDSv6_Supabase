import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Read .env directly
const envFile = fs.readFileSync('.env', 'utf-8');
const env: any = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkPollution() {
  const yesterday = new Date(Date.now() - 48*60*60*1000).toISOString();
  
  console.log('--- POTENTIAL CONTAMINATED DATA (Last 48 hrs) ---');

  const { data: engagements } = await supabase.from('engagements').select('*').gte('created_at', yesterday);
  console.log('\nENGAGEMENTS:', JSON.stringify(engagements, null, 2));

  const { data: vendors } = await supabase.from('detailing_vendors').select('*').gte('created_at', yesterday);
  console.log('\nVENDORS:', JSON.stringify(vendors, null, 2));

  const { data: pdfs } = await supabase.from('pdf_records').select('id, record_type, file_name, timestamp').gte('timestamp', yesterday);
  console.log('\nPDF RECORDS:', JSON.stringify(pdfs, null, 2));
  
  const { data: checklists } = await supabase.from('service_checklists').select('*').gte('created_at', yesterday);
  console.log('\nCHECKLISTS:', JSON.stringify(checklists, null, 2));
  
  const { data: notes } = await supabase.from('personal_notes').select('*').gte('created_at', yesterday);
  console.log('\nNOTES (Ricks Tips):', JSON.stringify(notes, null, 2));
}

checkPollution();
