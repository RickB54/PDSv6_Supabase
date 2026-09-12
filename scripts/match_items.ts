import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('scratch/inventory_dump.json', 'utf8'));
const materials = dump.materials;
const tools = dump.tools;

const userSupplies: Record<string, string[]> = {
  "Towels & Microfiber": [
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
    'Premium Car Drying Towel'
  ],
  "Brushes & Applicators": [
    'AstroAI Windshield Cleaner Tool',
    '4 PCS Brush Set',
    '7pc Brush Set',
    'Car Detailing Brush Set',
    'Curveball Wide Detail Brush',
    'Long Bristle Horse Hair Brush',
    'SmilinFit Sponge Erasers',
    '26Pcs Brush Set',
    'Lilly Brush',
    'AIDEA Car Wash Mitt'
  ],
  "Tools & Accessories": [
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
    'YAMATIC Hose'
  ],
  "Bottles & Containers": [
    'Uinemo 24oz Spray Bottles',
    'Zep 32oz Spray Bottles',
    'Plastic Spray Bottle 3pk',
    'Chemical Guys 16oz Spray Bottles',
    'Spray Bottle 3pk 3 Colors',
    'Spray Bottle Storage Rack'
  ],
  "Safety & PPE": [
    'Nitrile Gloves',
    'Safety Glasses',
    'Safety Masks',
    'Safety Cone'
  ],
  "Business & Branding": [
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
    'Toner Cartridge'
  ],
  "Other": [
    'D-Ring Tie Downs',
    'Ball Bungee 30pk',
    'Ball Bungee 50pk',
    'Car Detailing Cleaning',
    'Insulated Lunch Box',
    'PLYTANIUM Sheathing',
    'Trash Bags'
  ]
};

const userEquipment: Record<string, string[]> = {
  "Power Equipment & Systems": [
    'Breather Cap',
    'Shop Vacuum',
    'Linkable LED Light',
    'TORVA Tank x2',
    'VEVOR Compressor',
    'Bauer PW',
    'Car Port',
    'Predator Generator',
    'Ryobi PW',
    'Steam Cleaner',
    'CANTEX Conduit',
    'ECO-WORTHY Pump',
    'HUSKY Flooring',
    'Pancake Compressor',
    'RIDGID Shop Vac',
    'Solar String Light',
    'VERANDA Trim',
    'Water Bladder',
    'Water Filter',
    'Water Spout Bib',
    'Gas Tank'
  ],
  "Hand Tools & Guns": [
    'Pet Hair Removal Tools',
    'Air Blower Gun',
    'Air Spray Gun',
    'Hromee Cleaning Gun',
    'PW Gun',
    'PW Gun w/Swivel',
    'TDS Meter',
    'Tire Pressure Gauges',
    'Tornado Mini Air Gun',
    'Tornador Tool',
    'TUTULUCK PW Gun',
    'Undercarriage Cleaner',
    'Shop Vac Kit',
    'CENTRAL PNEUMATIC Spray Gun',
    'Vacuum Attachments Kit',
    'Pet Hair Remover Block Roller',
    'Drill America bit',
    'PW Gun and Hose Kit',
    '3PCS Brush Set',
    'Orbital Polisher'
  ],
  "Pump Sprayer & Foam Cannons": [
    'AstroAI Foam Cannon',
    'DBR Tech Foam Cannon',
    'Foam Cannon',
    'Foam Cannon for PW',
    'HDX2 1Gal Sprayer',
    'HDX2 2Gal Sprayer',
    'HDX 56oz Sprayer'
  ],
  "Storage & Organizers": [
    'Utility Cart',
    'Detailing Buckets',
    'Organizer Tote',
    'YUKON Shelf',
    'HUSKY Tool Bag Combo',
    'Utility Belt Pouch',
    'Waist Bag Belt',
    'Storage Caddy',
    'Storage Drawer Unit',
    'Spray Bottle Carry Caddy'
  ],
  "Security & Office": [
    'USB Hub',
    'Security Cameras',
    'Wireless Mouse',
    'Document Organizer Folder',
    'Mouse for NVR'
  ],
  "Safety & PPE": [
    'Respirator',
    'Respirator Cartridges'
  ],
  "Hoses, Cords & Reels": [
    'Garden Hose Adapter GHT',
    'Hose 3ft FlexZilla',
    'Hose 5ft FlexZilla',
    'JESLED Extension Cords',
    'T5T8 Extension Cords',
    'Garden Hose Quick Connects',
    'Male-Male Hose Adapters',
    'CENTRAL PNEUMATIC Reel&Hose',
    'Flexzilla Garden Hose',
    'PW Reel&Hose',
    'Retractable Garden Hose Reel',
    'Hose 50ft',
    'Electrical Extension Reel&Cord',
    'Retractable Hose Reel 1/4"',
    'Male-Male Hose Adapter (2nd)',
    '90 Degree Garden Hose Adapter',
    'Hose Splitter 2 Way'
  ]
};

console.log("Starting analysis...");
// Find items in materials that move to equipment
const movesSuppliesToEquip = [
  '3/4 Inch Male to Male Hose Adapter',
  '90 Degree Garden Hose Adapter',
  'Hose Splitter 2 Way',
  'Mouse for NVR',
  '5 Gallon Gas Tank'
];

console.log("\nItems moving Supplies -> Equipment:");
movesSuppliesToEquip.forEach(name => {
  const found = materials.find((m: any) => m.name.toLowerCase().includes(name.toLowerCase()));
  console.log(`- "${name}": ${found ? 'FOUND in materials (' + found.name + ')' : 'NOT FOUND'}`);
});

// Let's check remaining materials after removing the 5 moving items
const remainingMaterials = materials.filter((m: any) => !movesSuppliesToEquip.some(name => m.name.toLowerCase().includes(name.toLowerCase())));
console.log(`\nRemaining materials count: ${remainingMaterials.length} (Expected: 94)`);

// If remainingMaterials.length !== 94, find what extra/missing items exist!
remainingMaterials.forEach((m: any) => {
  // Let's see which category it falls into
});
