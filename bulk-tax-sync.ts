import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function runBulkTaxSync() {
  console.log('Starting Bulk Tax Sync...');

  // 1. Fetch all data
  const { data: chemicals } = await supabase.from('chemicals').select('*');
  const { data: materials } = await supabase.from('materials').select('*');
  const { data: tools } = await supabase.from('tools').select('*');
  const { data: taxExpenses } = await supabase.from('tax_expenses').select('asset_id');

  const existingAssetIds = new Set((taxExpenses || []).map(te => te.asset_id).filter(Boolean));

  let createdCount = 0;

  // Sync Chemicals
  for (const item of (chemicals || [])) {
    if (!existingAssetIds.has(item.id)) {
      const amount = (item.cost_per_bottle || 0) * (item.current_stock || 1);
      if (amount > 0) {
        await supabase.from('tax_expenses').insert({
          asset_id: item.id,
          amount: amount,
          category: 'Chemicals',
          vendor: item.where_purchased || 'Amazon',
          is_deductible: true,
          date: new Date().toISOString().split('T')[0],
          notes: `Auto-synced from inventory: ${item.name}`
        });
        createdCount++;
      }
    }
  }

  // Sync Materials
  for (const item of (materials || [])) {
    if (!existingAssetIds.has(item.id)) {
      const amount = (item.cost_per_item || 0) * (item.quantity || 1);
      if (amount > 0) {
        await supabase.from('tax_expenses').insert({
          asset_id: item.id,
          amount: amount,
          category: 'Supplies',
          vendor: item.where_purchased || 'Amazon',
          is_deductible: true,
          date: new Date().toISOString().split('T')[0],
          notes: `Auto-synced from inventory: ${item.name}`
        });
        createdCount++;
      }
    }
  }

  // Sync Tools
  for (const item of (tools || [])) {
    if (!existingAssetIds.has(item.id)) {
      const amount = (item.price || 0) * (item.quantity || 1);
      if (amount > 0) {
        await supabase.from('tax_expenses').insert({
          asset_id: item.id,
          amount: amount,
          category: 'Equipment',
          vendor: item.where_purchased || 'Amazon',
          is_deductible: true,
          date: new Date().toISOString().split('T')[0],
          notes: `Auto-synced from inventory: ${item.name}`
        });
        createdCount++;
      }
    }
  }

  console.log(`Sync Complete. Created ${createdCount} missing tax deduction records.`);
}

runBulkTaxSync().catch(console.error);
