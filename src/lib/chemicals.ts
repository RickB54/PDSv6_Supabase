import supabase from './supabase';
import { Chemical } from '@/types/chemicals';
// import { cleanInventoryItem } from './utils'; // Helper if needed, or define simple cleaner

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
    try {
        // Ensure arrays are initialized if missing, standard cleanup
        const payload = {
            ...chemical,
            updated_at: new Date().toISOString(),
        };

        // If new, add created_at
        if (!payload.id) {
            (payload as any).created_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('chemical_library')
            .upsert(payload)
            .select()
            .single();

        return { error, data };
    } catch (e) {
        return { error: e, data: null };
    }
}

export async function updateChemicalPartial(id: string, updates: Partial<Chemical>): Promise<{ error: any; data: Chemical | null }> {
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

        return { error, data };
    } catch (e) {
        return { error: e, data: null };
    }
}

export async function deleteChemical(id: string): Promise<boolean> {
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
