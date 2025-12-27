// Inventory data layer - handles Supabase operations for inventory
import { supabase } from './supabase';

export interface Chemical {
    id: string;
    name: string;
    bottleSize: string;
    costPerBottle: number;
    threshold: number;
    currentStock: number;
    imageUrl?: string;
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
    imageUrl?: string;
}

export interface Tool {
    id: string;
    name: string;
    warranty: string;
    purchaseDate: string;
    price: number;
    lifeExpectancy: string;
    notes: string;
    imageUrl?: string;
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
        bottleSize: item.bottle_size || '',
        costPerBottle: item.cost_per_bottle || 0,
        threshold: item.threshold || 0,
        currentStock: item.current_stock || 0,
        imageUrl: item.image_url
    }));
}

export async function saveChemical(chemical: Partial<Chemical>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const dbData = {
        id: chemical.id,
        user_id: user.id,
        name: chemical.name,
        bottle_size: chemical.bottleSize,
        cost_per_bottle: chemical.costPerBottle,
        threshold: chemical.threshold,
        current_stock: chemical.currentStock,
        image_url: chemical.imageUrl,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('chemicals')
        .upsert(dbData);

    if (error) throw error;
}

export async function deleteChemical(id: string): Promise<void> {
    const { error } = await supabase
        .from('chemicals')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// MATERIALS
// ============================================

export async function getMaterials(): Promise<Material[]> {
    const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error loading materials:', error);
        return [];
    }

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
        imageUrl: item.image_url
    }));
}

export async function saveMaterial(material: Partial<Material>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const dbData = {
        id: material.id,
        user_id: user.id,
        name: material.name,
        category: material.category,
        subtype: material.subtype,
        quantity: material.quantity,
        cost_per_item: material.costPerItem,
        notes: material.notes,
        low_threshold: material.lowThreshold,
        image_url: material.imageUrl,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('materials')
        .upsert(dbData);

    if (error) throw error;
}

export async function deleteMaterial(id: string): Promise<void> {
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
        warranty: item.warranty || '',
        purchaseDate: item.purchase_date || '',
        price: item.price || 0,
        lifeExpectancy: item.life_expectancy || '',
        notes: item.notes || '',
        imageUrl: item.image_url
    }));
}

export async function saveTool(tool: Partial<Tool>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const dbData = {
        id: tool.id,
        user_id: user.id,
        name: tool.name,
        warranty: tool.warranty,
        purchase_date: tool.purchaseDate,
        price: tool.price,
        life_expectancy: tool.lifeExpectancy,
        notes: tool.notes,
        image_url: tool.imageUrl,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('tools')
        .upsert(dbData);

    if (error) throw error;
}

export async function deleteTool(id: string): Promise<void> {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const dbData = {
        id: usage.id,
        user_id: user.id,
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
    const { error } = await supabase
        .from('usage_history')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
