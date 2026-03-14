
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envText = fs.readFileSync('.env', 'utf8');
const env = envText.split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length > 0) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {} as any);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const inventoryList = [
  { brand: "Superior Products", name: "Spray wax", size: "1 gal" },
  { brand: "Superior Products", name: "Dirt Buster", size: "1 gal" }, // Renamed from For Buster
  { brand: "Superior Products", name: "Dark Fury", size: "1 gal" },
  { brand: "Superior Products", name: "Road Warrior", size: "1 gal" },
  { brand: "Superior Products", name: "Aqua Gloss", size: "8oz" },
  { brand: "Superior Products", name: "Formula 4", size: "8 oz" },
  { brand: "Superior Products", name: "EZ Shine", size: "8 oz" },
  { brand: "Superior Products", name: "Muscle Magic", size: "8 oz" },
  { brand: "Superior Products", name: "Zap It", size: "8 oz" },
  { brand: "Meguiar's", name: "Gold Class Shampoo & Conditioner", size: "64 oz" },
  { brand: "Meguiar's", name: "Quick Detailer", size: "16 oz" },
  { brand: "Meguiar's", name: "APC", size: "1 gal" },
  { brand: "Turtle Wax", name: "Wax & Dry", size: "26 oz" },
  { brand: "Turtle Wax", name: "Ceramic Graphene Inside Job", size: "16 oz" },
  { brand: "Turtle Wax", name: "Ceramic Acrylic Black Wax", size: "16 oz" },
  { brand: "P & S", name: "Carpet Bomber", size: "1 gal" },
  { brand: "P & S", name: "Terminator", size: "1 gal" },
  { brand: "Chemical Guys", name: "Total Interior", size: "16 oz" },
  { brand: "Chemical Guys", name: "Diablo Wheel & Tire Cleaner", size: "16 oz" },
  { brand: "Chemical Guys", name: "Supreme Wash & Wax", size: "16 oz" }, // Assuming a size
  { brand: "Cerakote", name: "Trim Coat Restoration Kit", size: "10 wipes" },
  { brand: "Cerakote", name: "Intro Detailer & Protectant", size: "14 oz" },
  { brand: "Cerakote", name: "Rapid Ceramic Paint Sealant", size: "14 oz" },
  { brand: "Misc", name: "Rain X", size: "16 oz" },
  { brand: "Misc", name: "ONR", size: "32 oz" },
  { brand: "Misc", name: "Armor All Wheel & Tire Cleaner", size: "24 oz" },
  { brand: "Misc", name: "Invisible Glass", size: "22 oz" },
  { brand: "Misc", name: "Armor All Multi Purpose Cleaner", size: "16 oz" },
];

async function run() {
  console.log("Starting Inventory Import to 'chemicals' table...");
  
  const { data: users, error: userErr } = await supabase.from('app_users').select('id, email');
  if (userErr) {
      console.error("Error fetching users:", userErr);
      return;
  }

  const adminEmail = env.VITE_ADMIN_EMAILS?.split(',')[0].trim().toLowerCase();
  let userId = users.find(u => u.email?.toLowerCase() === adminEmail)?.id || users[0]?.id;

  if (!userId) {
    console.error("No valid user found.");
    return;
  }
  console.log(`Using User ID: ${userId}`);

  const { data: existing, error: fetchErr } = await supabase.from('chemicals').select('*');
  if (fetchErr) {
    console.error("Fetch Error:", fetchErr);
    return;
  }

  const existingSet = new Set(existing.map(e => e.name.toLowerCase()));

  const toInsert = [];
  const skipped = [];

  for (const item of inventoryList) {
    // Combine Brand and Name since 'brand' column is missing in DB
    const fullName = `${item.brand} - ${item.name}`;
    if (existingSet.has(fullName.toLowerCase())) {
      skipped.push(item);
    } else {
      toInsert.push({
        user_id: userId,
        name: fullName,
        bottle_size: item.size,
        current_stock: 0,
        threshold: 1,
        cost_per_bottle: 0,
        updated_at: new Date().toISOString()
      });
    }
  }

  console.log(`Skipping ${skipped.length} existing items.`);
  console.log(`Inserting ${toInsert.length} new items into Inventory...`);

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from('chemicals').insert(toInsert);
    if (insErr) {
      console.error("Insert Error details:", insErr);
    } else {
      console.log("Inventory Import Successful!");
    }
  }

  if (skipped.length > 0) {
    console.log("\n--- ITEMS SKIPPED (Already in Inventory) ---");
    skipped.forEach(s => console.log(`- ${s.brand}: ${s.name} (${s.size})`));
  }
}

run();
