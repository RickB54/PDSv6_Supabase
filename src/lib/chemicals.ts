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

        const isMatch = (invName: string, libName: string) => {
            const clean = (s: string) => s.replace(/[^a-z0-9]/g, '');
            const iName = clean(invName);
            const lName = clean(libName);
            
            // Explicit hardcoded mappings to bulletproof the remaining edge cases
            if (iName.includes('apc') && lName.includes('apc')) return true;
            if (iName.includes('platinumrapid') && lName.includes('ceramiccoatingcerakote')) return true;
            if (iName.includes('blackwax') && lName.includes('blackwax')) return true;
            if (iName.includes('darkfury') && lName.includes('darkfury')) return true;
            if (iName.includes('ezshine') && lName.includes('ezshine')) return true;
            if (iName.includes('musclemagic') && lName.includes('musclemagic')) return true;
            if (iName.includes('totalinterior') && lName.includes('totalinterior')) return true;
            if (iName.includes('zapit') && lName.includes('zapit')) return true;
            if (iName.includes('armorallwheel') && lName.includes('armorallwheel')) return true;

            if (iName === lName) return true;
            if (iName.length > 3 && lName.includes(iName)) return true;
            if (lName.length > 3 && iName.includes(lName)) return true;
            
            return false;
        };

        // 3. Inventory-Centric Merge: 
        // We want to show EVERY item in the user's inventory.
        const result: Chemical[] = inventoryData.map(inv => {
            const invName = inv.name.toLowerCase().trim();
            const invBrand = (inv.brand || '').toLowerCase().trim();

            // Find a professional library card for this inventory item
            const libMatch = library.find(lib => {
                if (lib.id === inv.chemical_library_id) return true;
                
                const libName = lib.name.toLowerCase().trim();
                return isMatch(invName, libName);
            });

            if (libMatch) {
                const effectiveImg = libMatch.primary_image_url || inv.image_url || inv.imageUrl;
                // Auto-sync image to chemical_library if library card is missing it
                if (!libMatch.primary_image_url && effectiveImg) {
                    libMatch.primary_image_url = effectiveImg;
                    updateChemicalPartial(libMatch.id, { primary_image_url: effectiveImg }, true).catch(err => console.warn('Image auto-sync error:', err));
                }

                return {
                    ...libMatch,
                    id: inv.id, // Use inventory ID so it maps correctly to their specific stock
                    name: inv.name || libMatch.name, // Use inventory name to respect user's naming
                    brand: inv.brand || libMatch.brand,
                    chemical_library_id: libMatch.id, // Preserve library ID for backward compatibility in tips
                    primary_image_url: effectiveImg,
                    is_inventory_only: false,
                    updated_at: inv.updated_at || libMatch.updated_at || inv.created_at || libMatch.created_at
                };
            }

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
                is_inventory_only: true,
                updated_at: inv.updated_at || inv.created_at
            } as any;
        });

        library.forEach(lib => {
            const libName = lib.name.toLowerCase().trim();
            const libBrand = (lib.brand || '').toLowerCase().trim();
            
            const alreadyIncluded = inventoryData.some(inv => {
                if (inv.chemical_library_id === lib.id) return true;
                const invName = inv.name.toLowerCase().trim();
                return isMatch(invName, libName);
            });
            
            if (!alreadyIncluded) {
                // If library item is missing primary_image_url, check if any inventory item had an image
                if (!lib.primary_image_url) {
                    const invImgMatch = inventoryData.find(inv => (inv.image_url || inv.imageUrl) && isMatch(inv.name.toLowerCase().trim(), libName));
                    if (invImgMatch) {
                        lib.primary_image_url = invImgMatch.image_url || invImgMatch.imageUrl;
                        updateChemicalPartial(lib.id, { primary_image_url: lib.primary_image_url }, true).catch(() => {});
                    }
                }

                result.push({
                    ...lib,
                    is_inventory_only: false,
                    not_in_stock: true, // Tag it so we can show it differently if needed
                    updated_at: lib.updated_at || (lib as any).created_at
                } as any);
            }
        });
        
        // 5. Deduplicate based on name and brand to combine different sizes (e.g. 16oz and 1 Gallon)
        const uniqueResult: Chemical[] = [];
        const seenNames = new Set<string>();
        
        result.forEach(chem => {
            const key = `${(chem.name || '').trim().toLowerCase()}_${(chem.brand || '').trim().toLowerCase()}`;
            if (!seenNames.has(key)) {
                seenNames.add(key);
                uniqueResult.push(chem);
            } else {
                // Keep the most recent timestamp among duplicates
                const existing = uniqueResult.find(c => `${(c.name || '').trim().toLowerCase()}_${(c.brand || '').trim().toLowerCase()}` === key);
                if (existing) {
                    const existingTime = new Date((existing as any).updated_at || 0).getTime();
                    const newTime = new Date((chem as any).updated_at || 0).getTime();
                    if (newTime > existingTime) {
                        (existing as any).updated_at = (chem as any).updated_at;
                    }
                    if (!existing.primary_image_url && chem.primary_image_url) {
                        existing.primary_image_url = chem.primary_image_url;
                    }
                }
            }
        });
        
        return uniqueResult;
    } catch (e) {
        console.error('getCombinedSelectableProducts exception:', e);
        return await getChemicals();
    }
}

