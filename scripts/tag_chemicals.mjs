const SUPABASE_URL = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaGFveWFlcm1zcXJpbGhzZnhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM3NDY3NSwiZXhwIjoyMDgwOTUwNjc1fQ.K5HIM8P-Shw37f4YJrj1huUIDLTPHgfS_-RJ6IwEaRM';
const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Fetch ALL chemicals (paginate to be safe)
async function fetchAllChemicals() {
  let all = [];
  let offset = 0;
  const limit = 500;
  while (true) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/chemicals?select=id,name,category&limit=${limit}&offset=${offset}`, { headers });
    const data = await r.json();
    all = all.concat(data);
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

// The mapping: partial name (lowercased) → usage_type
// Using 'exterior', 'interior', 'both' as the category values
const EXTERIOR = 'exterior';
const INTERIOR = 'interior';
const BOTH = 'both';

const nameToCategory = [
  // Exterior
  { match: '3d one', category: EXTERIOR },
  { match: 'armor all wheel', category: EXTERIOR },
  { match: 'cerakote platinum rapid ceramic', category: EXTERIOR },
  { match: 'cerakote trim coat', category: EXTERIOR },
  { match: 'chemical guys diablo', category: EXTERIOR },
  { match: 'chemical guys supreme wash', category: EXTERIOR },
  { match: "meguiar's gold class shampoo", category: EXTERIOR },
  { match: "meguiar's quick detailer", category: EXTERIOR },
  { match: 'optimum onr', category: EXTERIOR },
  { match: 'cherry foam', category: EXTERIOR },
  { match: 'cover all tire', category: EXTERIOR },
  { match: 'dark fury', category: EXTERIOR },
  { match: 'dirt buster', category: EXTERIOR },
  { match: 'formula 4', category: EXTERIOR },
  { match: 'purple x', category: EXTERIOR },
  { match: 'road warrior', category: EXTERIOR },
  { match: 'spray wax', category: EXTERIOR },
  { match: 'super shine 2', category: EXTERIOR },
  { match: 'wire wheel cleaner', category: EXTERIOR },
  { match: 'turtle wax ceramic acrylic black wax', category: EXTERIOR },
  { match: 'wax & dry', category: EXTERIOR },
  { match: 'rain x', category: EXTERIOR },
  // Interior
  { match: 'cerakote interior detailer', category: INTERIOR },
  { match: 'chemical guys total interior', category: INTERIOR },
  { match: 'carpet bomber', category: INTERIOR },
  { match: 'terminator', category: INTERIOR },
  { match: 'xpress interior', category: INTERIOR },
  { match: 'p&s xpress', category: INTERIOR },
  { match: 'express interior', category: INTERIOR },
  { match: 'cover all interior', category: INTERIOR },
  { match: 'does it all', category: INTERIOR },
  { match: 'pink perfection', category: INTERIOR },
  { match: 'turtle wax ceramic graphene inside', category: INTERIOR },
  // Both
  { match: 'armor all multi purpose', category: BOTH },
  { match: 'cerakote rapid ceramic plastic', category: BOTH },
  { match: "meguiar's apc", category: BOTH },
  { match: 'green all', category: BOTH },
  { match: 'muscle magic', category: BOTH },
  { match: 'zap it', category: BOTH },
  { match: 'invisible glass', category: BOTH },
];

function getCategoryForChem(name) {
  const lower = name.toLowerCase();
  // Find best (longest) match
  let best = null;
  let bestLen = 0;
  for (const rule of nameToCategory) {
    if (lower.includes(rule.match) && rule.match.length > bestLen) {
      best = rule.category;
      bestLen = rule.match.length;
    }
  }
  return best;
}

async function updateChemCategory(id, category) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/chemicals?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ category })
  });
  if (!r.ok) {
    const text = await r.text();
    console.error(`  ERROR updating ${id}: ${text}`);
    return false;
  }
  return true;
}

const chems = await fetchAllChemicals();
console.log(`Fetched ${chems.length} chemicals total.\n`);

let updated = 0;
let skipped = 0;
const notMatched = [];

for (const chem of chems) {
  const newCat = getCategoryForChem(chem.name);
  if (!newCat) {
    notMatched.push(chem.name);
    skipped++;
    continue;
  }
  const ok = await updateChemCategory(chem.id, newCat);
  if (ok) {
    console.log(`  ✓ [${newCat.toUpperCase().padEnd(8)}] ${chem.name}`);
    updated++;
  }
}

console.log(`\n=== DONE ===`);
console.log(`Updated: ${updated}`);
console.log(`Skipped (no rule): ${skipped}`);
if (notMatched.length > 0) {
  console.log(`\nNot matched (kept existing category):`);
  notMatched.forEach(n => console.log(`  - ${n}`));
}

// Verify the totals
const r2 = await fetch(`${SUPABASE_URL}/rest/v1/chemicals?select=id,name,category`, { headers });
const updated_chems = await r2.json();
const extCount = updated_chems.filter(c => c.category === EXTERIOR).length;
const intCount = updated_chems.filter(c => c.category === INTERIOR).length;
const bothCount = updated_chems.filter(c => c.category === BOTH).length;
console.log(`\nVerification counts in DB:`);
console.log(`  Exterior: ${extCount}`);
console.log(`  Interior: ${intCount}`);
console.log(`  Both:     ${bothCount}`);
console.log(`  Total tagged: ${extCount + intCount + bothCount} of ${updated_chems.length}`);
