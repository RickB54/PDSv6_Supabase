
// Chemical migration - repopulates chemical_library and fixes content_services_meta
// Run: node scratch/migrate_chemicals.mjs

const SUPABASE_URL = 'https://kqhaoyaermsqrilhsfxj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaGFveWFlcm1zcXJpbGhzZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQ2NzUsImV4cCI6MjA4MDk1MDY3NX0.pCKR7zd2RcEUzLOLSXQVC8jfaE3yXPan-UaDL2evRy4';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Stable UUIDs for each chemical (deterministic so we can re-run safely)
const CHEMICALS = [
  {
    id: 'a1000001-0000-0000-0000-000000000001',
    name: 'Pink Perfection',
    brand: 'Chemical Guys',
    category: 'Interior',
    description: 'High-performance all-purpose cleaner and degreaser for interior and exterior pre-treat.',
    used_for: ['Interior Cleaning', 'Degreasing', 'Plastics', 'Vinyl'],
    dilution_ratios: [
      { label: 'Maintenance / Light', ratio: '10:1' },
      { label: 'Standard', ratio: '10:1' },
      { label: 'Heavy Dirt / Degreasing', ratio: '4:1' }
    ],
    instructions: 'Apply to cool surface. Adjust dilution based on soil level. Agitate with brush or microfiber. Wipe or rinse clean.',
    purpose: 'High-performance all-purpose cleaner and degreaser for interior and exterior pre-treat.'
  },
  {
    id: 'a1000002-0000-0000-0000-000000000002',
    name: 'Dirt Buster',
    brand: 'Chemical Guys',
    category: 'Interior',
    description: 'General purpose cleaning for interior plastics and vinyl.',
    used_for: ['Interior Cleaning', 'Plastics', 'Vinyl'],
    dilution_ratios: [
      { label: 'Maintenance / Light', ratio: '10:1' },
      { label: 'Standard', ratio: '10:1' },
      { label: 'Heavy Dirt / Degreasing', ratio: '4:1' }
    ],
    instructions: 'Apply to cool surface. Follow dilution ratios based on dirt level. Agitate if necessary and rinse or wipe clean.',
    purpose: 'General purpose cleaning for interior plastics and vinyl.'
  },
  {
    id: 'a1000003-0000-0000-0000-000000000003',
    name: 'Carpet Bomber',
    brand: 'Chemical Guys',
    category: 'Interior',
    description: 'Premium carpet and upholstery cleaner. Deep cleans fibers without excessive foam.',
    used_for: ['Carpet Cleaning', 'Upholstery', 'Fabric Seats'],
    dilution_ratios: [
      { label: 'Maintenance / Light', ratio: '8:1' },
      { label: 'Standard', ratio: '7:1' },
      { label: 'Heavy Dirt / Degreasing', ratio: '5:1' }
    ],
    instructions: 'Spray onto carpet or fabric. Agitate with a stiff brush. Extract with wet/dry vac or wipe clean with microfiber.',
    purpose: 'Premium carpet and upholstery cleaner. Deep cleans fibers without excessive foam.'
  },
  {
    id: 'a1000004-0000-0000-0000-000000000004',
    name: 'P&S Terminator',
    brand: 'P&S',
    category: 'Interior',
    description: 'Enzyme-based odor and stain remover. Direct application.',
    used_for: ['Odor Removal', 'Stain Removal', 'Pet Stains'],
    dilution_ratios: [
      { label: 'Maintenance / Light', ratio: 'RTU' },
      { label: 'Standard', ratio: 'RTU' },
      { label: 'Heavy Dirt / Degreasing', ratio: 'RTU' }
    ],
    instructions: 'Apply directly to stain or odor source. Allow enzymes to dwell 5-10 minutes. Blot or extract. Do not rinse for odor control.',
    purpose: 'Enzyme-based odor and stain remover. Direct application.'
  },
  {
    id: 'a1000005-0000-0000-0000-000000000005',
    name: 'P&S Xpress Interior Detailer',
    brand: 'P&S',
    category: 'Interior',
    description: 'Quick interior cleaner that leaves a perfect factory finish. Safe for all surfaces.',
    used_for: ['Interior Detailing', 'Dash', 'Console', 'Trim'],
    dilution_ratios: [
      { label: 'Maintenance / Light', ratio: '3:1' },
      { label: 'Standard', ratio: '1:1' },
      { label: 'Heavy Dirt / Degreasing', ratio: '1:1' }
    ],
    instructions: 'Mist onto surface or applicator. Wipe to clean and buff to a satin finish. Safe for plastic, vinyl, leather, and rubber.',
    purpose: 'Quick interior cleaner that leaves a perfect factory finish. Safe for all surfaces.'
  },
  {
    id: 'a1000006-0000-0000-0000-000000000006',
    name: "Meguiar's Gold Class Car Wash",
    brand: "Meguiar's",
    category: 'Exterior',
    description: "Rich foam car wash. Gently lifts dirt while conditioning paint.",
    used_for: ['Car Wash', 'Paint Safe', 'Foam Cannon'],
    dilution_ratios: [
      { label: 'Maintenance / Light', ratio: '5:1' },
      { label: 'Standard', ratio: '5:1' },
      { label: 'Heavy Dirt / Degreasing', ratio: '5:1' }
    ],
    instructions: 'Mix with water in bucket or foam cannon. Wash top-down. Rinse thoroughly. Use grit guards to prevent swirl marks.',
    purpose: "Rich foam car wash. Gently lifts dirt while conditioning paint."
  },
  {
    id: 'a1000007-0000-0000-0000-000000000007',
    name: 'Road Warrior',
    brand: 'Chemical Guys',
    category: 'Exterior',
    description: 'Powerful exterior pre-treat for bugs and road grime.',
    used_for: ['Bug Removal', 'Pre-Treat', 'Road Grime'],
    dilution_ratios: [
      { label: 'Maintenance / Light', ratio: '10:1' },
      { label: 'Standard', ratio: '10:1' },
      { label: 'Heavy Dirt / Degreasing', ratio: '4:1' }
    ],
    instructions: 'Spray on cool surface. Allow 2-3 minute dwell time. Agitate with soft brush on heavy buildup. Rinse thoroughly.',
    purpose: 'Powerful exterior pre-treat for bugs and road grime.'
  },
  {
    id: 'a1000008-0000-0000-0000-000000000008',
    name: 'Dark Fury Wheel Cleaner',
    brand: 'Chemical Guys',
    category: 'Exterior',
    description: 'Wheel and tire cleaner. Dissolves brake dust and road tar instantly.',
    used_for: ['Wheel Cleaning', 'Brake Dust', 'Tire Cleaning'],
    dilution_ratios: [
      { label: 'Maintenance / Light', ratio: '10:1' },
      { label: 'Standard', ratio: '7:1' },
      { label: 'Heavy Dirt / Degreasing', ratio: '4:1' }
    ],
    instructions: 'Spray on cool wheel. Allow 1-2 minutes to dwell (watch for color change on iron-reactive formulas). Agitate with wheel brush. Rinse well.',
    purpose: 'Wheel and tire cleaner. Dissolves brake dust and road tar instantly.'
  },
  {
    id: 'a1000009-0000-0000-0000-000000000009',
    name: 'Formula 4 Drying Aid',
    brand: 'Chemical Guys',
    category: 'Exterior',
    description: 'Rapid drying aid and polymer sealant. Fights hard water spots in direct sunlight.',
    used_for: ['Drying Aid', 'Water Spot Prevention', 'Paint Sealant'],
    dilution_ratios: [
      { label: 'Maintenance / Light', ratio: '20:1' },
      { label: 'Standard', ratio: '20:1' },
      { label: 'Heavy Dirt / Degreasing', ratio: '20:1' }
    ],
    instructions: 'Spray onto wet paint after rinse. Spread with clean microfiber. Dry panel using blotting/pulling motion for spot-free finish.',
    purpose: 'Rapid drying aid and polymer sealant. Fights hard water spots in direct sunlight.'
  },
  {
    id: 'a1000010-0000-0000-0000-000000000010',
    name: 'Spray Wax',
    brand: 'Chemical Guys',
    category: 'Exterior',
    description: 'Professional high-gloss paint protection. Apply to wet or dry surfaces.',
    used_for: ['Paint Protection', 'Gloss Enhancement', 'Quick Detailer'],
    dilution_ratios: [
      { label: 'Maintenance / Light', ratio: 'RTU' },
      { label: 'Standard', ratio: 'RTU' },
      { label: 'Heavy Dirt / Degreasing', ratio: 'RTU' }
    ],
    instructions: 'Mist onto clean panel. Spread evenly with applicator pad or microfiber. Buff off residue with clean microfiber towel.',
    purpose: 'Professional high-gloss paint protection. Apply to wet or dry surfaces.'
  },
  {
    id: 'a1000011-0000-0000-0000-000000000011',
    name: 'Aqua Gloss Tire & Trim Dressing',
    brand: 'Chemical Guys',
    category: 'Exterior',
    description: 'Water-based tire and trim dressing. High shine without the sling.',
    used_for: ['Tire Dressing', 'Trim Dressing', 'Plastic Restoration'],
    dilution_ratios: [
      { label: 'Maintenance / Light', ratio: '4:1' },
      { label: 'Standard', ratio: '2:1' },
      { label: 'Heavy Dirt / Degreasing', ratio: '1:1 (RTU)' }
    ],
    instructions: 'Apply to clean, dry tire or trim with applicator. Allow 2-3 minutes to bond. Buff off excess to prevent sling. Water-based — will not sling.',
    purpose: 'Water-based tire and trim dressing. High shine without the sling.'
  },
  {
    id: 'a1000012-0000-0000-0000-000000000012',
    name: "Meguiar's APC",
    brand: "Meguiar's",
    category: 'Exterior',
    description: 'Heavy-duty all-purpose cleaner for engines, wheel wells, and stubborn grease.',
    used_for: ['Engine Cleaning', 'Wheel Wells', 'Degreasing', 'Heavy Duty'],
    dilution_ratios: [
      { label: 'Maintenance / Light', ratio: '10:1' },
      { label: 'Standard', ratio: '4:1' },
      { label: 'Heavy Dirt / Degreasing', ratio: '4:1' }
    ],
    instructions: 'Dilute per job type. Spray on surface. Agitate with brush. Rinse thoroughly. Avoid applying to hot surfaces or in direct sunlight.',
    purpose: 'Heavy-duty all-purpose cleaner for engines, wheel wells, and stubborn grease.'
  },
  {
    id: 'a1000013-0000-0000-0000-000000000013',
    name: 'Armor All Wheel & Tire Cleaner',
    brand: 'Armor All',
    category: 'Exterior',
    description: 'Fast-acting wheel and tire cleaner for all wheel types.',
    used_for: ['Wheel Cleaning', 'Tire Cleaning'],
    dilution_ratios: [
      { label: 'Maintenance / Light', ratio: 'RTU' },
      { label: 'Standard', ratio: 'RTU' },
      { label: 'Heavy Dirt / Degreasing', ratio: 'RTU' }
    ],
    instructions: 'Spray directly onto wheel and tire. Allow 1-2 minutes to penetrate. Scrub with brush. Rinse with strong water stream.',
    purpose: 'Fast-acting wheel and tire cleaner for all wheel types.'
  }
];