/**
 * Checks if a chemical container size or container type represents a Gallon container.
 * Low stock alerts apply strictly to Gallon containers.
 */
export function isGallonSize(sizeStr?: string, containerType?: string): boolean {
    const s = (sizeStr || '').toLowerCase().trim();
    const ct = (containerType || '').toLowerCase().trim();
    return s.includes('gal') || s.includes('128') || s.includes('jug') || ct.includes('gal') || ct.includes('jug');
}

/**
 * Aggregate Low Stock Threshold Logic:
 * 1. ONLY Gallon sized containers trigger low stock alerts. Spray bottles/32oz do NOT trigger low stock alerts.
 * 2. Sums remaining stock across ALL gallon containers in inventory for the same product (by chemicalLibraryId or name + brand).
 * 3. Alert triggers ONLY when total aggregate gallon stock <= 0.25 (25% of 1 gallon remaining).
 */
export function isChemicalLowStock(chem: { bottleSize?: string; containerType?: string; currentStock?: number; current_stock?: number; chemicalLibraryId?: string | null; chemical_library_id?: string | null; name?: string; brand?: string }, allChemicals: any[]): boolean {
    if (!chem || !isGallonSize(chem.bottleSize, chem.containerType)) {
        return false; // Spray bottles, 32oz, 16oz, etc. do NOT trigger low stock pings
    }

    const chemName = (chem.name || '').trim().toLowerCase();
    const chemBrand = (chem.brand || '').trim().toLowerCase();
    const libId = chem.chemicalLibraryId || chem.chemical_library_id;

    // Filter all gallon items for the same product in inventory
    const matchingGallons = (allChemicals || []).filter(c => {
        if (!c || !isGallonSize(c.bottleSize, c.containerType)) return false;
        if (libId && (c.chemicalLibraryId || c.chemical_library_id)) {
            return (c.chemicalLibraryId || c.chemical_library_id) === libId;
        }
        const cName = (c.name || '').trim().toLowerCase();
        const cBrand = (c.brand || '').trim().toLowerCase();
        return cName === chemName && cBrand === chemBrand;
    });

    const totalGallonStock = matchingGallons.reduce((sum, c) => sum + (Number(c.currentStock ?? c.current_stock) || 0), 0);

    return totalGallonStock <= 0.25;
}

/**
 * Helper to check low stock status for a grouped array of chemical items.
 */
export function isChemicalGroupLowStock(group: any[], allChemicals: any[]): boolean {
    if (!group || group.length === 0) return false;
    const gallonItems = group.filter(x => isGallonSize(x.bottleSize, x.containerType));
    if (gallonItems.length === 0) return false; // No gallons = no low stock alert

    return isChemicalLowStock(gallonItems[0], allChemicals);
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

export async function deleteChemical(idOrChem: string | Chemical, libraryId?: string): Promise<boolean> {
    if (isDemoActive()) return false;
    try {
        const chemObj = typeof idOrChem === 'object' ? idOrChem : null;
        const chemId = typeof idOrChem === 'string' ? idOrChem : idOrChem.id;
        const libId = libraryId || (chemObj ? (chemObj.chemical_library_id || (chemObj as any).chemicalLibraryId || chemObj.id) : chemId);
        const chemName = chemObj ? chemObj.name : undefined;
        const chemBrand = chemObj ? chemObj.brand : undefined;

        // 1. Delete from chemical_library by ID / libId
        if (libId) {
            await supabase.from('chemical_library').delete().eq('id', libId);
        }
        if (chemId && chemId !== libId) {
            await supabase.from('chemical_library').delete().eq('id', chemId);
        }

        // 2. Delete from chemical_library by Name & Brand matching if available
        if (chemName) {
            const cleanName = chemName.trim().toLowerCase();
            const cleanBrand = (chemBrand || '').trim().toLowerCase();
            const { data: libRows } = await supabase.from('chemical_library').select('id, name, brand');
            if (libRows) {
                const matchingLibIds = libRows
                    .filter(l => (l.name || '').trim().toLowerCase() === cleanName && (l.brand || '').trim().toLowerCase() === cleanBrand)
                    .map(l => l.id);
                if (matchingLibIds.length > 0) {
                    await supabase.from('chemical_library').delete().in('id', matchingLibIds);
                }
            }
        }

        // 3. Delete matching physical inventory rows from chemicals table
        if (libId) {
            await supabase.from('chemicals').delete().eq('chemical_library_id', libId);
        }
        if (chemId) {
            await supabase.from('chemicals').delete().eq('id', chemId);
        }
        if (chemName) {
            const cleanName = chemName.trim().toLowerCase();
            const cleanBrand = (chemBrand || '').trim().toLowerCase();
            const { data: invRows } = await supabase.from('chemicals').select('id, name, brand');
            if (invRows) {
                const matchingInvIds = invRows
                    .filter(c => (c.name || '').trim().toLowerCase() === cleanName && (c.brand || '').trim().toLowerCase() === cleanBrand)
                    .map(c => c.id);
                if (matchingInvIds.length > 0) {
                    await supabase.from('chemicals').delete().in('id', matchingInvIds);
                }
            }
        }

        return true;
    } catch (e) {
        console.error("Failed to delete chemical:", e);
        return false;
    }
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
