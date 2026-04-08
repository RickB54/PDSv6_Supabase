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
    imageUrl?: string;
    createdAt?: string;
    updatedAt?: string;
    wherePurchased?: string;
}

export interface SetupMedia {
    id: string;
    type: 'image' | 'video';
    url: string;
    caption?: string;
    createdAt?: string;
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
        wherePurchased: item.where_purchased
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
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('chemicals')
        .upsert(dbData);
    
    if (error) {
        if (error.code === '42703' && error.message?.includes('where_purchased')) {
            console.warn('Handling missing where_purchased column in chemicals table, retrying...', error.message);
            const sanitized = { ...dbData };
            delete sanitized.where_purchased;
            const { error: retryErr } = await supabase.from('chemicals').upsert(sanitized);
            if (retryErr) throw retryErr;
        } else {
            throw error;
        }
    }

    // 2. UNIVERSAL SYNC: Update Chemical Library if linked
    if (!skipLibrarySync && chemical.chemicalLibraryId && chemical.dilutionRatios) {
        try {
            const { updateChemicalPartial } = await import('./chemicals');
            await updateChemicalPartial(chemical.chemicalLibraryId, {
                dilution_ratios: chemical.dilutionRatios,
                brand: chemical.brand 
            }, true); // Important: skipInventorySync
        } catch (syncErr) {
            console.error("Failed to sync inventory update back to library:", syncErr);
        }
    }

    // Record as expense in budget if this is a new purchase
    if (isNew && chemical.costPerBottle && chemical.currentStock) {
        const totalCost = chemical.costPerBottle * chemical.currentStock;
        await upsertExpense({
            amount: totalCost,
            category: 'Supplies',
            description: `Purchased ${chemical.name} (${chemical.currentStock} bottles @ $${chemical.costPerBottle})`,
            createdAt: new Date().toISOString()
        } as any);
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
        wherePurchased: item.where_purchased
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
        updated_at: new Date().toISOString()
    };

    console.log('[InventoryData] saveMaterial: Updating database...', dbData);

    const { data: upsertData, error } = await supabase
        .from('materials')
        .upsert(dbData)
        .select();

    if (error) {
        if (error.code === '42703' && error.message?.includes('where_purchased')) {
            console.warn('Handling missing where_purchased column in materials table, retrying...', error.message);
            const sanitized = { ...dbData };
            delete sanitized.where_purchased;
            const { data: retryData, error: retryErr } = await supabase.from('materials').upsert(sanitized).select();
            if (retryErr) throw retryErr;
            const savedItem = retryData?.[0];
            return savedItem;
        } else {
            console.error('[InventoryData] saveMaterial: Supabase Error!', error);
            throw error;
        }
    }
    
    const savedItem = upsertData?.[0];
    console.log('[InventoryData] saveMaterial: Persistence Successful!', savedItem);

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

    // Record as expense in budget if this is a new purchase
    if (isNew && material.costPerItem && material.quantity) {
        const totalCost = material.costPerItem * material.quantity;
        await upsertExpense({
            date: new Date().toISOString().split('T')[0],
            amount: totalCost,
            category: 'Supplies',
            description: `Stock Purchase: ${material.name} (Qty: ${material.quantity})`,
            type: 'expense'
        } as any);
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
        lifeExpectancy: item.life_expectancy || '',
        notes: item.notes || '',
        imageUrl: item.image_url,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        wherePurchased: item.where_purchased
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
        life_expectancy: tool.lifeExpectancy,
        notes: tool.notes,
        image_url: tool.imageUrl,
        where_purchased: tool.wherePurchased || null,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('tools')
        .upsert(dbData);

    if (error) {
        // Handle missing columns gracefully (schema might not be updated yet)
        if (error.message?.includes('where_purchased') || error.message?.includes('quantity') || error.message?.includes('category') || error.code === '42703') {
            console.warn('Handling missing columns in tools table, retrying...', error.message);
            const sanitizedData = { ...dbData };
            if (error.message?.includes('quantity')) delete sanitizedData.quantity;
            if (error.message?.includes('category')) delete sanitizedData.category;
            if (error.message?.includes('where_purchased')) delete sanitizedData.where_purchased;
            
            const { error: retryErr } = await supabase.from('tools').upsert(sanitizedData);
            if (retryErr) throw retryErr;
        } else {
            throw error;
        }
    }

    // Record as expense in budget if this is a new purchase
    if (isNew && tool.price) {
        await upsertExpense({
            amount: tool.price,
            category: 'Supplies',
            description: `Purchased ${tool.name} - Tool`,
            createdAt: new Date().toISOString()
        } as any);
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

export async function getSetupMedia(): Promise<SetupMedia[]> {
    const { data, error } = await supabase
        .from('mobile_setup_media')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading setup media:', error);
        return [];
    }

    return (data || []).map(item => ({
        id: item.id,
        type: item.type,
        url: item.url,
        caption: item.caption,
        createdAt: item.created_at
    }));
}

export async function saveSetupMedia(media: SetupMedia): Promise<void> {
    if (isDemoActive()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    const dbData = {
        id: media.id,
        type: media.type,
        url: media.url,
        caption: media.caption,
        user_id: session.user.id,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('mobile_setup_media')
        .upsert(dbData);

    if (error) throw error;
}

export async function deleteSetupMedia(id: string): Promise<void> {
    if (isDemoActive()) return;
    const { error } = await supabase
        .from('mobile_setup_media')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
