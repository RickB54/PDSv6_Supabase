
// Diagnostic script - run with: node scratch/diagnose_tips.mjs
// Uses the Supabase REST API directly

const SUPABASE_URL = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaGFveWFlcm1zcXJpbGhzZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQ2NzUsImV4cCI6MjA4MDk1MDY3NX0.pCKR7zd2RcEUzLOLSXQVC8jfaE3yXPan-UaDL2evRy4';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function query(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  const data = await r.json();
  return data;
}

async function main() {
  console.log('=== STEP 1: Check content_services_meta for ricks_chemical_tips_v3 ===');
  const meta = await query('content_services_meta?key=eq.ricks_chemical_tips_v3&select=key,title,meta');
  if (!meta || meta.length === 0) {
    console.log('❌ NO RECORD FOUND for ricks_chemical_tips_v3');
  } else {
    const m = meta[0];
    console.log('✅ Record found. Key:', m.key, '| Title:', m.title);
    if (m.meta) {
      const tips = m.meta.tips || [];
      const descs = m.meta.descriptions || [];
      const prep = m.meta.prepList || [];
      console.log(`  tips count: ${tips.length}`);
      console.log(`  descriptions count: ${descs.length}`);
      console.log(`  prepList count: ${prep.length}`);
      
      console.log('\n--- Sample descriptions (first 5): ---');
      descs.slice(0, 5).forEach((d, i) => {
        console.log(`  [${i}] id: ${d.id}`);
        console.log(`       purpose: "${(d.purpose || '').substring(0, 60)}"`);
        console.log(`       instructions: "${(d.instructions || '').substring(0, 60)}"`);
        console.log(`       dilutions: ${JSON.stringify(d.dilutions || [])}`);
      });

      console.log('\n--- ALL description IDs in meta: ---');
      descs.forEach((d, i) => {
        const hasData = (d.purpose || '').length > 0 || (d.instructions || '').length > 0 || (d.dilutions || []).length > 0;
        console.log(`  [${i}] id=${d.id} | hasData=${hasData} | purpose="${(d.purpose || '').substring(0, 30)}"`);
      });
      
      console.log('\n--- prepList IDs: ---');
      prep.forEach((id, i) => console.log(`  [${i}] ${id}`));
    } else {
      console.log('  ❌ meta field is null/empty');
    }
  }

  console.log('\n=== STEP 2: Check chemicals table (inventory) ===');
  const chemicals = await query('chemicals?select=id,name,brand,chemical_library_id&order=name');
  if (chemicals && chemicals.error) {
    console.log('❌ Error querying chemicals:', JSON.stringify(chemicals.error));
  } else if (!chemicals || chemicals.length === 0) {
    console.log('❌ chemicals table is EMPTY');
  } else {
    console.log(`✅ ${chemicals.length} chemicals found in inventory:`);
    chemicals.forEach((c, i) => {
      console.log(`  [${i}] id=${c.id} | name="${c.name}" | brand="${c.brand}" | lib_id=${c.chemical_library_id}`);
    });
  }

  console.log('\n=== STEP 3: Check chemical_library table ===');
  const library = await query('chemical_library?select=id,name,brand&order=name');
  if (library && library.error) {
    console.log('❌ Error querying chemical_library:', JSON.stringify(library.error));
  } else if (!library || library.length === 0) {
    console.log('❌ chemical_library table is EMPTY');
  } else {
    console.log(`✅ ${library.length} entries in chemical_library:`);
    library.forEach((c, i) => {
      console.log(`  [${i}] id=${c.id} | name="${c.name}" | brand="${c.brand}"`);
    });
  }

  console.log('\n=== STEP 4: Cross-reference description IDs vs inventory IDs ===');
  // Get fresh data
  const metaFresh = await query('content_services_meta?key=eq.ricks_chemical_tips_v3&select=meta');
  const chemsFresh = await query('chemicals?select=id,name,brand&order=name');
  
  if (metaFresh && metaFresh[0] && metaFresh[0].meta && chemsFresh && chemsFresh.length > 0) {
    const descIds = (metaFresh[0].meta.descriptions || []).map(d => d.id);
    const chemIds = new Set(chemsFresh.map(c => c.id));
    
    console.log('Description IDs that DO NOT match any inventory chemical:');
    let mismatches = 0;
    descIds.forEach(id => {
      if (!chemIds.has(id)) {
        console.log(`  ❌ ORPHAN: ${id}`);
        mismatches++;
      }
    });
    if (mismatches === 0) {
      console.log('  ✅ All description IDs match inventory chemicals!');
    } else {
      console.log(`  Total orphaned descriptions: ${mismatches} / ${descIds.length}`);
    }
    
    console.log('\nInventory chemicals with NO matching description:');
    let missing = 0;
    chemsFresh.forEach(c => {
      const hasDesc = descIds.includes(c.id);
      if (!hasDesc) {
        console.log(`  ❌ NO DESC: id=${c.id} name="${c.name}"`);
        missing++;
      }
    });
    if (missing === 0) {
      console.log('  ✅ All inventory chemicals have descriptions!');
    } else {
      console.log(`  Total chemicals missing descriptions: ${missing} / ${chemsFresh.length}`);
    }
  } else {
    console.log('  Cannot cross-reference - insufficient data');
  }
}

main().catch(console.error);
