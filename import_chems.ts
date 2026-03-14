
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Simple env parser since we can't rely on external loaders
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {} as any);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing keys in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const newChemicals = [
  { name: "Superior Products Spray wax", size: "1 gal", category: "Exterior", brand: "Superior Products" },
  { name: "Superior Products Dirt Buster", size: "1 gal", category: "Exterior", brand: "Superior Products" },
  { name: "Superior Products Dark Fury", size: "1 gal", category: "Exterior", brand: "Superior Products" },
  { name: "Superior Products Road Warrior", size: "1 gal", category: "Exterior", brand: "Superior Products" },
  { name: "Superior Products Aqua Gloss", size: "8oz", category: "Exterior", brand: "Superior Products" },
  { name: "Superior Products Formula 4", size: "8 oz", category: "Exterior", brand: "Superior Products" },
  { name: "Superior Products EZ Shine", size: "8 oz", category: "Exterior", brand: "Superior Products" },
  { name: "Superior Products Muscle Magic", size: "8 oz", category: "Dual-Use", brand: "Superior Products" },
  { name: "Superior Products Zap It", size: "8 oz", category: "Interior", brand: "Superior Products" },
  { name: "Meguiar's Gold Class Shampoo & Conditioner", size: "64 oz", category: "Exterior", brand: "Meguiar's" },
  { name: "Meguiar's Quick Detailer", size: "16 oz", category: "Exterior", brand: "Meguiar's" },
  { name: "Meguiar's APC", size: "1 gal", category: "Dual-Use", brand: "Meguiar's" },
  { name: "Turtle Wax Wax & Dry", size: "26 oz", category: "Exterior", brand: "Turtle Wax" },
  { name: "Turtle Wax Ceramic Graphene Inside Job", size: "16 oz", category: "Interior", brand: "Turtle Wax" },
  { name: "Turtle Wax Ceramic Acrylic Black Wax", size: "16 oz", category: "Exterior", brand: "Turtle Wax" },
  { name: "P & S Carpet Bomber", size: "1 gal", category: "Interior", brand: "P & S" },
  { name: "P & S Terminator", size: "1 gal", category: "Interior", brand: "P & S" },
  { name: "Chemical Guys Total Interior", size: "16 oz", category: "Interior", brand: "Chemical Guys" },
  { name: "Chemical Guys Diablo Wheel & Tire Cleaner", size: "16 oz", category: "Exterior", brand: "Chemical Guys" },
  { name: "Chemical Guys Supreme Wash & Wax", size: "64 oz", category: "Exterior", brand: "Chemical Guys" },
  { name: "Cerakote Trim Coat Restoration Kit", size: "10 wipes", category: "Exterior", brand: "Cerakote" },
  { name: "Cerakote Intro Detailer & Protectant", size: "14 oz", category: "Dual-Use", brand: "Cerakote" },
  { name: "Cerakote Rapid Ceramic Paint Sealant", size: "14 oz", category: "Exterior", brand: "Cerakote" },
  { name: "Rain X", size: "16 oz", category: "Exterior", brand: "Misc" },
  { name: "ONR", size: "32 oz", category: "Dual-Use", brand: "Misc" },
  { name: "Armor All Wheel & Tire Cleaner", size: "24 oz", category: "Exterior", brand: "Misc" },
  { name: "Invisible Glass", size: "22 oz", category: "Dual-Use", brand: "Misc" },
  { name: "Armor All Multi Purpose Cleaner", size: "16 oz", category: "Dual-Use", brand: "Misc" },
];

async function run() {
  console.log("Fetching current chemicals...");
  const { data: existingChems, error: fetchError } = await supabase.from('chemical_library').select('name, default_size');
  
  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }

  const existingMap = new Set(existingChems.map(c => `${c.name.toLowerCase()}|${(c.default_size || '').toLowerCase()}`));
  
  const toSkip = [];
  const toInsert = [];

  for (const chem of newChemicals) {
    const key = `${chem.name.toLowerCase()}|${chem.size.toLowerCase()}`;
    if (existingMap.has(key)) {
      toSkip.push(chem);
    } else {
      toInsert.push({
        name: chem.name,
        category: chem.category,
        default_size: chem.size,
        used_for: [],
        hazard_level: "Low",
        dilution_ratios: {},
        updated_at: new Date().toISOString()
      });
    }
  }

  console.log(`Skipping ${toSkip.length} existing items.`);
  console.log(`Inserting ${toInsert.length} new items.`);

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('chemical_library').insert(toInsert);
    if (insertError) {
      console.error("Insert error:", insertError);
    } else {
      console.log("Insert successful!");
    }
  }

  console.log("\n--- SKIPPED ITEMS (Already in Inventory) ---");
  toSkip.forEach(s => console.log(`- ${s.name} (${s.size})`));
}

run();