async function query(method, path, body) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  let data;
  try { data = await r.json(); } catch { data = await r.text(); }
  return { status: r.status, data };
}

async function main() {
  console.log('=== STEP 1: Check if chemical_library allows anon inserts ===');
  // Try inserting one record to test RLS
  const testInsert = await query('POST', 'chemical_library', [{
    id: CHEMICALS[0].id,
    name: CHEMICALS[0].name,
    brand: CHEMICALS[0].brand,
    category: CHEMICALS[0].category,
    description: CHEMICALS[0].description,
    used_for: CHEMICALS[0].used_for,
    dilution_ratios: CHEMICALS[0].dilution_ratios,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }]);
  console.log('Test insert status:', testInsert.status);
  console.log('Test insert data:', JSON.stringify(testInsert.data).substring(0, 200));

  if (testInsert.status === 401 || testInsert.status === 403 || 
      (testInsert.data && testInsert.data.code === '42501')) {
    console.log('\n❌ RLS blocks anon inserts into chemical_library.');
    console.log('Run the SQL below in the Supabase SQL Editor:\n');
    generateSQL();
    return;
  }

  if (testInsert.status >= 400 && !(testInsert.status === 409)) {
    console.log('\n❌ Insert failed:', JSON.stringify(testInsert.data));
    console.log('Run the SQL below in the Supabase SQL Editor:\n');
    generateSQL();
    return;
  }

  console.log('\n✅ Insert succeeded! Inserting remaining chemicals...');
  
  // Insert remaining chemicals
  const remaining = CHEMICALS.slice(1).map(c => ({
    id: c.id,
    name: c.name,
    brand: c.brand,
    category: c.category,
    description: c.description,
    used_for: c.used_for,
    dilution_ratios: c.dilution_ratios,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const bulkInsert = await query('POST', 'chemical_library?on_conflict=id', remaining);
  console.log('Bulk insert status:', bulkInsert.status);
  if (bulkInsert.status >= 400) {
    console.log('Bulk insert error:', JSON.stringify(bulkInsert.data).substring(0, 300));
  } else {
    console.log('✅ All chemicals inserted into chemical_library');
    await updateDescriptions();
  }
}

function generateSQL() {
  const now = new Date().toISOString();
  let sql = `-- Run this in the Supabase SQL Editor at:\n-- https://supabase.com/dashboard/project/kqhaoyaermsqrilhsfxj/editor\n\n`;
  sql += `-- Step 1: Clear old data and insert fresh chemicals into chemical_library\n`;
  sql += `DELETE FROM chemical_library WHERE id LIKE 'a10000%';\n\n`;
  sql += `INSERT INTO chemical_library (id, name, brand, category, description, used_for, dilution_ratios, created_at, updated_at) VALUES\n`;
  
  const rows = CHEMICALS.map(c => {
    const usedFor = JSON.stringify(c.used_for).replace(/'/g, "''");
    const dilutions = JSON.stringify(c.dilution_ratios).replace(/'/g, "''");
    const desc = c.description.replace(/'/g, "''");
    const name = c.name.replace(/'/g, "''");
    const brand = c.brand.replace(/'/g, "''");
    return `  ('${c.id}', '${name}', '${brand}', '${c.category}', '${desc}', '${usedFor}'::jsonb, '${dilutions}'::jsonb, '${now}', '${now}')`;
  });
  sql += rows.join(',\n') + '\n';
  sql += `ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, brand=EXCLUDED.brand, updated_at=EXCLUDED.updated_at;\n\n`;

  // Build updated meta
  const descriptions = CHEMICALS.map(c => ({
    id: c.id,
    purpose: c.purpose,
    instructions: c.instructions,
    dilutions: c.dilution_ratios.map(d => ({ scenario: d.label, ratio: d.ratio }))
  }));

  const prepList = CHEMICALS.map(c => c.id);

  const tips = [
    {
      packageId: 'prime-essential-exterior',
      chemicalIds: ['a1000006','a1000007','a1000008','a1000009','a1000010','a1000011','a1000012'].map(x => x + '-0000-0000-0000-000000000' + x.slice(-3)),
      notes: "Essential Exterior Guide:\n- Inspect for heavy mud/bugs; pre-treat these areas.\n- Foam dwell time 3-5 mins; do not let dry.\n- Top-down wash with grit guards.\n- Hand dry with plush microfiber.\n\nEXTERIOR CADDY SETUP:\n1. Dark Fury (7:1) - Standard Wheels\n2. Dark Fury (4:1) - Heavy Wheels\n3. Road Warrior (4:1) - Heavy Bug Pre-Treat\n4. Formula 4 (20:1) - Drying Aid\n5. Spray Wax (RTU) - Shine & Protection\n6. Aqua Gloss (4:1) - Tire Dressing\n7. Meguiar's APC (4:1) - Heavy Degreaser"
    },
    {
      packageId: 'prime-essential-interior',
      chemicalIds: ['a1000001','a1000002','a1000003','a1000004','a1000005'].map(x => x + '-0000-0000-0000-000000000' + x.slice(-3)),
      notes: "Essential Interior Guide:\n- Remove all trash and loose items first.\n- Vacuum in sections (driver -> passenger -> rear).\n- Wipe dash/console with safe APC.\n- Glass cleaning is the final touch for clarity.\n\nINTERIOR CADDY SETUP:\n1. Pink Perfection (10:1) - Std. Plastics/Vinyl\n2. Pink Perfection (4:1) - Heavy Cleaner/Degreaser\n3. Carpet Bomber (7:1) - Std. Fabric/Seats\n4. Carpet Bomber (5:1) - Heavy Fabric\n5. P&S Xpress (3:1) - Light Satin Finish\n6. P&S Xpress (1:1) - Strong Satin Finish\n7. Terminator (RTU) - Odors & Stains\n8. Dirt Buster (10:1) - General Interior Backup"
    }
  ];

  const metaJson = JSON.stringify({ tips, descriptions, prepList }).replace(/'/g, "''");

  sql += `-- Step 2: Update content_services_meta with correct chemical IDs\n`;
  sql += `UPDATE content_services_meta\n`;
  sql += `SET meta = '${metaJson}'::jsonb, updated_at = '${now}'\n`;
  sql += `WHERE key = 'ricks_chemical_tips_v3';\n`;

  console.log(sql);
}

async function updateDescriptions() {
  const descriptions = CHEMICALS.map(c => ({
    id: c.id,
    purpose: c.purpose,
    instructions: c.instructions,
    dilutions: c.dilution_ratios.map(d => ({ scenario: d.label, ratio: d.ratio }))
  }));

  const prepList = CHEMICALS.map(c => c.id);

  const tips = [
    {
      packageId: 'prime-essential-exterior',
      chemicalIds: CHEMICALS.filter(c => c.category === 'Exterior').map(c => c.id),
      notes: "Essential Exterior Guide:\n- Inspect for heavy mud/bugs; pre-treat these areas.\n- Foam dwell time 3-5 mins; do not let dry.\n- Top-down wash with grit guards.\n- Hand dry with plush microfiber."
    },
    {
      packageId: 'prime-essential-interior',
      chemicalIds: CHEMICALS.filter(c => c.category === 'Interior').map(c => c.id),
      notes: "Essential Interior Guide:\n- Remove all trash and loose items first.\n- Vacuum in sections.\n- Wipe dash/console with safe APC.\n- Glass cleaning is the final touch."
    },
    {
      packageId: 'prime-essential-full',
      chemicalIds: CHEMICALS.map(c => c.id),
      notes: "Full Detail Guide:\n- Balance time between inside and out.\n- Wash exterior first while interior dries.\n- Wipe door jambs last."
    }
  ];

  const meta = { tips, descriptions, prepList };

  const result = await query('PATCH', 
    'content_services_meta?key=eq.ricks_chemical_tips_v3',
    { meta, updated_at: new Date().toISOString() }
  );
  
  console.log('\n=== Updating content_services_meta ===');
  console.log('Status:', result.status);
  if (result.status < 300) {
    console.log('✅ Descriptions updated successfully!');
  } else {
    console.log('❌ Error:', JSON.stringify(result.data).substring(0, 300));
  }
}

main().catch(console.error);
