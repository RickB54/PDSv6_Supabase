
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting batch tax update for inventory items...");

  // 1. Fetch all items
  const { data: chemicals } = await supabase.from('chemicals').select('id, name, cost_per_bottle, current_stock, purchase_date');
  const { data: materials } = await supabase.from('materials').select('id, name, cost_per_item, quantity, created_at');
  const { data: tools } = await supabase.from('equipment').select('id, name, price, quantity, purchase_date');

  // 2. Fetch existing tax expenses linked to assets
  const { data: existingTax } = await supabase.from('tax_expenses').select('asset_id').not('asset_id', 'is', null);
  const existingAssetIds = new Set(existingTax?.map(t => t.asset_id) || []);

  const toCreate: any[] = [];

  // Chemicals
  chemicals?.forEach(c => {
    if (!existingAssetIds.has(c.id)) {
      toCreate.push({
        date: c.purchase_date || new Date().toISOString().split('T')[0],
        amount: (c.cost_per_bottle || 0) * (c.current_stock || 0),
        vendor: "Initial Inventory",
        category: "Supplies",
        notes: `Batch tracked: ${c.name}`,
        is_deductible: true,
        asset_id: c.id
      });
    }
  });

  // Materials
  materials?.forEach(m => {
    if (!existingAssetIds.has(m.id)) {
      toCreate.push({
        date: m.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        amount: (m.cost_per_item || 0) * (m.quantity || 0),
        vendor: "Initial Inventory",
        category: "Supplies",
        notes: `Batch tracked: ${m.name}`,
        is_deductible: true,
        asset_id: m.id
      });
    }
  });

  // Tools
  tools?.forEach(t => {
    if (!existingAssetIds.has(t.id)) {
      toCreate.push({
        date: t.purchase_date || new Date().toISOString().split('T')[0],
        amount: (t.price || 0) * (t.quantity || 1),
        vendor: "Initial Inventory",
        category: "Equipment",
        notes: `Batch tracked: ${t.name}`,
        is_deductible: true,
        asset_id: t.id
      });
    }
  });

  console.log(`Found ${toCreate.length} items to add to tax deductions.`);

  if (toCreate.length > 0) {
    const { error } = await supabase.from('tax_expenses').insert(toCreate);
    if (error) {
      console.error("Batch insert failed:", error);
    } else {
      console.log("Successfully updated all inventory items to be tax-deductible!");
    }
  } else {
    console.log("All items are already tracked for taxes.");
  }
}

run();
