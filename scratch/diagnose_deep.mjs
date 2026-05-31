
// Deep diagnostic - check table structure and RLS
const SUPABASE_URL = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaGFveWFlcm1zcXJpbGhzZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQ2NzUsImV4cCI6MjA4MDk1MDY3NX0.pCKR7zd2RcEUzLOLSXQVC8jfaE3yXPan-UaDL2evRy4';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'count=exact'
};

async function queryRaw(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  const text = await r.text();
  const status = r.status;
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status, data, headers: Object.fromEntries(r.headers.entries()) };
}

async function main() {
  // Check if the tables exist and what RLS is doing
  console.log('=== Checking chemicals table structure ===');
  const r1 = await queryRaw('chemicals?limit=1');
  console.log('Status:', r1.status);
  console.log('Content-Range:', r1.headers['content-range']);
  console.log('Data:', JSON.stringify(r1.data).substring(0, 500));

  console.log('\n=== Checking chemical_library table ===');
  const r2 = await queryRaw('chemical_library?limit=1');
  console.log('Status:', r2.status);
  console.log('Content-Range:', r2.headers['content-range']);
  console.log('Data:', JSON.stringify(r2.data).substring(0, 500));

  // Try with limit=0 to get count
  console.log('\n=== Getting count from chemicals (limit=0) ===');
  const r3 = await queryRaw('chemicals?limit=0');
  console.log('Status:', r3.status);
  console.log('Content-Range:', r3.headers['content-range']);

  console.log('\n=== Getting count from chemical_library (limit=0) ===');
  const r4 = await queryRaw('chemical_library?limit=0');
  console.log('Status:', r4.status);
  console.log('Content-Range:', r4.headers['content-range']);

  // Try inventory_items table too
  console.log('\n=== Try inventory_items table ===');
  const r5 = await queryRaw('inventory_items?select=id,name&limit=5');
  console.log('Status:', r5.status);
  console.log('Data:', JSON.stringify(r5.data).substring(0, 300));

  // Try inventory_chemical_items
  console.log('\n=== Try chemical_inventory table ===');
  const r6 = await queryRaw('chemical_inventory?select=id,name&limit=5');
  console.log('Status:', r6.status);
  console.log('Data:', JSON.stringify(r6.data).substring(0, 300));

  // Try all tables in information schema
  console.log('\n=== Try to list tables via RPC ===');
  const r7 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_all_tables`, {
    method: 'POST',
    headers: { ...headers },
    body: '{}'
  });
  console.log('RPC status:', r7.status);

  // The key question: does the anon key have SELECT on chemicals?
  console.log('\n=== Try chemicals with no filter - check if RLS is blocking ===');
  const r8 = await queryRaw('chemicals?select=count');
  console.log('Status:', r8.status);
  console.log('Data:', JSON.stringify(r8.data).substring(0, 300));
}

main().catch(console.error);
