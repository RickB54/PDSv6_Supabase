import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const args = process.argv.slice(2);
const command = args[0] || 'help';

async function main() {
  switch (command) {
    case 'counts': {
      const { count: mCount } = await supabase.from('materials').select('*', { count: 'exact', head: true });
      const { count: tCount } = await supabase.from('tools').select('*', { count: 'exact', head: true });
      const { count: cCount } = await supabase.from('chemicals').select('*', { count: 'exact', head: true });
      console.log(`Counts -> Materials (Supplies): ${mCount}, Tools (Equipment): ${tCount}, Chemicals: ${cCount}`);
      break;
    }

    case 'apply-mapping': {
      console.log('--- Applying Part 1 Category Mapping & Cross-Table Moves ---');

      // 1. Within Supplies:
      // Towels & Microfiber:
      // CERAKOTE Microfiber Towels (12 Pack), Deedlite Premium Car Drying Towel, Microfiber Towels x3 (24"x35"), Premium Car Drying Towel
      const towels = [
        'CERAKOTE Microfiber Towels (12 Pack)',
        'Deedlite Premium Car Drying Towel',
        'Microfiber Towels x3 (24" x 35")',
        'Microfiber Towels x3 (24"x35")',
        'Premium Car Drying Towel'
      ];
      for (const name of towels) {
        const { error } = await supabase.from('materials').update({ category: 'Towels & Microfiber', updated_at: new Date().toISOString() }).ilike('name', `%${name}%`);
        if (error) console.error(`Error updating ${name}:`, error);
        else console.log(`Supplies -> Towels & Microfiber: ${name}`);
      }

      // Brushes & Applicators:
      // Lilly Brush (Pet Hair Tool), AIDEA Car Wash Mitt x2
      const brushes = [
        'Lilly Brush (Pet Hair Tool)',
        'AIDEA Car Wash Mitt x2'
      ];
      for (const name of brushes) {
        const { error } = await supabase.from('materials').update({ category: 'Brushes & Applicators', updated_at: new Date().toISOString() }).ilike('name', `%${name}%`);
        if (error) console.error(`Error updating ${name}:`, error);
        else console.log(`Supplies -> Brushes & Applicators: ${name}`);
      }

      // Bottles & Containers:
      // Spray Bottle (3 Pack, 24oz, 3 Colors), 2 Pcs Spray Bottle Storage Rack
      const bottles = [
        'Spray Bottle (3 Pack, 24 Oz, 3 Colors)',
        'Spray Bottle (3 Pack, 24oz, 3 Colors)',
        '2 Pcs Spray Bottle Storage Rack'
      ];
      for (const name of bottles) {
        const { error } = await supabase.from('materials').update({ category: 'Bottles & Containers', updated_at: new Date().toISOString() }).ilike('name', `%${name}%`);
        if (error) console.error(`Error updating ${name}:`, error);
        else console.log(`Supplies -> Bottles & Containers: ${name}`);
      }

      // Safety & PPE:
      // Collapsible Traffic Pop Up Reflective Safety Cone
      {
        const { error } = await supabase.from('materials').update({ category: 'Safety & PPE', updated_at: new Date().toISOString() }).ilike('name', '%Collapsible Traffic Pop Up Reflective Safety Cone%');
        if (error) console.error('Error updating Safety Cone:', error);
        else console.log('Supplies -> Safety & PPE: Collapsible Traffic Pop Up Reflective Safety Cone');
      }

      // Business & Branding:
      // HP Printer Paper 8.5x11, TN760 Toner Cartridge Black
      const biz = [
        'HP Printer Paper 8.5 x 11',
        'HP Printer Paper 8.5x11',
        'TN760 Toner Cartridge Black'
      ];
      for (const name of biz) {
        const { error } = await supabase.from('materials').update({ category: 'Business & Branding', updated_at: new Date().toISOString() }).ilike('name', `%${name}%`);
        if (error) console.error(`Error updating ${name}:`, error);
        else console.log(`Supplies -> Business & Branding: ${name}`);
      }

      // Dissolve "Clay & Decontamination" — Meguiar's G191700 Smooth Surface Clay Kit → Tools & Accessories
      {
        const { error } = await supabase.from('materials').update({ category: 'Tools & Accessories', updated_at: new Date().toISOString() }).ilike('name', "%Meguiar's G191700 Smooth Surface Clay Kit%");
        if (error) console.error('Error updating Meguiars Clay Kit:', error);
        else console.log("Supplies -> Tools & Accessories: Meguiar's G191700 Smooth Surface Clay Kit");
      }

      // "1 in. x 4 in. x 8 ft. Pine Lumber" -> Other
      {
        const { error } = await supabase.from('materials').update({ category: 'Other', updated_at: new Date().toISOString() }).ilike('name', '%Pine Lumber%');
        if (error) console.error('Error updating Pine Lumber:', error);
        else console.log('Supplies -> Other: 1 in. x 4 in. x 8 ft. Pine Lumber');
      }

      // 2. Supplies → Equipment Moves:
      // 3/4 Inch Male to Male Hose Adapter, 90 Degree Garden Hose Adapter, Hose Splitter 2 Way (qty2) → new "Hoses, Cords & Reels"
      // Mouse for NVR → Security & Office
      // 5 Gallon Gas Tank → Power Equipment & Systems
      const transferItems = [
        { search: '3/4 Inch Male to Male Hose Adapter', targetCat: 'Hoses, Cords & Reels', qty: 1 },
        { search: '90 Degree Garden Hose Adapter', targetCat: 'Hoses, Cords & Reels', qty: 1 },
        { search: 'Hose Splitter 2 Way', targetCat: 'Hoses, Cords & Reels', qty: 2 },
        { search: 'Mouse for NVR', targetCat: 'Security & Office', qty: 1 },
        { search: '5 Gallon Gas Tank', targetCat: 'Power Equipment & Systems', qty: 1 }
      ];

      for (const item of transferItems) {
        const { data: found } = await supabase.from('materials').select('*').ilike('name', `%${item.search}%`);
        if (found && found.length > 0) {
          for (const row of found) {
            console.log(`Transferring ${row.name} from materials to tools with category: ${item.targetCat}...`);
            // Check if already in tools
            const { data: existingTool } = await supabase.from('tools').select('id').eq('id', row.id).maybeSingle();
            if (!existingTool) {
              const toolData = {
                id: row.id,
                user_id: row.user_id,
                name: row.name,
                category: item.targetCat,
                price: row.cost_per_item || 0,
                quantity: item.qty || row.quantity || 1,
                low_threshold: row.low_threshold || 1,
                notes: row.notes || '',
                image_url: row.image_url,
                where_purchased: row.where_purchased,
                actual_price: row.actual_price,
                sale_price: row.sale_price,
                location: row.location,
                hide_from_iac: row.hide_from_iac ?? false,
                updated_at: new Date().toISOString()
              };
              const { error: insErr } = await supabase.from('tools').insert(toolData);
              if (insErr) {
                console.error(`Error inserting into tools for ${row.name}:`, insErr);
                continue;
              }
            } else {
              await supabase.from('tools').update({ category: item.targetCat, quantity: item.qty || row.quantity || 1 }).eq('id', row.id);
            }
            // Remove from materials
            const { error: delErr } = await supabase.from('materials').delete().eq('id', row.id);
            if (delErr) console.error(`Error deleting ${row.name} from materials:`, delErr);
            else console.log(`Successfully transferred ${row.name} to tools and removed from materials.`);
          }
        } else {
          // Check if already in tools
          const { data: inTools } = await supabase.from('tools').select('*').ilike('name', `%${item.search}%`);
          if (inTools && inTools.length > 0) {
            console.log(`${item.search} is already in tools with category ${inTools[0].category}. Updating category to ${item.targetCat}...`);
            await supabase.from('tools').update({ category: item.targetCat, quantity: item.qty }).ilike('name', `%${item.search}%`);
          }
        }
      }

      // 3. Within Equipment — dissolve "Accessories & Carts" entirely:
      // 3 Tier Utility Cart on Wheels, Chemical Guys Heavy Duty Detailing Buckets, Supplies Organizer Tote → Storage & Organizers
      const equipStorage = [
        '3 Tier Utility Cart on Wheels',
        'Chemical Guys Heavy Duty Detailing Buckets',
        'Supplies Organizer Tote',
        'YUKON 5-Tier Shelf'
      ];
      for (const name of equipStorage) {
        await supabase.from('tools').update({ category: 'Storage & Organizers', updated_at: new Date().toISOString() }).ilike('name', `%${name}%`);
        console.log(`Equipment -> Storage & Organizers: ${name}`);
      }

      // 8-in-1 USB C Hub Docking Station → Security & Office
      await supabase.from('tools').update({ category: 'Security & Office', updated_at: new Date().toISOString() }).ilike('name', '%8-in-1 USB C Hub Docking Station%');
      console.log('Equipment -> Security & Office: 8-in-1 USB C Hub Docking Station');

      // Buyers Products HBF8, 1/2 Inch NPT Breather Cap → Power Equipment & Systems
      await supabase.from('tools').update({ category: 'Power Equipment & Systems', updated_at: new Date().toISOString() }).ilike('name', '%Buyers Products HBF8, 1/2 Inch NPT Breather Cap%');
      console.log('Equipment -> Power Equipment & Systems: Buyers Products HBF8, 1/2 Inch NPT Breather Cap');

      // Drill America - KFDRSD3/8X27/64 27/64 → Hand Tools & Guns
      await supabase.from('tools').update({ category: 'Hand Tools & Guns', updated_at: new Date().toISOString() }).ilike('name', '%Drill America%');
      console.log('Equipment -> Hand Tools & Guns: Drill America - KFDRSD3/8X27/64 27/64');

      // Garden Hose Adapter 3/4"GHT, Hose (3 foot FlexZilla) qty3, Hose (5 foot FlexZilla), JESLED 5FT T5 T8 Extension Cords, T5 T8 Extension Cords → "Hoses, Cords & Reels"
      const equipHoses = [
        'Garden Hose Adapter 3/4" GHT',
        'Garden Hose Adapter 3/4"GHT',
        'Hose (3 foot FlexZilla)',
        'Hose (5 foot FlexZilla)',
        'JESLED 5FT T5 T8 Extension Cords',
        'T5 T8 Extension Cords'
      ];
      for (const name of equipHoses) {
        await supabase.from('tools').update({ category: 'Hoses, Cords & Reels', updated_at: new Date().toISOString() }).ilike('name', `%${name}%`);
        console.log(`Equipment -> Hoses, Cords & Reels: ${name}`);
      }

      // 4. New "Pump Sprayer & Foam Cannons" category, pulled from Hand Tools & Guns:
      // AstroAI Foam Cannon, DBR Tech Foam Cannon, Foam Cannon, Foam Cannon for Pressure Washer, HDX2 1 Gallon Pump Sprayer, HDX2 2 Gallon Pump Sprayer, HDX 56oz Handheld Pump Sprayer (qty2)
      const pumpSprayers = [
        'AstroAI Foam Cannon',
        'DBR Tech® Foam Cannon',
        'DBR Tech Foam Cannon',
        'Foam Cannon for Pressure Washer',
        'Foam Cannon', // Exact name check below
        'HDX2 1 Gallon Multi-Purpose Lawn and Garden Pump Sprayer',
        'HDX2 2 Gallon Multi-Purpose Lawn and Garden Pump Sprayer',
        'HDX 56oz Handheld Multi-Purpose Pump Sprayer'
      ];
      for (const name of pumpSprayers) {
        if (name === 'Foam Cannon') {
          await supabase.from('tools').update({ category: 'Pump Sprayer & Foam Cannons', updated_at: new Date().toISOString() }).eq('name', 'Foam Cannon');
        } else {
          await supabase.from('tools').update({ category: 'Pump Sprayer & Foam Cannons', updated_at: new Date().toISOString() }).ilike('name', `%${name}%`);
        }
        console.log(`Equipment -> Pump Sprayer & Foam Cannons: ${name}`);
      }

      // 5. Other Equipment moves:
      // Pressure Washer Gun and Hose Kit 50FT, 3PCS Car Detailing Brush Set, 6 inch Orbital Polisher → Hand Tools & Guns
      const handTools = [
        'Pressure Washer Gun and Hose Kit, 50FT',
        '3PCS Car Detailing Brush Set',
        '6 inch Orbital Polisher'
      ];
      for (const name of handTools) {
        await supabase.from('tools').update({ category: 'Hand Tools & Guns', updated_at: new Date().toISOString() }).ilike('name', `%${name}%`);
        console.log(`Equipment -> Hand Tools & Guns: ${name}`);
      }

      // HUSKY 18/15/12 in. Tool Bag Combo → Storage & Organizers
      await supabase.from('tools').update({ category: 'Storage & Organizers', updated_at: new Date().toISOString() }).ilike('name', '%HUSKY18 in., 15 in. and 12 in. Tool Bag Combo%');
      console.log('Equipment -> Storage & Organizers: HUSKY Tool Bag Combo');

      // Document Organizer Folder → Security & Office
      await supabase.from('tools').update({ category: 'Security & Office', updated_at: new Date().toISOString() }).ilike('name', '%Document Organizer Folder%');
      console.log('Equipment -> Security & Office: Document Organizer Folder');

      // Respirator, Respirator Cartridges → new "Safety & PPE"
      await supabase.from('tools').update({ category: 'Safety & PPE', updated_at: new Date().toISOString() }).ilike('name', '%Respirator%');
      console.log('Equipment -> Safety & PPE: Respirator & Respirator Cartridges');

      // Spray Bottle Carry Caddy → Storage & Organizers
      await supabase.from('tools').update({ category: 'Storage & Organizers', updated_at: new Date().toISOString() }).ilike('name', '%Spray Bottle Carry Caddy%');
      console.log('Equipment -> Storage & Organizers: Spray Bottle Carry Caddy');

      // 3/4 Garden Hose Quick Connects, 3/4 Male-to-Male Hose Adapters, Flexzilla Garden Hose 5/8"x50ft, Retractable Garden Hose Reel 1/2"x100ft, Hose (50ft), Retractable Hose Reel 1/4"x50FT, CENTRAL PNEUMATIC Air Compressor Reel & Hose, Pressure Washer Reel & Hose (60ft) qty2, Electrical Extension Reel & Cord (45ft) → "Hoses, Cords & Reels"
      const moreHoses = [
        '3/4 Inch Garden Hose Quick Connects',
        '3/4 Inch Male to Male Hose Adapters',
        'Flexzilla Garden Hose 5/8 in. x 50 ft',
        'Retractable Garden Hose Reel, 1/2 in x 100 ft',
        'Hose (50 ft)',
        'Retractable Hose Reel, 1/4" x 50 FT',
        'CENTRAL PNEUMATIC 3/8 in xc 50 ft. Air Compressor Reel & Hose',
        'Pressure Washer Reel & Hose (60 feet) x2',
        'Electrical Extension Reel & Cord (45 feet, 12 Gauge)'
      ];
      for (const name of moreHoses) {
        await supabase.from('tools').update({ category: 'Hoses, Cords & Reels', updated_at: new Date().toISOString() }).ilike('name', `%${name}%`);
        console.log(`Equipment -> Hoses, Cords & Reels: ${name}`);
      }

      // Gas Converter for Predator Generator → Power Equipment & Systems
      await supabase.from('tools').update({ category: 'Power Equipment & Systems', updated_at: new Date().toISOString() }).ilike('name', '%Gas Converter for Predator Generator%');
      console.log('Equipment -> Power Equipment & Systems: Gas Converter for Predator Generator');

      console.log('\n--- All database updates applied successfully ---');
      break;
    }

    case 'verify': {
      console.log('=== LIVE DATABASE VERIFICATION ===\n');

      const { data: materials } = await supabase.from('materials').select('*').order('name');
      const { data: tools } = await supabase.from('tools').select('*').order('name');

      console.log(`SUPPLIES (materials table) Count: ${materials?.length}`);
      console.log(`EQUIPMENT (tools table) Count: ${tools?.length}`);
      console.log(`Grand Total: ${(materials?.length || 0) + (tools?.length || 0)}\n`);

      // Supplies Breakdown
      const suppCategories: Record<string, any[]> = {};
      (materials || []).forEach(m => {
        const cat = m.category || 'Unassigned';
        if (!suppCategories[cat]) suppCategories[cat] = [];
        suppCategories[cat].push(m);
      });

      console.log('--- SUPPLIES CATEGORY BREAKDOWN ---');
      for (const cat of Object.keys(suppCategories).sort()) {
        console.log(`\n${cat} (${suppCategories[cat].length}):`);
        suppCategories[cat].forEach(item => {
          console.log(`  - ${item.name} (qty: ${item.quantity || 1})`);
        });
      }

      // Equipment Breakdown
      const equipCategories: Record<string, any[]> = {};
      (tools || []).forEach(t => {
        const cat = t.category || 'Unassigned';
        if (!equipCategories[cat]) equipCategories[cat] = [];
        equipCategories[cat].push(t);
      });

      console.log('\n--- EQUIPMENT CATEGORY BREAKDOWN ---');
      for (const cat of Object.keys(equipCategories).sort()) {
        console.log(`\n${cat} (${equipCategories[cat].length}):`);
        equipCategories[cat].forEach(item => {
          console.log(`  - ${item.name} (qty: ${item.quantity || 1})`);
        });
      }
      break;
    }

    case 'search': {
      const table = args[1] || 'materials';
      const term = (args[2] || '').toLowerCase();
      const tables = table === 'all' ? ['materials', 'tools', 'chemicals'] : [table];
      for (const tbl of tables) {
        const { data } = await supabase.from(tbl).select('*').order('name');
        const matches = (data || []).filter((r: any) =>
          (r.name || '').toLowerCase().includes(term) ||
          (r.category || '').toLowerCase().includes(term) ||
          (r.notes || '').toLowerCase().includes(term)
        );
        console.log(`\n--- [${tbl.toUpperCase()}] Matches for "${term}" (${matches.length}) ---`);
        matches.forEach((m: any) => {
          console.log(`[${m.category}] ${m.name} (qty: ${m.quantity || m.current_stock || 1}, id: ${m.id})`);
        });
      }
      break;
    }

    case 'list-categories': {
      const table = args[1] || 'materials';
      const { data } = await supabase.from(table).select('name, category').order('name');
      const catMap: Record<string, string[]> = {};
      (data || []).forEach((r: any) => {
        const cat = r.category || 'Unassigned';
        if (!catMap[cat]) catMap[cat] = [];
        catMap[cat].push(r.name);
      });
      console.log(`\n=== Categories for ${table} (Total: ${data?.length}) ===`);
      for (const cat of Object.keys(catMap).sort()) {
        console.log(`\n${cat} (${catMap[cat].length}):`);
        catMap[cat].forEach(n => console.log(`  - ${n}`));
      }
      break;
    }

    case 'get': {
      const table = args[1] || 'materials';
      const id = args[2];
      if (!id) {
        console.log('Usage: npx tsx query_db.ts get <table|all> <id>');
        return;
      }
      const tables = table === 'all' ? ['materials', 'tools', 'chemicals'] : [table];
      for (const tbl of tables) {
        const { data } = await supabase.from(tbl).select('*').eq('id', id).maybeSingle();
        if (data) {
          console.log(`Found in ${tbl}:`, JSON.stringify(data, null, 2));
          return;
        }
      }
      console.log(`Item with id ${id} not found.`);
      break;
    }

    default:
      console.log(`
Commands:
  npx tsx query_db.ts counts
  npx tsx query_db.ts apply-mapping
  npx tsx query_db.ts verify
  npx tsx query_db.ts search <table|all> <query>
  npx tsx query_db.ts list-categories <table|materials|tools|chemicals>
  npx tsx query_db.ts get <table|all> <id>
      `);
  }
}

main().catch(err => {
  console.error('Error in query_db.ts:', err);
  process.exit(1);
});
