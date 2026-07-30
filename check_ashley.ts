import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env: any = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkAshley() {
  const { data: evals } = await supabase.from('client_evaluations').select('*');
  console.log('\nEVALS:', JSON.stringify(evals, null, 2));
  
  const { data: notes } = await supabase.from('personal_notes').select('*');
  console.log('\nNOTES:', JSON.stringify(notes, null, 2));

  const { data: reviews } = await supabase.from('reviews').select('*').maybeSingle();
  console.log('\nREVIEWS (if exists):', reviews);
  
  const { data: customers } = await supabase.from('customers').select('*').ilike('name', '%ashley%');
  console.log('\nCUSTOMERS:', JSON.stringify(customers, null, 2));
}

checkAshley();
