const SUPABASE_URL = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaGFveWFlcm1zcXJpbGhzZnhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM3NDY3NSwiZXhwIjoyMDgwOTUwNjc1fQ.K5HIM8P-Shw37f4YJrj1huUIDLTPHgfS_-RJ6IwEaRM';
const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

// Remaining unmatched chemicals with their DB names → correct category
const fixes = [
  { name: 'Interior Detailer and Protectant', category: 'interior' },
  { name: 'APC', category: 'both' },
  { name: 'ONR', category: 'exterior' },
  { name: 'Total Interior', category: 'interior' },
  { name: 'CERAKOTE® Platinum Rapid Ceramic Paint Sealant Spray', category: 'exterior' },
  { name: 'Ceramic Acrylic Black Wax', category: 'exterior' },
  { name: 'Diablo Wheel & Tire Cleaner', category: 'exterior' },
  { name: 'Supreme Wash & Wax', category: 'exterior' },
  { name: 'Ceramic Graphene Inside Job', category: 'interior' },
  { name: 'Quick Detailer', category: 'exterior' },
  { name: 'Trim Coat Restoration Kit', category: 'exterior' },
  { name: 'Gold Class Shampoo & Conditioner', category: 'exterior' },
];

for (const fix of fixes) {
  const encoded = encodeURIComponent(fix.name);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/chemicals?name=eq.${encoded}`, { headers });
  const items = await r.json();
  if (!items.length) {
    console.log(`  ✗ NOT FOUND in DB: "${fix.name}"`);
    continue;
  }
  for (const item of items) {
    const up = await fetch(`${SUPABASE_URL}/rest/v1/chemicals?id=eq.${item.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: fix.category })
    });
    if (up.ok) {
      console.log(`  ✓ [${fix.category.toUpperCase().padEnd(8)}] ${fix.name}`);
    } else {
      console.log(`  ✗ ERROR: ${await up.text()}`);
    }
  }
}

// Final verification
const r2 = await fetch(`${SUPABASE_URL}/rest/v1/chemicals?select=id,name,category`, { headers });
const all = await r2.json();
const ext = all.filter(c => c.category === 'exterior').length;
const int = all.filter(c => c.category === 'interior').length;
const both = all.filter(c => c.category === 'both').length;
const untagged = all.filter(c => !c.category || (c.category !== 'exterior' && c.category !== 'interior' && c.category !== 'both'));
console.log(`\n=== FINAL COUNTS ===`);
console.log(`Exterior: ${ext}`);
console.log(`Interior: ${int}`);
console.log(`Both:     ${both}`);
console.log(`Tagged:   ${ext + int + both} / ${all.length}`);
if (untagged.length) {
  console.log(`\nStill untagged (${untagged.length}):`);
  untagged.forEach(c => console.log(`  - "${c.name}" (cat: ${c.category})`));
}
