import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey);

async function check() {
  try {
    const { data: chems, error: cErr } = await supabase.from('chemicals').select('*');
    const chemsBytes = Buffer.byteLength(JSON.stringify(chems || []), 'utf8');
    console.log(`[Chemicals] Count: ${chems?.length || 0}, Payload: ${(chemsBytes / 1024).toFixed(2)} KB`);

    const { data: supps } = await supabase.from('materials').select('*');
    const suppsBytes = Buffer.byteLength(JSON.stringify(supps || []), 'utf8');
    console.log(`[Supplies/Materials] Count: ${supps?.length || 0}, Payload: ${(suppsBytes / 1024).toFixed(2)} KB`);

    const { data: tools } = await supabase.from('tools').select('*');
    const toolsBytes = Buffer.byteLength(JSON.stringify(tools || []), 'utf8');
    console.log(`[Tools/Equipment] Count: ${tools?.length || 0}, Payload: ${(toolsBytes / 1024).toFixed(2)} KB`);

    const { data: custs } = await supabase.from('customers').select('*, vehicles(*)');
    const custsBytes = Buffer.byteLength(JSON.stringify(custs || []), 'utf8');
    console.log(`[Customers + Vehicles] Count: ${custs?.length || 0}, Payload: ${(custsBytes / 1024).toFixed(2)} KB`);

    const { data: invs } = await supabase.from('invoices').select('*');
    const invsBytes = Buffer.byteLength(JSON.stringify(invs || []), 'utf8');
    console.log(`[Invoices] Count: ${invs?.length || 0}, Payload: ${(invsBytes / 1024).toFixed(2)} KB`);

    const { data: bks } = await supabase.from('bookings').select('*');
    const bksBytes = Buffer.byteLength(JSON.stringify(bks || []), 'utf8');
    console.log(`[Bookings] Count: ${bks?.length || 0}, Payload: ${(bksBytes / 1024).toFixed(2)} KB`);

    const { data: ests } = await supabase.from('estimates').select('*');
    const estsBytes = Buffer.byteLength(JSON.stringify(ests || []), 'utf8');
    console.log(`[Estimates] Count: ${ests?.length || 0}, Payload: ${(estsBytes / 1024).toFixed(2)} KB`);
  } catch (err) {
    console.error('Check failed:', err);
  }
}

check();
