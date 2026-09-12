import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('scratch/inventory_dump.json', 'utf8'));
const materials = dump.materials;

const userSupplies: string[] = [
  // Towels & Microfiber (15)
  '2 Pack Car Drying Towels',
  'Drying Towel 36"x24"',
  'Cleaning Microfiber Rags (Small)',
  'Glass Cleaning Rags',
  'Airlab Microfiber Towels (2 Large)',
  'Airlab Microfiber Towels (4 Large)',
  'Paper Towels',
  'Microfiber Drying Towels 16"x16" Pack of 4',
  'Microfiber Drying Towels 35"x24" XL',
  'Super Absorbent Microfiber Car Drying Towel',
  'The Rag Company Liquid8r',
  'CERAKOTE Microfiber Towels',
  'Deedlite Premium Car Drying Towel',
  'Microfiber Towels x3',
  'Premium Car Drying Towel',

  // Brushes & Applicators (10)
  'AstroAI Windshield Cleaner Tool',
  '4 PCS Brush Set',
  '7pc Brush Set',
  'Car Detailing Brush Set',
  'Curveball Wide Detail Brush',
  'Long Bristle Horse Hair Brush',
  'SmilinFit Sponge Erasers',
  '26Pcs Brush Set',
  'Lilly Brush',
  'AIDEA Car Wash Mitt',

  // Tools & Accessories (32)
  'Brass Hose Shut-Off Valves',
  'Drill Brush Power Scrubber Kit',
  'Suds Lab Wheel Brush',
  'Rain Barrel Spigot Kit',
  'Brass Hose Elbow Connector',
  '20" Wheel Brush',
  'EZ-Fill Funnel',
  'Bucket Insert Filter',
  'Chemical Racks',
  'Clay Bar Synthetic',
  'Clay Bar Large Mitt',
  "Meguiar's Clay Kit",
  'Crevice Tool',
  'Fevone Hose 50ft',
  'Funnel Chemical mixing',
  'Funnel Generator',
  'Garden Hose Quick Connectors',
  'Hose 3ft FlexZilla',
  'Invisible Glass Tool',
  'Kneeling Pad',
  'Measuring Cup',
  'Metal Garden Hose Splitter',
  'Ninja Cleaning Pads',
  'PW Quick Connect Kit',
  'Quick Connect Air Hose Fittings',
  'Ryobi Battery',
  'Ryobi Battery Charger',
  'Storage Bins',
  'Sudz Budz Sponge',
  'Tire Dressing Pads',
  'Twinkle Star PW Adapter Set',
  'YAMATIC Hose',

  // Bottles & Containers (6)
  'Uinemo 24oz Spray Bottles',
  'Zep 32oz Spray Bottles',
  'Plastic Spray Bottle 3pk',
  'Chemical Guys 16oz Spray Bottles',
  'Spray Bottle 3pk 3 Colors',
  'Spray Bottle Storage Rack',

  // Safety & PPE (4)
  'Nitrile Gloves',
  'Safety Glasses',
  'Safety Masks',
  'Safety Cone',

  // Business & Branding (20)
  'T-shirts',
  'Beanie',
  'Hoodie',
  'T Shirt',
  'Business Cards (4 entries)',
  'Business Pens',
  'Cap',
  'Polos & Hat',
  'Clothing w/logo (3 entries)',
  'Custom Mugs',
  'Tumbler',
  'VistaPrint Pen',
  'Shipping Labels',
  'Printer Paper',
  'Toner Cartridge',

  // Other (7)
  'D-Ring Tie Downs',
  'Ball Bungee 30pk',
  'Ball Bungee 50pk',
  'Car Detailing Cleaning',
  'Insulated Lunch Box',
  'PLYTANIUM Sheathing',
  'Trash Bags'
];

console.log(`User prompt has ${userSupplies.length} supply entries (some with multi-entries).`);
// Let's match each material to user supplies or moving items:
const moves = [
  '3/4 Inch Male to Male Hose Adapter',
  '90 Degree Garden Hose Adapter',
  'Hose Splitter 2 Way',
  'Mouse for NVR',
  '5 Gallon Gas Tank'
];

const unmatchedMaterials: any[] = [];
materials.forEach((m: any) => {
  const isMove = moves.some(mv => m.name.toLowerCase().includes(mv.toLowerCase()));
  if (isMove) return;
  // Try to match with user supplies
  // We'll check if userSupplies contains a substring or vice versa
  const match = userSupplies.find(u => {
    const cleanU = u.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanM = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanM.includes(cleanU) || cleanU.includes(cleanM);
  });
  if (!match) {
    unmatchedMaterials.push(m);
  }
});

console.log('Unmatched materials:', unmatchedMaterials);
