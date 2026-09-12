import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    case 'dump-chems': {
      const { data, error } = await supabase.from('chemicals').select('*').order('name');
      if (error) {
        console.error('Error fetching chemicals:', error);
        return;
      }
      console.log(`Found ${data?.length} chemicals:`);
      data?.forEach((c: any) => {
        console.log(`[${c.name}] | size: ${c.bottle_size} | shelf: "${c.shelf}" | section: "${c.section}" | shelf_location: "${c.shelf_location}" | loc: "${c.location}" | cat: "${c.category}" | updated_at: ${c.updated_at}`);
      });
      break;
    }

    case 'audit-history': {
      const { data, error } = await supabase.from('inventory_audit_history').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching inventory_audit_history:', error);
        return;
      }
      console.log(`Found ${data?.length} audit history records:`);
      data?.forEach((h: any) => {
        console.log(`ID: ${h.id} | Date: ${h.timestamp || h.created_at} | Status: ${h.status} | Total: ${h.total_counted}`);
        if (h.chem_audit) {
          const chems = Array.isArray(h.chem_audit) ? h.chem_audit : Object.values(h.chem_audit);
          console.log(`  chem_audit items count: ${chems.length}`);
        }
      });
      break;
    }

    case 'restore-from-audit': {
      const fs = await import('fs');
      const auditPath = 'C:/Users/rberu/.gemini/antigravity/brain/6ff490f2-c76b-4cfd-82b1-6702100c1c51/scratch/final_chemical_location_audit.json';
      const raw = fs.readFileSync(auditPath, 'utf8');
      const auditList: any[] = JSON.parse(raw);

      console.log(`Loaded ${auditList.length} items from final_chemical_location_audit.json`);

      const { data: currentChems, error: cErr } = await supabase.from('chemicals').select('*');
      if (cErr) throw cErr;

      let updatedCount = 0;
      for (const item of auditList) {
        const current = currentChems.find(c => c.id === item.id);
        if (!current) {
          console.warn(`Item ${item.name} (${item.id}) not found in current chemicals!`);
          continue;
        }

        // Parse afterLocation: e.g. "Chemical Rack | 4th Shelf - Left Side" or "Chemical Rack | -"
        let shelf: string | null = null;
        let section: string | null = null;
        let shelfLocation: string | null = null;

        const locParts = (item.afterLocation || '').split('|').map((s: string) => s.trim());
        const primary = locParts[0] || 'Chemical Rack';
        const sec = locParts[1] || '-';

        if (sec && sec !== '-' && sec !== 'Unassigned') {
          if (sec.includes(' - ')) {
            const [sh, se] = sec.split(' - ').map((s: string) => s.trim());
            shelf = sh;
            section = se;
            shelfLocation = `${sh} - ${se}`;
          } else {
            shelf = sec;
            section = null;
            shelfLocation = sec;
          }
        }

        // Category format: usageType|__CC__|finalChemicalCategory
        let catToSave = `${item.usageType || 'exterior'}|__CC__|${item.finalChemicalCategory || 'General Chemicals'}`;
        // Preserve rack location if outside Chemical Rack (e.g. Small Brown Rack)
        if (current.category && current.category.includes('|__L__|')) {
          const rackPart = current.category.split('|__L__|')[1];
          if (rackPart && rackPart !== 'Chemical Rack') {
            catToSave = `${catToSave}|__L__|${rackPart}`;
          }
        }

        const payload: any = {
          shelf,
          section,
          category: catToSave,
          updated_at: new Date().toISOString()
        };

        const { error: uErr } = await supabase.from('chemicals').update(payload).eq('id', item.id);
        if (uErr) {
          console.error(`Error updating ${item.name}:`, uErr);
        } else {
        }
      }
      console.log(`\nSuccessfully restored ${updatedCount} chemical records in Supabase!`);
      break;
    }

    case 'fix-small-brown-rack': {
      // Invisible Glass Cleaner -> Small Brown Rack, 2nd Shelf
      await supabase.from('chemicals').update({
        shelf: '2nd Shelf',
        section: null,
        updated_at: new Date().toISOString()
      }).eq('id', 'b458c415-f15b-4b60-a9b6-b93cc5329870');

      // Rain X -> Small Brown Rack, 3rd Shelf
      await supabase.from('chemicals').update({
        shelf: '3rd Shelf',
        section: null,
        updated_at: new Date().toISOString()
      }).eq('id', 'e2f7f1b1-9970-48d8-99cb-b6f9e96f45f2');

      console.log('Fixed Invisible Glass Cleaner (2nd Shelf) and Rain X (3rd Shelf) on Small Brown Rack.');
      break;
    }

    case 'verify-chems': {
      const { data, error } = await supabase.from('chemicals').select('*').order('name');
      if (error) throw error;

      console.log('\n=================== CHEMICALS VERIFICATION REPORT ===================');
      console.log(`Total Chemicals: ${data?.length}\n`);

      const gallons: any[] = [];
      const goldClass: any[] = [];
      const others: any[] = [];

      data?.forEach((c: any) => {
        let primLoc = 'Chemical Rack';
        let rawCat = c.category || '';
        if (rawCat.includes('|__L__|')) {
          primLoc = rawCat.split('|__L__|')[1] || 'Chemical Rack';
          rawCat = rawCat.split('|__L__|')[0];
        }
        let chemCat = rawCat;
        if (rawCat.includes('|__CC__|')) {
          chemCat = rawCat.split('|__CC__|')[1];
        }

        const secLoc = (c.shelf && c.section) ? `${c.shelf} - ${c.section}` : (c.shelf || c.section || 'None / Unassigned');

        const itemObj = {
          id: c.id,
          name: c.name,
          brand: c.brand || 'N/A',
          size: c.bottle_size?.split('|__CT__|')[0] || c.bottle_size,
          primLoc,
          secLoc,
          shelf: c.shelf,
          section: c.section,
          chemCat
        };

        const sizeLower = (itemObj.size || '').toLowerCase();
        if (sizeLower.includes('gal')) {
          gallons.push(itemObj);
        } else if (itemObj.name.includes('Gold Class')) {
          goldClass.push(itemObj);
        } else {
          others.push(itemObj);
        }
      });

      console.log(`--- GALLON CHEMICALS (${gallons.length}) ---`);
      gallons.sort((a, b) => a.secLoc.localeCompare(b.secLoc) || a.name.localeCompare(b.name)).forEach((g, i) => {
        console.log(`${(i + 1).toString().padStart(2)}. [${g.secLoc}] ${g.brand} - ${g.name} (${g.size}) -> Category: ${g.chemCat}`);
      });

      console.log(`\n--- 64oz MEGUIAR'S GOLD CLASS (${goldClass.length}) ---`);
      goldClass.forEach(gc => {
        console.log(`    [${gc.secLoc}] ${gc.brand} - ${gc.name} (${gc.size}) -> Category: ${gc.chemCat}`);
      });

      console.log(`\n--- OTHER CHEMICALS (${others.length}) ---`);
      others.sort((a, b) => a.primLoc.localeCompare(b.primLoc) || a.secLoc.localeCompare(b.secLoc) || a.name.localeCompare(b.name)).forEach((o, i) => {
        console.log(`${(i + 1).toString().padStart(2)}. [${o.primLoc} | ${o.secLoc}] ${o.brand} - ${o.name} (${o.size}) -> Category: ${o.chemCat}`);
      });

      break;
    }

    case 'export-iac-pdf': {
      console.log('Generating fresh IAC "By Location" PDF export...');

      const LOCATION_RANK_ORDER = [
        "Chemical Rack",
        "Medium Grey Rack",
        "Small Brown Rack",
        "1 x 4 Back Wall Shelf",
        "Unassigned"
      ];

      const SHELF_RANK_ORDER = [
        "Bottom Shelf", "2nd Shelf", "3rd Shelf", "4th Shelf", "Top Shelf", "Small Rack - Shelf 3", "Specialty Caddy", "Interior Caddy", "Exterior Caddy", "Unassigned"
      ];

      const SECTION_RANK_ORDER = [
        "Left Side", "Right Side", "Unassigned"
      ];

      const sortChemicalGroups = (a: string, b: string) => {
        const [shelfA = 'Unassigned', sectionA = 'Unassigned'] = a.split(/\s*[\/\-]\s*/).map(s => s.trim());
        const [shelfB = 'Unassigned', sectionB = 'Unassigned'] = b.split(/\s*[\/\-]\s*/).map(s => s.trim());
        
        let rankShelfA = SHELF_RANK_ORDER.indexOf(shelfA);
        let rankShelfB = SHELF_RANK_ORDER.indexOf(shelfB);
        if (rankShelfA === -1) rankShelfA = 999;
        if (rankShelfB === -1) rankShelfB = 999;
        if (rankShelfA !== rankShelfB) return rankShelfA - rankShelfB;
        
        let rankSectionA = SECTION_RANK_ORDER.indexOf(sectionA);
        let rankSectionB = SECTION_RANK_ORDER.indexOf(sectionB);
        if (rankSectionA === -1) rankSectionA = 999;
        if (rankSectionB === -1) rankSectionB = 999;
        if (rankSectionA !== rankSectionB) return rankSectionA - rankSectionB;
        
        return a.localeCompare(b);
      };

      const sortLocationGroups = (a: string, b: string) => {
        let rankA = LOCATION_RANK_ORDER.indexOf(a.split(' - ')[0] || a);
        let rankB = LOCATION_RANK_ORDER.indexOf(b.split(' - ')[0] || b);
        if (rankA === -1) rankA = 999;
        if (rankB === -1) rankB = 999;
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b);
      };

      const normalizeSize = (size?: string) => {
        if (!size) return '';
        const lower = size.toLowerCase().trim();
        if (lower.includes('gal')) return '1 Gallon';
        const ozMatch = lower.match(/(\d+)\s*oz/);
        if (ozMatch) return `${ozMatch[1]} oz`;
        const numMatch = lower.match(/^(\d+)$/);
        if (numMatch) return `${numMatch[1]} oz`;
        return size.trim();
      };

      const { data: rawChems } = await supabase.from('chemicals').select('*');
      const { data: rawSupplies } = await supabase.from('materials').select('*');
      const { data: rawEquip } = await supabase.from('tools').select('*');

      const chemicals = (rawChems || []).filter(c => !c.hide_from_iac && !c.hideFromIac).map(c => {
        const isCaddy = (c.shelf || '').toLowerCase().includes('caddy');
        const defaultShelfLoc = (c.shelf || c.section) ? `${c.shelf || 'Unassigned'} / ${c.section || 'Unassigned'}` : undefined;
        let primLoc = 'Chemical Rack';
        let rawCat = c.category || '';
        if (rawCat.includes('|__L__|')) {
          primLoc = rawCat.split('|__L__|')[1] || 'Chemical Rack';
          rawCat = rawCat.split('|__L__|')[0];
        }
        let chemCat = rawCat;
        if (rawCat.includes('|__CC__|')) {
          chemCat = rawCat.split('|__CC__|')[1];
        }

        const rawSize = c.bottle_size?.split('|__CT__|')[0] || c.bottle_size;
        const containerType = c.bottle_size?.includes('|__CT__|') ? c.bottle_size.split('|__CT__|')[1] : '';

        return {
          id: c.id,
          name: c.name,
          brand: c.brand,
          location: c.location || primLoc,
          shelfLocation: isCaddy ? c.shelf : defaultShelfLoc,
          containerLocation: isCaddy ? c.shelf : defaultShelfLoc,
          bottleSize: normalizeSize(rawSize),
          chemicalCategory: chemCat || 'General Chemicals',
          containerType,
          currentStock: c.current_stock ?? c.quantity ?? 1
        };
      });

      const supplies = (rawSupplies || []).filter(s => !s.hide_from_iac && !s.hideFromIac).map(s => ({
        id: s.id,
        name: s.name,
        location: s.location || 'Unassigned',
        containerLocation: s.container_location || 'N/A',
        category: s.category || 'Unassigned',
        quantity: s.quantity || 1
      }));

      const equipment = (rawEquip || []).filter(e => !e.hide_from_iac && !e.hideFromIac).map(e => ({
        id: e.id,
        name: e.name,
        location: e.location || 'Unassigned',
        containerLocation: e.container_location || 'N/A',
        category: e.category || 'Unassigned',
        quantity: e.quantity || 1
      }));

      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('Inventory Audit Checklist', 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${new Date().toLocaleString()}`, 14, 28);
      doc.setTextColor(0, 0, 0);

      let currentY = 40;

      const renderSection = (categoryName: 'Chemicals' | 'Supplies' | 'Equipment', items: any[]) => {
        if (items.length === 0) return;
        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFontSize(16);
        doc.setTextColor(40, 80, 160);
        doc.text(`${categoryName} (By Location)`, 14, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 10;

        const pdfGroups: Record<string, any[]> = {};
        items.forEach(item => {
          let groupKey = 'Unassigned';
          if (categoryName === 'Chemicals') {
            const primLoc = item.location || 'Chemical Rack';
            const secLoc = item.containerLocation || item.shelfLocation || 'N/A';
            groupKey = `${primLoc}|${secLoc}`;
          } else {
            groupKey = item.location || 'Unassigned';
          }
          if (!pdfGroups[groupKey]) pdfGroups[groupKey] = [];
          pdfGroups[groupKey].push(item);
        });

        const sortedGroupKeys = Object.keys(pdfGroups).sort((a, b) => {
          if (categoryName === 'Chemicals') {
            const [primA, secA] = a.split('|');
            const [primB, secB] = b.split('|');
            if (primA === 'Chemical Rack' && primB !== 'Chemical Rack') return -1;
            if (primB === 'Chemical Rack' && primA !== 'Chemical Rack') return 1;
            if (primA !== primB) return primA.localeCompare(primB);
            return sortChemicalGroups(secA || '', secB || '');
          }
          return sortLocationGroups(a, b);
        });

        sortedGroupKeys.forEach(groupName => {
          const groupItems = pdfGroups[groupName].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          if (groupItems.length === 0) return;

          if (currentY > 260) {
            doc.addPage();
            currentY = 20;
          }

          let head: string[][];
          let columnStyles: any;

          if (categoryName === 'Chemicals') {
            const [primLoc, secLoc] = groupName.split('|');
            head = [[`Primary: ${primLoc} | Sec: ${secLoc}`, 'Size', 'Category', 'Container Type', '% Remaining', 'DB Qty', 'Actual Count']];
            columnStyles = { 0: { cellWidth: 'auto' }, 1: { cellWidth: 16 }, 2: { cellWidth: 26 }, 3: { cellWidth: 22 }, 4: { cellWidth: 18 }, 5: { cellWidth: 14, halign: 'center' }, 6: { cellWidth: 18 } };
          } else {
            head = [[`Primary Location: ${groupName}`, 'Secondary Location', 'Category', 'DB Qty', 'Actual Count']];
            columnStyles = { 0: { cellWidth: 'auto' }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 20, halign: 'center' }, 4: { cellWidth: 25 } };
          }

          autoTable(doc, {
            startY: currentY,
            head,
            body: groupItems.map(item => {
              if (categoryName === 'Chemicals') {
                const nameStr = `${item.brand ? item.brand + ' / ' : ''}${item.name}`;
                return [
                  nameStr,
                  item.bottleSize || 'N/A',
                  item.chemicalCategory || 'N/A',
                  item.containerType || '',
                  '',
                  item.currentStock?.toFixed(2) || '0',
                  ''
                ];
              } else {
                return [
                  item.name,
                  item.containerLocation || 'N/A',
                  item.category || 'Unassigned',
                  item.quantity || 1,
                  ''
                ];
              }
            }),
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            styles: { textColor: [0, 0, 0] },
            columnStyles,
            margin: { top: 10 }
          });

          currentY = (doc as any).lastAutoTable.finalY + 10;
        });

        if (currentY > 270) { doc.addPage(); currentY = 20; }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.text(`${categoryName} Subtotal: 0 of ${items.length} items counted`, 14, currentY);
        doc.setFont('helvetica', 'normal');
        currentY += 20;
      };

      renderSection('Chemicals', chemicals);
      renderSection('Supplies', supplies);
      renderSection('Equipment', equipment);

      const fileName = `Full_IAC_Report_location_${new Date().toISOString().split('T')[0]}.pdf`;
      const localPath = path.resolve(process.cwd(), fileName);
      const artifactDir = 'C:\\Users\\rberu\\.gemini\\antigravity-ide\\brain\\f968ea3a-b9fa-410f-a724-39fd16a9eabb';
      const artifactPath = path.resolve(artifactDir, fileName);

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      fs.writeFileSync(localPath, pdfBuffer);
      console.log(`Saved PDF to: ${localPath}`);

      if (fs.existsSync(artifactDir)) {
        fs.writeFileSync(artifactPath, pdfBuffer);
        console.log(`Saved PDF to artifact dir: ${artifactPath}`);
      }

      break;
    }

    default:
      console.log(`
Commands:
  npx tsx query_db.ts counts
  npx tsx query_db.ts apply-mapping
  npx tsx query_db.ts verify
  npx tsx query_db.ts verify-chems
  npx tsx query_db.ts export-iac-pdf
  npx tsx query_db.ts search <table|all> <query>
  npx tsx query_db.ts list-categories <table|materials|tools|chemicals>
  npx tsx query_db.ts get <table|all> <id>
  npx tsx query_db.ts dump-chems
  npx tsx query_db.ts audit-history
  npx tsx query_db.ts query-table <table>
      `);
  }
}

main().catch(err => {
  console.error('Error in query_db.ts:', err);
  process.exit(1);
});
