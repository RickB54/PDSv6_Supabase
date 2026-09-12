import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('scratch/inventory_dump.json', 'utf8'));
const tools = dump.tools;

// 5 items moving from supplies to equipment:
// 1. 3/4 Inch Male to Male Hose Adapter -> "Male-Male Hose Adapter (2nd)" in Hoses, Cords & Reels
// 2. 90 Degree Garden Hose Adapter -> "90 Degree Garden Hose Adapter" in Hoses, Cords & Reels
// 3. Hose Splitter 2 Way -> "Hose Splitter 2 Way" in Hoses, Cords & Reels
// 4. Mouse for NVR -> "Mouse for NVR" in Security & Office
// 5. 5 Gallon Gas Tank -> "Gas Tank" in Power Equipment & Systems

console.log(`Current tools: ${tools.length}`);

// User equipment categories & items:
const equipCategories: Record<string, string[]> = {
  "Power Equipment & Systems": [
    'Breather Cap', // Buyers Products HBF8, 1/2 Inch NPT Breather Cap
    'Shop Vacuum', // 4 Gal. 5.0 Peak HP Shop Vacuum...
    'Linkable LED Light', // Linkable LED Shop Light
    'TORVA Tank 1', // TORVA 60 Gallon Fresh Water Tank (id: 34ad556e-...)
    'TORVA Tank 2', // TORVA 60 Gallon Fresh Water Tank (id: 56b5ee5a-...)
    'VEVOR Compressor', // VEVOR 13 Gallon Air Compressor
    'Bauer PW', // Bauer Pressure Washer (1800 PSI / 1.2 GPM)
    'Car Port', // Car Port (13' x 20')
    'Predator Generator', // Predator 5000 inverter / Generator
    'Ryobi PW', // Ryobi Pressure Washer (1800 PSI)
    'Steam Cleaner', // 2500W High Pressure Steam Cleaner
    'CANTEX Conduit', // CANTEX3/4 in. x 10 ft. Gray Non-Metallic PVC Schedule 40-Conduit
    'ECO-WORTHY Pump', // ECO-WORTHY 33-Series Industrial Water Pressure Pump
    'HUSKY Flooring', // HUSKY Garage Flooring Roll Black...
    'Pancake Compressor', // Pancake Air Compressor
    'RIDGID Shop Vac', // RIDGID3 Gal. 5.0 Peak HP NXT Shop Vac
    'Solar String Light', // Stright Solar Powered String Light 100FT
    'VERANDA Trim', // VERANDA White Reversible PVC Trim/Sheet
    'Water Bladder', // Water Bladder (Black, 60Gallon
    'Water Filter', // Water Filter
    'Water Spout Bib', // Water Spout bib (Installation & Parts)
    'Gas Tank' // [FROM SUPPLIES] 5 Gallon Gas Tank
  ],
  "Hand Tools & Guns": [
    'Pet Hair Removal Tools', // 5 Pack Pet Hair Removal Tools
    'Air Blower Gun',
    'Air Spray Gun', // Air Spray Gun Auto Car Paint Sprayer
    'Hromee Cleaning Gun', // Hromee Aluminium Car Cleaning Gun
    'PW Gun', // Pressure Washer Gun
    'PW Gun w/Swivel', // Pressure Washer Gun with Swivel, 4000 PSI
    'TDS Meter', // TDS Meter, Digital Water Tester
    'Tire Pressure Gauges',
    'Tornado Mini Air Gun',
    'Tornador Tool', // Tornador Air Compressor Tool
    'TUTULUCK PW Gun', // TUTULUCK Short Pressure Washer Gun
    'Undercarriage Cleaner', // Undercarriage Cleaner for Pressure Washer
    'Shop Vac Kit', // Universal Compatible with Any Brand Shop Vac Extractor Hose Kit Attachmen
    'CENTRAL PNEUMATIC Spray Gun', // CENTRAL PNEUMATIC Gravity-Feed Air Spray Gun
    'Vacuum Attachments Kit',
    'Pet Hair Remover Block Roller', // Pet Hair Remover, Block Roller
    'Drill America bit', // Drill America - KFDRSD3/8X27/64 27/64
    'PW Gun and Hose Kit', // Pressure Washer Gun and Hose Kit, 50FT
    '3PCS Brush Set', // 3PCS Car Detailing Brush Set
    'Orbital Polisher' // 6 inch Orbital Polisher
  ],
  "Pump Sprayer & Foam Cannons": [
    'AstroAI Foam Cannon',
    'DBR Tech Foam Cannon', // DBR Tech® Foam Cannon
    'Foam Cannon',
    'Foam Cannon for PW', // Foam Cannon for Pressure Washer
    'HDX2 1Gal Sprayer', // HDX2 1 Gallon Multi-Purpose Lawn and Garden Pump Sprayer
    'HDX2 2Gal Sprayer', // HDX2 2 Gallon Multi-Purpose Lawn and Garden Pump Sprayer
    'HDX 56oz Sprayer' // HDX 56oz Handheld Multi-Purpose Pump Sprayer
  ],
  "Storage & Organizers": [
    'Utility Cart', // 3 Tier Utility Cart on Wheels
    'Detailing Buckets', // Chemical Guys Heavy Duty Detailing Buckets
    'Organizer Tote', // Supplies Organizer Tote
    'YUKON Shelf', // YUKON 5-Tier Shelf, 36 in. x 18 in. x 72 in.
    'HUSKY Tool Bag Combo', // HUSKY18 in., 15 in. and 12 in. Tool Bag Combo
    'Utility Belt Pouch', // 5-Pocket Utility Tool Belt Pouch
    'Waist Bag Belt', // 7 Pockets Waist Bag Belt
    'Storage Caddy', // Storage Caddy (6 Pack)
    'Storage Drawer Unit', // Large Storage 3 drawer unit
    'Spray Bottle Carry Caddy'
  ],
  "Security & Office": [
    'USB Hub', // 8-in-1 USB C Hub Docking Station
    'Security Cameras',
    'Wireless Mouse', // KANMABPC Wireless Bluetooth Mouse
    'Document Organizer Folder',
    'Mouse for NVR' // [FROM SUPPLIES] Mouse for NVR
  ],
  "Safety & PPE": [
    'Respirator',
    'Respirator Cartridges'
  ],
  "Hoses, Cords & Reels": [
    'Garden Hose Adapter GHT', // Garden Hose Adapter 3/4" GHT Female x 1/2" NPT Male
    'Hose 3ft FlexZilla', // Hose (3 foot FlexZilla)
    'Hose 5ft FlexZilla', // Hose (5 foot FlexZilla)
    'JESLED Extension Cords', // JESLED 5FT T5 T8 Extension Cords
    'T5T8 Extension Cords', // T5 T8 Extension Cords
    'Garden Hose Quick Connects', // 3/4 Inch Garden Hose Quick Connects
    'Male-Male Hose Adapters', // 3/4 Inch Male to Male Hose Adapters
    'CENTRAL PNEUMATIC Reel&Hose', // CENTRAL PNEUMATIC 3/8 in xc 50 ft. Air Compressor Reel & Hose
    'Flexzilla Garden Hose', // Flexzilla Garden Hose 5/8 in. x 50 ft
    'PW Reel&Hose', // Pressure Washer Reel & Hose (60 feet) x2
    'Retractable Garden Hose Reel', // Retractable Garden Hose Reel, 1/2 in x 100 ft
    'Hose 50ft', // Hose (50 ft)
    'Electrical Extension Reel&Cord', // Electrical Extension Reel & Cord (45 feet, 12 Gauge)
    'Retractable Hose Reel 1/4"', // Retractable Hose Reel, 1/4" x 50 FT
    'Male-Male Hose Adapter (2nd)', // [FROM SUPPLIES] 3/4 Inch Male to Male Hose Adapter
    '90 Degree Garden Hose Adapter', // [FROM SUPPLIES] 90 Degree Garden Hose Adapter
    'Hose Splitter 2 Way' // [FROM SUPPLIES] Hose Splitter 2 Way
  ]
};

// Count expected items in user list:
let expectedEquipCount = 0;
for (const cat in equipCategories) {
  expectedEquipCount += equipCategories[cat].length;
  console.log(`${cat}: ${equipCategories[cat].length}`);
}
console.log(`Total expected equipment: ${expectedEquipCount}`);
