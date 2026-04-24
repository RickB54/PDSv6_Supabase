import { supabase, isDemoActive } from './supa-data';
import { Chemical } from '@/types/chemicals';
import { saveChemical as saveInventoryChemical, getChemicals as getInventoryChemicals } from './inventory-data';

export interface StepChemicalMapping {
    id: string;
    step_id: string;
    chemical_id: string;
    dilution_override?: string;
    tool_override?: string;
    application_override?: string;
    warnings_override?: string;
    include_in_prep: boolean;
    updated_by?: string;
    updated_at: string;
    // Joined
    chemical?: Chemical;
}

export async function getStepChemicalMappings(stepId?: string | string[]): Promise<StepChemicalMapping[]> {
    let query = supabase.from('step_chemical_mappings').select('*, chemical:chemical_library(*)');
    if (stepId) {
        if (Array.isArray(stepId)) {
            query = query.in('step_id', stepId);
        } else {
            query = query.eq('step_id', stepId);
        }
    }
    const { data, error } = await query;
    if (error) {
        console.error('Error fetching step chemical mappings:', error);
        return [];
    }
    return (data || []).map((m: any) => ({
        ...m,
        chemical: m.chemical
    }));
}

export async function upsertStepChemicalMapping(mapping: Partial<StepChemicalMapping>) {
    const payload = { ...mapping };
    // Remove joined fields if present
    delete (payload as any).chemical;
    delete (payload as any).created_at;

    // Ensure ID is removed if empty so it auto-generates or handles upsert correctly
    if (!payload.id) delete payload.id;

    const { data, error } = await supabase
        .from('step_chemical_mappings')
        .upsert(payload as any)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteStepChemicalMapping(id: string) {
    const { error } = await supabase.from('step_chemical_mappings').delete().eq('id', id);
    if (error) throw error;
}


export async function getChemicals(): Promise<Chemical[]> {
    try {
        const { data, error } = await supabase
            .from('chemical_library')
            .select('*')
            .order('name');

        if (error) {
            console.error('getChemicals error:', error);
            return [];
        }
        return data || [];
    } catch (e) {
        console.error('getChemicals exception:', e);
        return [];
    }
}

/**
 * Fetches all products from the Library AND Inventory to ensure the user
 * sees everything they expect to be able to make labels for.
 */
export async function getCombinedSelectableProducts(): Promise<Chemical[]> {
    try {
        // 1. Get Library Chemicals (The professional database)
        const library = await getChemicals();
        
        // 2. Get Inventory Chemicals (The user's actual stock)
        const { data: inventoryData, error } = await supabase
            .from('chemicals')
            .select('*')
            .order('name');
        
        if (error) {
            console.error('Error fetching inventory for combination:', error);
            return library;
        }

        if (!inventoryData || inventoryData.length === 0) {
            return library;
        }

        // 3. Inventory-Centric Merge: 
        // We want to show EVERY item in the user's inventory.
        const result: Chemical[] = inventoryData.map(inv => {
            // Find a professional library card for this inventory item
            const libMatch = library.find(lib => 
                lib.id === inv.chemical_library_id ||
                (lib.name.toLowerCase().trim() === inv.name.toLowerCase().trim() &&
                 (lib.brand || '').toLowerCase().trim() === (inv.brand || '').toLowerCase().trim())
            );

            if (libMatch) {
                // Return the library card data but preserve the inventory's specific ID and image
                return {
                    ...libMatch,
                    id: inv.id, // Use inventory ID so it maps correctly to their specific stock
                    chemical_library_id: libMatch.id, // Preserve library ID for backward compatibility in tips
                    primary_image_url: inv.image_url || inv.imageUrl || libMatch.primary_image_url,
                    is_inventory_only: false
                };
            }

            // If no library match, return a pseudo-chemical for this inventory item
            return {
                id: inv.id,
                name: inv.name,
                brand: inv.brand || '',
                category: 'Exterior',
                description: `Inventory Item`,
                used_for: [],
                dilution_ratios: [],
                primary_image_url: inv.image_url || inv.imageUrl,
                gallery_image_urls: [],
                is_inventory_only: true
            } as any;
        });

        // 4. (Optional) Add Library items that the user DOES NOT have in inventory yet
        // This allows them to see what else they could use/add.
        library.forEach(lib => {
            const alreadyIncluded = inventoryData.some(inv => 
                inv.chemical_library_id === lib.id ||
                (inv.name.toLowerCase().trim() === lib.name.toLowerCase().trim() &&
                 (inv.brand || '').toLowerCase().trim() === (lib.brand || '').toLowerCase().trim())
            );
            
            if (!alreadyIncluded) {
                result.push({
                    ...lib,
                    is_inventory_only: false,
                    not_in_stock: true // Tag it so we can show it differently if needed
                } as any);
            }
        });
        
        return result;
    } catch (e) {
        console.error('getCombinedSelectableProducts exception:', e);
        return await getChemicals();
    }
}

export async function getChemicalById(id: string): Promise<Chemical | null> {
    try {
        const { data, error } = await supabase
            .from('chemical_library')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data as Chemical;
    } catch (e) {
        return null;
    }
}

export async function upsertChemical(chemical: Partial<Chemical>): Promise<{ error: any; data: Chemical | null }> {
    if (isDemoActive()) return { error: { message: "Simulation active" }, data: null };
    try {
        const isNew = !chemical.id;
        
        // Ensure arrays are initialized if missing, standard cleanup
        const payload = {
            ...chemical,
            updated_at: new Date().toISOString(),
        };

        // UI-ONLY FIELDS CLEANUP: Remove fields that are not in the database schema
        delete (payload as any).is_inventory_only;
        delete (payload as any).is_linked; // Just in case
        delete (payload as any).search_score;

        // If new, add created_at
        if (isNew) {
            (payload as any).created_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('chemical_library')
            .upsert(payload)
            .select()
            .single();

        if (!error && data) {
            // SYNC TO INVENTORY: check if it already exists there first to avoid duplicates
            if (isNew) {
                try {
                    const inventoryItems = await getInventoryChemicals();
                    // 1. Check for name + brand match
                    const existingInv = inventoryItems.find(inv => 
                        inv.name.toLowerCase().trim() === data.name.toLowerCase().trim() && 
                        (inv.brand || '').toLowerCase().trim() === (data.brand || '').toLowerCase().trim()
                    );
                    
                    if (existingInv) {
                        // UPDATE EXISTING: link it instead of creating a new one
                        await saveInventoryChemical({
                            ...existingInv,
                            chemicalLibraryId: data.id,
                            dilutionRatios: data.dilution_ratios || []
                        }, false, true); // skipLibrarySync
                    } else {
                        // CREATE NEW: only if it doesn't exist
                        await saveInventoryChemical({
                            name: data.name,
                            brand: data.brand,
                            bottleSize: '16 oz', 
                            costPerBottle: 0,
                            threshold: 1,
                            currentStock: 1,
                            imageUrl: data.primary_image_url,
                            chemicalLibraryId: data.id,
                            dilutionRatios: data.dilution_ratios || []
                        }, true, true); // isNew=true, skipLibrarySync=true
                    }
                } catch (invErr) {
                    console.error('Failed to auto-create inventory item:', invErr);
                    // Don't fail the whole operation if inventory sync fails, but log it
                }
            } else {
                // If existing, update the chemicalLibraryId mapping in inventory if it's missing
                // This handles the "pseudo-chemical -> library card" conversion
                // ALSO: Sync dilution ratios to ANY linked inventory items
                try {
                    const inventoryItems = await getInventoryChemicals();
                    // 1. Find items that match but aren't linked yet
                    const matching = inventoryItems.filter(inv => 
                        (!inv.chemicalLibraryId && 
                        inv.name.toLowerCase() === data.name.toLowerCase() && 
                        (inv.brand || '').toLowerCase() === (data.brand || '').toLowerCase()) ||
                        inv.chemicalLibraryId === data.id
                    );
                    
                    for (const item of matching) {
                        await saveInventoryChemical({
                            ...item,
                            chemicalLibraryId: data.id,
                            imageUrl: item.imageUrl || data.primary_image_url,
                            dilutionRatios: data.dilution_ratios || []
                        }, false, true); // skipLibrarySync
                    }
                } catch (syncErr) {
                    console.error('Failed to sync existing inventory items:', syncErr);
                }
            }
        }

        return { error, data };
    } catch (e) {
        return { error: e, data: null };
    }
}

export async function updateChemicalPartial(id: string, updates: Partial<Chemical>, skipInventorySync: boolean = false): Promise<{ error: any; data: Chemical | null }> {
    if (isDemoActive()) return { error: { message: "Simulation active" }, data: null };
    try {
        const payload = {
            ...updates,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('chemical_library')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (!error && data && !skipInventorySync) {
            try {
                const inventoryItems = await getInventoryChemicals();
                const matching = inventoryItems.filter(inv => inv.chemicalLibraryId === id);
                
                for (const item of matching) {
                    const updatesToInventory: any = { ...item };
                    let changed = false;

                    if (updates.dilution_ratios) {
                        updatesToInventory.dilutionRatios = data.dilution_ratios || [];
                        changed = true;
                    }
                    if (updates.primary_image_url) {
                        updatesToInventory.imageUrl = updates.primary_image_url;
                        changed = true;
                    }

                    if (changed) {
                        await saveInventoryChemical(updatesToInventory, false, true); // skipLibrarySync
                    }
                }
            } catch (syncErr) {
                console.error('Failed to sync inventory on partial update:', syncErr);
            }
        }

        return { error, data };
    } catch (e) {
        return { error: e, data: null };
    }
}

export async function deleteChemical(id: string): Promise<boolean> {
    if (isDemoActive()) return false;
    try {
        const items = await getInventoryChemicals();
        const matching = items.filter(inv => inv.chemicalLibraryId === id);
        for (const item of matching) {
            await saveInventoryChemical({
                ...item,
                chemicalLibraryId: undefined
            }, false, true); // skipLibrarySync
        }
    } catch (e) {
        console.warn("Failed to unlink inventory items during deletion", e);
    }

    const { error } = await supabase.from('chemical_library').delete().eq('id', id);
    return !error;
}

// Helper to store Inventory Defaults in user_notes if columns are missing
export interface InventoryConfig {
    cost?: number;
    size?: string;
}

export function extractInventoryConfig(chemical: Chemical): InventoryConfig {
    // 1. Prefer explicit columns
    if (chemical.default_cost !== undefined || chemical.default_size !== undefined) {
        return { cost: chemical.default_cost, size: chemical.default_size };
    }
    // 2. Fallback to notes storage
    if (!chemical.user_notes) return {};
    const match = chemical.user_notes.match(/\|\|INV_CONFIG::(.*)\|\|/);
    if (match && match[1]) {
        try { return JSON.parse(match[1]); } catch (e) { return {}; }
    }
    return {};
}

export async function updateInventoryConfig(id: string, config: InventoryConfig, currentNotes?: string) {
    const configStr = `||INV_CONFIG::${JSON.stringify(config)}||`;
    let newNotes = currentNotes || "";
    // Remove old config if exists
    newNotes = newNotes.replace(/\|\|INV_CONFIG::.*\|\|/, '').trim();
    // Append new config
    newNotes = `${newNotes} ${configStr}`.trim();

    // Try sending columns too just in case they exist, plus the notes fallback
    return updateChemicalPartial(id, {
        user_notes: newNotes,
        default_cost: config.cost,
        default_size: config.size
    } as any); // Cast to any to allow default_cost/size if types are strict but DB is loose
}
