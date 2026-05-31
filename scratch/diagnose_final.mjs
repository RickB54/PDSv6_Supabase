
// Final diagnostic - get inventory_items columns and v2 data
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
  const status = r.status;
  const contentRange = r.headers.get('content-range');
  let data;
  try { data = await r.json(); } catch { data = await r.text(); }
  return { status, data, contentRange };
}

async function main() {
  // Get inventory_items properly
  console.log('=== inventory_items table (all columns) ===');
  const r1 = await queryRaw('inventory_items?select=*&limit=5');
  console.log(`Status: ${r1.status} | Range: ${r1.contentRange}`);
  if (Array.isArray(r1.data) && r1.data.length > 0) {
    console.log('Columns:', Object.keys(r1.data[0]).join(', '));
    r1.data.forEach((c, i) => console.log(`  [${i}]`, JSON.stringify(c).substring(0, 200)));
  } else {
    console.log('  Data:', JSON.stringify(r1.data).substring(0, 300));
  }

  // inventory_items full list
  console.log('\n=== inventory_items full list ===');
  const r2 = await queryRaw('inventory_items?select=*&limit=100');
  console.log(`Status: ${r2.status} | Range: ${r2.contentRange}`);
  if (Array.isArray(r2.data)) {
    console.log(`Count: ${r2.data.length}`);
    r2.data.forEach((c, i) => {
      console.log(`  [${i}] ${JSON.stringify(c).substring(0, 150)}`);
    });
  }

  // Check v2 data
  console.log('\n=== ricks_chemical_tips_v2 data ===');
  const r3 = await queryRaw('content_services_meta?key=eq.ricks_chemical_tips_v2&select=meta');
  if (r3.data && r3.data[0] && r3.data[0].meta) {
    const meta = r3.data[0].meta;
    console.log('v2 tips:', (meta.tips || []).length);
    console.log('v2 descriptions:', (meta.descriptions || []).length);
    console.log('v2 prepList:', (meta.prepList || []).length);
    console.log('v2 first 3 desc IDs:');
    (meta.descriptions || []).slice(0,5).forEach(d => 
      console.log(`  id=${d.id} purpose="${(d.purpose||'').substring(0,50)}"`)
    );
  }
  
  // Check inventory-data functions - look at what DB columns chemicals actually uses
  console.log('\n=== chemicals table column check ===');
  const r4 = await queryRaw('chemicals?select=*&limit=3');
  console.log(`Status: ${r4.status} | Range: ${r4.contentRange}`);
  if (Array.isArray(r4.data) && r4.data.length > 0) {
    console.log('Columns:', Object.keys(r4.data[0]).join(', '));
  } else if (r4.data && r4.data.code === '42P01') {
    console.log('Table does not exist!');
  }
}

main().catch(console.error);
