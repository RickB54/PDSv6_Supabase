import supabase from './supabase';
import { Chemical } from '@/types/chemicals';
// import { cleanInventoryItem } from './utils'; // Helper if needed, or define simple cleaner

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
