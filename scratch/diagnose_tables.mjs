
// Comprehensive table scan - find where chemicals actually live
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
  // Check inventory_items fully
  console.log('=== inventory_items table ===');
  const r1 = await queryRaw('inventory_items?select=id,name,brand,category,chemical_library_id&limit=50');
  console.log(`Status: ${r1.status} | Range: ${r1.contentRange}`);
  if (Array.isArray(r1.data) && r1.data.length > 0) {
    r1.data.forEach((c, i) => console.log(`  [${i}] id=${c.id} | "${c.name}" | brand="${c.brand}" | lib_id=${c.chemical_library_id}`));
  } else {
    console.log('  Data:', JSON.stringify(r1.data).substring(0, 200));
  }

  // Check if there's a different table name for inventory chemicals
  const tableNames = [
    'chemical_items', 'inventory', 'products', 'product_inventory',
    'chem_inventory', 'chem_items', 'shop_inventory', 'stock_items',
    'chemical_products', 'supplies', 'supply_items'
  ];
  
  for (const t of tableNames) {
    const r = await queryRaw(`${t}?limit=1`);
    if (r.status === 200) {
      console.log(`\n✅ TABLE EXISTS: ${t} | Range: ${r.contentRange}`);
      if (Array.isArray(r.data) && r.data.length > 0) {
        console.log('  Sample:', JSON.stringify(r.data[0]).substring(0, 300));
      }
    }
  }

  // Check content_services_meta for any other chemical keys
  console.log('\n=== All content_services_meta keys ===');
  const r2 = await queryRaw('content_services_meta?select=key,title&order=key');
  if (Array.isArray(r2.data)) {
    r2.data.forEach(m => console.log(`  key="${m.key}" title="${m.title}"`));
  }

  // Check the full meta JSON to understand the current IDs
  console.log('\n=== Full meta data from ricks_chemical_tips_v3 ===');
  const r3 = await queryRaw('content_services_meta?key=eq.ricks_chemical_tips_v3&select=meta');
  if (r3.data && r3.data[0] && r3.data[0].meta) {
    const meta = r3.data[0].meta;
    console.log('\nDescriptions (full):');
    (meta.descriptions || []).forEach((d, i) => {
      console.log(`\n  [${i}] id: ${d.id}`);
      console.log(`    purpose: "${d.purpose || '(empty)'}"`);
      console.log(`    instructions: "${(d.instructions || '(empty)').substring(0, 80)}"`);
      console.log(`    dilutions: ${JSON.stringify(d.dilutions || [])}`);
    });
  }
}

main().catch(console.error);
