import { supabase } from './supabase';
const isDemoActive = () => localStorage.getItem("demo_mode_active") === "true";
import { upsertExpense } from './db';
import { compressImageForUpload } from './image-compression';

export async function uploadInventoryImage(file: File): Promise<string | null> {
    if (isDemoActive()) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    const compressed = await compressImageForUpload(file);
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const filePath = `${session.user.id}/${fileName}`;

    const { data, error } = await supabase.storage
        .from('blog-media')
        .upload(filePath, compressed);

    if (error) {
        console.error('Upload error:', error);
        return null;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('blog-media')
        .getPublicUrl(filePath);

    return publicUrl;
}

export async function uploadSetupMedia(file: File): Promise<string | null> {
    if (isDemoActive()) return null;
    
    const isPdf = file.type === 'application/pdf';
    const type = isPdf ? 'pdf' : file.type.startsWith('video') ? 'video' : 'image';
    const ext = isPdf ? 'pdf' : type === 'video' ? 'mp4' : 'jpg';
    const filePath = `setup/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    console.log(`[UploadSetupMedia] Using uploadFile to customer-photos: ${filePath} (${type})`);

    try {
        const { uploadFile } = await import('./storage-utils');
        const publicUrl = await uploadFile('customer-photos', file, filePath);
        console.log(`[UploadSetupMedia] Success! Public URL: ${publicUrl}`);
        return publicUrl;
    } catch (error: any) {
        console.error('Setup media upload error:', error);
        throw new Error(`Upload failed: ${error.message || 'Check storage permissions'}`);
    }
}

import { DilutionRatio } from '@/types/chemicals';

export interface Chemical {
    id: string;
    name: string;
    brand?: string; 
    bottleSize: string;
    costPerBottle: number;
    threshold: number;
    currentStock: number;
    imageUrl?: string;
    chemicalLibraryId?: string;
    createdAt?: string;
    updatedAt?: string;
    dilutionRatios?: DilutionRatio[];
    wherePurchased?: string;
    purchaseDate?: string;
    actualPrice?: number;
    salePrice?: number;
    notes?: string;
    isConcentrate?: boolean;
}

export interface Material {
    id: string;
    name: string;
    category: string;
    subtype?: string;
    quantity: number;
    costPerItem?: number;
    notes?: string;
    lowThreshold?: number;
    createdAt: string;
    updatedAt?: string;
    imageUrl?: string;
    wherePurchased?: string;
    purchaseDate?: string;
    actualPrice?: number;
    salePrice?: number;
}

export interface Tool {
    id: string;
    name: string;
    category?: string; // ADDED: For custom categories
    purchaseDate: string;
    warranty: string;
    lifeExpectancy: string;
    notes: string;
    price: number;
    quantity?: number;
    lowThreshold?: number;
    imageUrl?: string;
    createdAt?: string;
    updatedAt?: string;
    wherePurchased?: string;
    actualPrice?: number;
    salePrice?: number;
}

export interface SetupMedia {
    id: string;
    type: 'image' | 'video' | 'pdf';
    url: string;
    caption?: string;
    category?: string; // category id
    createdAt?: string;
}

export interface SetupCategory {
    id: string;
    name: string;
    order: number;
}

export interface UsageHistory {
    id: string;
    chemicalId?: string;
    chemicalName?: string;
    materialId?: string;
    materialName?: string;
    toolId?: string;
    toolName?: string;
    serviceName: string;
    date: string;
    remainingStock?: number;
    amountUsed?: string | number;
    notes?: string;
}

// ============================================
// CHEMICALS
// ============================================

export async function getChemicals(): Promise<Chemical[]> {
    const { data, error } = await supabase
        .from('chemicals')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error loading chemicals:', error);
        return [];
    }

    // Map database fields to component format
    return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        brand: item.brand, // NEW: Map brand
        bottleSize: item.bottle_size || '',
        costPerBottle: item.cost_per_bottle || 0,
        threshold: item.threshold || 0,
        currentStock: item.current_stock || 0,
        imageUrl: item.image_url,
        chemicalLibraryId: item.chemical_library_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        dilutionRatios: item.dilution_ratios || [],
        wherePurchased: item.where_purchased,
        purchaseDate: item.purchase_date,
        actualPrice: item.actual_price,
        salePrice: item.sale_price,
        notes: item.notes,
        isConcentrate: item.is_concentrate ?? true
    }));
}

export async function saveChemical(chemical: Partial<Chemical>, isNew: boolean = false, skipLibrarySync: boolean = false): Promise<void> {
    if (isDemoActive()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    const dbData: any = {
        id: chemical.id || crypto.randomUUID(), // Always assign an ID so multiple new rows don't collide
        user_id: session.user.id,
        name: chemical.name,
        brand: chemical.brand || null,
        bottle_size: chemical.bottleSize,
        cost_per_bottle: chemical.costPerBottle,
        threshold: chemical.threshold,
        current_stock: chemical.currentStock,
        image_url: chemical.imageUrl,
        chemical_library_id: chemical.chemicalLibraryId,
        dilution_ratios: chemical.dilutionRatios || [],
        where_purchased: chemical.wherePurchased || null,
        purchase_date: chemical.purchaseDate || null,
        actual_price: chemical.actualPrice || null,
        sale_price: chemical.salePrice || null,
        notes: chemical.notes || null,
        is_concentrate: chemical.isConcentrate ?? true,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('chemicals')
        .upsert(dbData);
    
    if (error) {
        const msg = (error.message || '').toLowerCase();
        const isColumnError = error.code === '42703' || msg.includes('column') || msg.includes('schema') || msg.includes('where_purchased') || msg.includes('brand');
        
        if (isColumnError) {
            console.warn('Handling schema mismatch in chemicals table, retrying with sanitized payload...', error.message);
        
            let sanitized = { ...dbData };
            let currentErr = error;
            let retries = 0;
            while (currentErr && ((currentErr.code === '42703') || (currentErr.message || '').toLowerCase().includes('column')) && retries < 5) {
                const errMsg = (currentErr.message || '').toLowerCase();
                let dropped = false;
                if (errMsg.includes('where_purchased') && 'where_purchased' in sanitized) { delete sanitized.where_purchased; dropped = true; }
                else if (errMsg.includes('brand') && 'brand' in sanitized) { delete sanitized.brand; dropped = true; }
                else if (errMsg.includes('purchase_date') && 'purchase_date' in sanitized) { delete sanitized.purchase_date; dropped = true; }
                else if (errMsg.includes('actual_price') && 'actual_price' in sanitized) { delete sanitized.actual_price; dropped = true; }
                else if (errMsg.includes('sale_price') && 'sale_price' in sanitized) { delete sanitized.sale_price; dropped = true; }
                else if (errMsg.includes('is_concentrate') && 'is_concentrate' in sanitized) { delete sanitized.is_concentrate; dropped = true; }
                
                if (!dropped) {
                    delete sanitized.where_purchased;
                    delete sanitized.brand;
                    delete sanitized.purchase_date;
                    delete sanitized.actual_price;
                    delete sanitized.sale_price;
                    delete sanitized.is_concentrate;
                }
                const { error: retryErr } = await supabase.from('chemicals').upsert(sanitized);
                currentErr = retryErr;
                retries++;
            }
            if (currentErr) throw currentErr;
            
            // Return correctly mapped object to keep UI consistent
            return {
                id: dbData.id,
                name: dbData.name,
                brand: dbData.brand,
                category: dbData.category,
                formula: dbData.formula,
                bottleSize: dbData.bottle_size,
                currentStock: dbData.current_stock,
                threshold: dbData.threshold,
                costPerBottle: dbData.cost_per_bottle,
                wherePurchased: dbData.where_purchased,
                purchaseDate: dbData.purchase_date,
                actualPrice: dbData.actual_price,
                salePrice: dbData.sale_price,
                notes: dbData.notes,
                imageUrl: dbData.image_url,
                updatedAt: dbData.updated_at,
                isConcentrate: dbData.is_concentrate
            } as any;
        } else {
            throw error;
        }
    }

    // 2. UNIVERSAL SYNC: Update Chemical Library if linked
    if (!skipLibrarySync && chemical.chemicalLibraryId && (chemical.dilutionRatios || chemical.imageUrl)) {
        try {
            const { updateChemicalPartial } = await import('./chemicals');
            await updateChemicalPartial(chemical.chemicalLibraryId, {
                dilution_ratios: chemical.dilutionRatios,
                brand: chemical.brand,
                primary_image_url: chemical.imageUrl
            }, true); // Important: skipInventorySync
        } catch (syncErr) {
            console.error("Failed to sync inventory update back to library:", syncErr);
        }
    }

}

export async function deleteChemical(id: string): Promise<void> {
    if (isDemoActive()) return;
    const { error } = await supabase
        .from('chemicals')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function cleanupInventoryDuplicates(): Promise<{ deleted: number; linked: number }> {
    if (isDemoActive()) return { deleted: 0, linked: 0 };
    const { data: inventory, error: invErr } = await supabase.from('chemicals').select('*');
    const { data: library, error: libErr } = await supabase.from('chemical_library').select('*');
    
    if (invErr || libErr) throw invErr || libErr;

    const toDelete: string[] = [];
    const toUpdate: any[] = [];
    let deletedCount = 0;
    let linkedCount = 0;

    // --- Levenshtein helper for fuzzy name matching ---
    const levenshtein = (a: string, b: string): number => {
        const m = a.length, n = b.length;
        const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
            Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
        );
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                dp[i][j] = a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
        return dp[m][n];
    };

    // --- Group inventory items: exact match first, then fuzzy near-match ---
    const groups: Record<string, any[]> = {};
    const groupKeys: string[] = []; // ordered list of canonical keys

    (inventory || []).forEach(inv => {
        const normName = inv.name.toLowerCase().trim();
        const normBrand = (inv.brand || '').toLowerCase().trim();

        // Try to find an existing group whose key is within 2 edits on the name part,
        // AND matches the brand exactly (or both are blank).
        const FUZZY_THRESHOLD = 2;
        let matchedKey: string | null = null;

        for (const existingKey of groupKeys) {
            const [eName, eBrand] = existingKey.split('||');
            // Brand must match exactly (both empty, or same brand)
            if (eBrand !== normBrand) continue;
            const dist = levenshtein(normName, eName);
            if (dist <= FUZZY_THRESHOLD) {
                matchedKey = existingKey;
                break;
            }
        }

        if (!matchedKey) {
            matchedKey = `${normName}||${normBrand}`;
            groupKeys.push(matchedKey);
            groups[matchedKey] = [];
        }

        groups[matchedKey].push(inv);
    });

    for (const key in groups) {
        const items = groups[key];
        let master = items[0];

        if (items.length > 1) {
            // Find best candidate to keep (Data Richness first)
            master = [...items].sort((a,b) => {
                const getScore = (item: any) => {
                    let s = 0;
                    s += (item.dilution_ratios?.length || 0) * 1000; // Power-up for ratios
                    if (item.chemical_library_id) s += 100;
                    if (item.current_stock > 0) s += 10;
                    return s;
                };
                return getScore(b) - getScore(a);
            })[0];

            // Mark others for deletion
            items.forEach(item => {
                if (item.id !== master.id) toDelete.push(item.id);
            });
        }

        // FULL AUTO-LINK (Check master against library card)
        if (!master.chemical_library_id) {
            const [name, brand] = key.split('||');
            const match = (library || []).find(l => {
                const libName = l.name.toLowerCase().trim();
                const libBrand = (l.brand || '').toLowerCase().trim();
                
                // 1. Perfect Match
                if (libName === name && libBrand === brand) return true;
                
                // 2. Hyper-Fuzzy Match (Strip brands, symbols, and whitespace)
                // This handles cases like "Brand / Product" vs "Product"
                // We use word-boundary matching for the brand to avoid stripping parts of other words
                const regBrand = new RegExp(`\\b${brand.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
                const regLibBrand = new RegExp(`\\b${libBrand.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
                
                const sInv = name.toLowerCase().replace(regBrand, '').replace(/[^a-z0-9]/g, '').trim();
                const sLib = libName.toLowerCase().replace(regLibBrand, '').replace(/[^a-z0-9]/g, '').trim();
                
                // Match if core names are identical or one contains the other (e.g. "Clay Bar" vs "Clay Bar Kit")
                if (sInv.length > 2 && sLib.length > 2 && (sInv === sLib || sInv.includes(sLib) || sLib.includes(sInv))) return true;
                
                // 3. Fallback: Full string comparison after brand and symbol stripping
                const fInv = (name + brand).toLowerCase().replace(/[^a-z0-9]/g, '');
                const fLib = (libName + libBrand).toLowerCase().replace(/[^a-z0-9]/g, '');
                if (fInv === fLib) return true;

                return false;
            });

            if (match) {
                toUpdate.push({ 
                    id: master.id, 
                    chemical_library_id: match.id, 
                    // Update ratios ONLY if inventory was empty to avoid overwriting overrides
                    dilution_ratios: (master.dilution_ratios?.length > 0) ? master.dilution_ratios : (match.dilution_ratios || [])
                });
                linkedCount++;
            }
        }
    }

    // Process updates first (linking)
    if (toUpdate.length > 0) {
        for (const up of toUpdate) {
            await supabase.from('chemicals').update(up).eq('id', up.id);
        }
    }

    // Process deletions
    if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from('chemicals').delete().in('id', toDelete);
        if (delErr) console.error("Deduplication delete error:", delErr);
        else deletedCount = toDelete.length;
    }

    return { deleted: deletedCount, linked: linkedCount };
}

// ============================================
// MATERIALS
// ============================================

export async function getMaterials(): Promise<Material[]> {
    if (isDemoActive()) {
        const { MOCK_INVENTORY } = await import('./demoMockData');
        return (MOCK_INVENTORY as any).materials || [];
    }

    console.log('[InventoryData] getMaterials: Fetching from Supabase...');
    const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name');

    if (error) {
        console.error('[InventoryData] getMaterials: Supabase Error!', error);
        return [];
    }

    console.log(`[InventoryData] getMaterials: Successfully loaded ${data?.length || 0} materials`);

    return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category || '',
        subtype: item.subtype,
        quantity: item.quantity || 0,
        costPerItem: item.cost_per_item,
        notes: item.notes,
        lowThreshold: item.low_threshold,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        imageUrl: item.image_url,
        wherePurchased: (item.where_purchased && item.where_purchased.trim() !== "") ? item.where_purchased : "Amazon",
        purchaseDate: item.purchase_date,
        actualPrice: item.actual_price,
        salePrice: item.sale_price
    }));
}

export async function saveMaterial(material: Partial<Material>, isNew: boolean = false): Promise<Material | undefined> {
    if (isDemoActive()) {
        console.warn('[InventoryData] saveMaterial: BLOCKED - Training Session');
        return;
    }
    
    console.log(`[InventoryData] saveMaterial: Preparing to save ${isNew ? 'NEW' : 'EXISTING'} material:`, material);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
        console.error('[InventoryData] saveMaterial: No active session found!');
        throw new Error('Not authenticated');
    }

    const dbData: any = {
        id: material.id || crypto.randomUUID(), 
        user_id: session.user.id,
        name: material.name,
        category: material.category,
        subtype: material.subtype,
        quantity: material.quantity,
        cost_per_item: material.costPerItem,
        notes: material.notes,
        low_threshold: material.lowThreshold,
        image_url: material.imageUrl,
        where_purchased: material.wherePurchased || null,
        purchase_date: material.purchaseDate || null,
        actual_price: material.actualPrice || null,
        sale_price: material.salePrice || null,
        updated_at: new Date().toISOString()
    };

    console.log('[InventoryData] saveMaterial: Updating database...', dbData);

    const { data: upsertData, error } = await supabase
        .from('materials')
        .upsert(dbData);

    if (error) {
        const msg = (error.message || '').toLowerCase();
        const isColumnError = error.code === '42703' || msg.includes('column') || msg.includes('schema') || msg.includes('where_purchased');
        
        if (isColumnError) {
            console.warn('Handling schema mismatch in materials table, retrying with sanitized payload...', error.message);
        
            let sanitized = { ...dbData };
            let currentErr = error;
            let retries = 0;
            while (currentErr && ((currentErr.code === '42703') || (currentErr.message || '').toLowerCase().includes('column')) && retries < 5) {
                const errMsg = (currentErr.message || '').toLowerCase();
                let dropped = false;
                if (errMsg.includes('where_purchased') && 'where_purchased' in sanitized) { delete sanitized.where_purchased; dropped = true; }
                else if (errMsg.includes('purchase_date') && 'purchase_date' in sanitized) { delete sanitized.purchase_date; dropped = true; }
                else if (errMsg.includes('actual_price') && 'actual_price' in sanitized) { delete sanitized.actual_price; dropped = true; }
                else if (errMsg.includes('sale_price') && 'sale_price' in sanitized) { delete sanitized.sale_price; dropped = true; }
                
                if (!dropped) {
                    delete sanitized.where_purchased;
                    delete sanitized.purchase_date;
                    delete sanitized.actual_price;
                    delete sanitized.sale_price;
                }
                const { error: retryErr } = await supabase.from('materials').upsert(sanitized);
                currentErr = retryErr;
                retries++;
            }
            if (currentErr) throw currentErr;
            
            // Return mapped object
            return {
                id: dbData.id,
                name: dbData.name,
                category: dbData.category,
                quantity: dbData.quantity,
                costPerItem: dbData.cost_per_item,
                lowThreshold: dbData.low_threshold,
                wherePurchased: dbData.where_purchased,
                purchaseDate: dbData.purchase_date,
                actualPrice: dbData.actual_price,
                salePrice: dbData.sale_price,
                notes: dbData.notes,
                imageUrl: dbData.image_url,
                updatedAt: dbData.updated_at
            } as any;
        } else {
            console.error('[InventoryData] saveMaterial: Supabase Error!', error);
            throw error;
        }
    }
    
    // Normal success path - fetch again to ensure we have generated fields like updatedAt
    const { data: savedItem, error: fetchErr } = await supabase.from('materials').select('*').eq('id', dbData.id).single();
    if (fetchErr || !savedItem) return { ...material, updatedAt: new Date().toISOString() } as Material;

    return {
        id: savedItem.id,
        name: savedItem.name,
        category: savedItem.category,
        quantity: savedItem.quantity,
        costPerItem: savedItem.cost_per_item,
        lowThreshold: savedItem.low_threshold,
        wherePurchased: savedItem.where_purchased,
        purchaseDate: savedItem.purchase_date,
        actualPrice: savedItem.actual_price,
        salePrice: savedItem.sale_price,
        notes: savedItem.notes,
        imageUrl: savedItem.image_url,
        updatedAt: savedItem.updated_at
    } as Material;

    // Sync LocalForage Cache
    try {
        const list = (await import('localforage')).default;
        const current = (await list.getItem<Material[]>('materials')) || [];
        const next = [...current];
        const index = next.findIndex(m => m.id === (savedItem?.id || dbData.id));
        if (index >= 0) {
            next[index] = savedItem || (dbData as any);
        } else {
            next.push(savedItem || (dbData as any));
        }
        await list.setItem('materials', next);
        console.log('[InventoryData] Local cache synced for material:', dbData.id);
    } catch (cacheErr) {
        console.warn('[InventoryData] Local cache sync failed:', cacheErr);
    }

    return savedItem;
}

export async function deleteMaterial(id: string): Promise<void> {
    if (isDemoActive()) return;
    const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// TOOLS
// ============================================

export async function getTools(): Promise<Tool[]> {
    if (isDemoActive()) {
        const { MOCK_INVENTORY } = await import('./demoMockData');
        return (MOCK_INVENTORY as any).tools || (MOCK_INVENTORY as any).equipment || [];
    }

    const { data, error } = await supabase
        .from('tools')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error loading tools:', error);
        return [];
    }

    return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category || 'Other',
        warranty: item.warranty || '',
        purchaseDate: item.purchase_date || '',
        price: item.price || 0,
        quantity: item.quantity || 1,
        lowThreshold: item.low_threshold || 1,
        lifeExpectancy: item.life_expectancy || '',
        notes: item.notes || '',
        imageUrl: item.image_url,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        wherePurchased: (item.where_purchased && item.where_purchased.trim() !== "") ? item.where_purchased : "Amazon"
    }));
}

export async function saveTool(tool: Partial<Tool>, isNew: boolean = false): Promise<void> {
    if (isDemoActive()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    const dbData: any = {
        id: tool.id || crypto.randomUUID(), // Always assign an ID so multiple new rows don't collide
        user_id: session.user.id,
        name: tool.name,
        category: tool.category,
        warranty: tool.warranty,
        purchase_date: tool.purchaseDate && tool.purchaseDate.trim() ? tool.purchaseDate : null,
        price: tool.price,
        quantity: tool.quantity || 1,
        low_threshold: (tool as any).threshold || 1,
        life_expectancy: tool.lifeExpectancy,
        notes: tool.notes,
        image_url: tool.imageUrl,
        where_purchased: tool.wherePurchased || null,
        actual_price: tool.actualPrice || null,
        sale_price: tool.salePrice || null,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('tools')
        .upsert(dbData);

    if (error) {
        const msg = (error.message || '').toLowerCase();
        const isColumnError = error.code === '42703' || msg.includes('column') || msg.includes('schema') || msg.includes('where_purchased');
        
        if (isColumnError) {
            console.warn('Handling schema mismatch in tools table, retrying with sanitized payload...', error.message);
            let sanitizedData = { ...dbData };
            let currentErr = error;
            let retries = 0;
            while (currentErr && ((currentErr.code === '42703') || (currentErr.message || '').toLowerCase().includes('column')) && retries < 5) {
                const errMsg = (currentErr.message || '').toLowerCase();
                let dropped = false;
                if (errMsg.includes('quantity') && 'quantity' in sanitizedData) { delete sanitizedData.quantity; dropped = true; }
                else if (errMsg.includes('low_threshold') && 'low_threshold' in sanitizedData) { delete sanitizedData.low_threshold; dropped = true; }
                else if (errMsg.includes('category') && 'category' in sanitizedData) { delete sanitizedData.category; dropped = true; }
                else if (errMsg.includes('where_purchased') && 'where_purchased' in sanitizedData) { delete sanitizedData.where_purchased; dropped = true; }
                else if (errMsg.includes('purchase_date') && 'purchase_date' in sanitizedData) { delete sanitizedData.purchase_date; dropped = true; }
                else if (errMsg.includes('actual_price') && 'actual_price' in sanitizedData) { delete sanitizedData.actual_price; dropped = true; }
                else if (errMsg.includes('sale_price') && 'sale_price' in sanitizedData) { delete sanitizedData.sale_price; dropped = true; }
                
                if (!dropped) {
                    delete sanitizedData.quantity;
                    delete sanitizedData.low_threshold;
                    delete sanitizedData.category;
                    delete sanitizedData.where_purchased;
                    delete sanitizedData.purchase_date;
                    delete sanitizedData.actual_price;
                    delete sanitizedData.sale_price;
                }
                const { error: retryErr } = await supabase.from('tools').upsert(sanitizedData);
                currentErr = retryErr;
                retries++;
            }
            if (currentErr) throw currentErr;
            
            // Return mapped object
            return {
                id: dbData.id,
                name: dbData.name,
                category: dbData.category,
                quantity: dbData.quantity,
                price: dbData.price,
                purchaseDate: dbData.purchase_date,
                wherePurchased: dbData.where_purchased,
                actualPrice: dbData.actual_price,
                salePrice: dbData.sale_price,
                notes: dbData.notes,
                imageUrl: dbData.image_url,
                updatedAt: dbData.updated_at
            } as any;
        } else {
            throw error;
        }
    }

}

export async function deleteTool(id: string): Promise<void> {
    if (isDemoActive()) return;
    const { error } = await supabase
        .from('tools')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// USAGE HISTORY
// ============================================

export async function getUsageHistory(): Promise<UsageHistory[]> {
    const { data, error } = await supabase
        .from('usage_history')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error('Error loading usage history:', error);
        return [];
    }

    return (data || []).map(item => ({
        id: item.id,
        chemicalId: item.chemical_id,
        materialId: item.material_id,
        toolId: item.tool_id,
        serviceName: item.service_name || '',
        date: item.date,
        remainingStock: item.remaining_stock,
        amountUsed: item.amount_used,
        notes: item.notes,
        // We'll need to fetch names separately or join
        chemicalName: undefined, // TODO: Add join or separate query
        materialName: undefined,
        toolName: undefined
    }));
}

export async function saveUsageHistory(usage: Partial<UsageHistory>): Promise<void> {
    if (isDemoActive()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    const dbData = {
        id: usage.id,
        user_id: session.user.id,
        chemical_id: usage.chemicalId,
        material_id: usage.materialId,
        tool_id: usage.toolId,
        service_name: usage.serviceName,
        date: usage.date || new Date().toISOString(),
        remaining_stock: usage.remainingStock,
        amount_used: usage.amountUsed?.toString(),
        notes: usage.notes
    };

    const { error } = await supabase
        .from('usage_history')
        .upsert(dbData);

    if (error) throw error;
}

export async function deleteUsageHistory(id: string): Promise<void> {
    if (isDemoActive()) return;
    const { error } = await supabase
        .from('usage_history')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// MOBILE SETUP MEDIA
// ============================================

export const MOBILE_SETUP_KEY = "f150_command_center_media";
export const SHOP_SETUP_KEY = "shop_command_center_media";

const MOBILE_DEFAULT_CATEGORIES: SetupCategory[] = [
    { id: 'cat_reels', name: 'Reels & Pressure Hoses', order: 0 },
    { id: 'cat_water', name: 'Pressure Washer & Tank', order: 1 },
    { id: 'cat_power', name: 'Power Unit & Generator', order: 2 },
    { id: 'cat_shelving', name: 'Shelving & Storage', order: 3 },
    { id: 'cat_exterior', name: 'Exterior Gear', order: 4 },
    { id: 'cat_interior', name: 'Interior Gear', order: 5 },
    { id: 'cat_chemicals', name: 'Chemical Storage', order: 6 },
    { id: 'cat_lighting', name: 'Lighting & Polishers', order: 7 },
    { id: 'cat_misc', name: 'Miscellaneous Gear', order: 8 },
];

const SHOP_DEFAULT_CATEGORIES: SetupCategory[] = [
    { id: 'cat_wash_bay', name: 'Main Wash Bay', order: 0 },
    { id: 'cat_chemical_rack', name: 'Chemical Racking', order: 1 },
    { id: 'cat_machine_bench', name: 'Machine & Polisher Bench', order: 2 },
    { id: 'cat_pad_station', name: 'Pad & Towel Station', order: 3 },
    { id: 'cat_tool_board', name: 'Tool & Hardware Board', order: 4 },
    { id: 'cat_shipping', name: 'Shipping & Receiving', order: 5 },
    { id: 'cat_break_area', name: 'Employee Break Area', order: 6 },
    { id: 'cat_office', name: 'Shop Office', order: 7 },
];

function getDefaultCategories(key: string): SetupCategory[] {
    return key === SHOP_SETUP_KEY ? SHOP_DEFAULT_CATEGORIES : MOBILE_DEFAULT_CATEGORIES;
}

async function getFullMeta(key: string) {
    try {
        const { contentService } = await import('./content');
        const meta = await contentService.getServiceMeta(key);
        if (meta && meta.meta) return meta.meta;
        return { media: [], categories: getDefaultCategories(key) };
    } catch {
        return { media: [], categories: getDefaultCategories(key) };
    }
}

async function saveFullMeta(key: string, payload: { media: SetupMedia[]; categories: SetupCategory[] }) {
    const { contentService } = await import('./content');
    await contentService.upsertServiceMeta({
        key: key,
        title: key === SHOP_SETUP_KEY ? "Shop Setup Gallery" : "F150 Command Center Gallery",
        description: "Visual setup documentation.",
        meta: payload
    });
}

export async function getSetupMedia(key: string = MOBILE_SETUP_KEY): Promise<SetupMedia[]> {
    try {
        const full = await getFullMeta(key);
        return Array.isArray(full.media) ? full.media : [];
    } catch (err) {
        console.error('Error loading setup media:', err);
        return [];
    }
}

export async function getSetupCategories(key: string = MOBILE_SETUP_KEY): Promise<SetupCategory[]> {
    try {
        const full = await getFullMeta(key);
        const cats = Array.isArray(full.categories) ? full.categories : getDefaultCategories(key);
        return cats.sort((a: SetupCategory, b: SetupCategory) => a.order - b.order);
    } catch {
        return getDefaultCategories(key);
    }
}

export async function saveSetupCategories(categories: SetupCategory[], key: string = MOBILE_SETUP_KEY): Promise<void> {
    if (isDemoActive()) return;
    try {
        const full = await getFullMeta(key);
        await saveFullMeta(key, { media: full.media || [], categories });
    } catch (err) {
        console.error('Error saving categories:', err);
        throw err;
    }
}

export async function saveSetupMedia(media: SetupMedia, key: string = MOBILE_SETUP_KEY): Promise<void> {
    if (isDemoActive()) return;
    try {
        const full = await getFullMeta(key);
        const current: SetupMedia[] = Array.isArray(full.media) ? full.media : [];
        const categories: SetupCategory[] = Array.isArray(full.categories) ? full.categories : getDefaultCategories(key);

        const next = [...current];
        const idx = next.findIndex(m => m.id === media.id);
        if (idx >= 0) {
            next[idx] = media;
        } else {
            next.push(media);
        }

        await saveFullMeta(key, { media: next, categories });
    } catch (err) {
        console.error('Error saving setup media:', err);
        throw err;
    }
}

export async function updateSetupMediaCategory(id: string, categoryId: string, key: string = MOBILE_SETUP_KEY): Promise<void> {
    if (isDemoActive()) return;
    try {
        const full = await getFullMeta(key);
        const media: SetupMedia[] = Array.isArray(full.media) ? full.media : [];
        const categories: SetupCategory[] = Array.isArray(full.categories) ? full.categories : getDefaultCategories(key);
        const updated = media.map(m => m.id === id ? { ...m, category: categoryId } : m);
        await saveFullMeta(key, { media: updated, categories });
    } catch (err) {
        console.error('Error updating media category:', err);
        throw err;
    }
}

export async function deleteSetupMedia(id: string, key: string = MOBILE_SETUP_KEY): Promise<void> {
    if (isDemoActive()) return;
    try {
        const full = await getFullMeta(key);
        const categories: SetupCategory[] = Array.isArray(full.categories) ? full.categories : getDefaultCategories(key);
        const media: SetupMedia[] = Array.isArray(full.media) ? full.media : [];
        const next = media.filter(m => m.id !== id);
        await saveFullMeta(key, { media: next, categories });
    } catch (err) {
        console.error('Error deleting setup media:', err);
        throw err;
    }
}
