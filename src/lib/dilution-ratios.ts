import { supabase } from './supabase';

export interface ReferenceRatio {
    id: string;
    ratio: string;
    is_hidden: boolean;
    user_id: string;
}

export async function getReferenceRatios(): Promise<ReferenceRatio[]> {
    try {
        const { data, error } = await supabase
            .from('dilution_reference_ratios')
            .select('*');
        if (error) {
            console.error('getReferenceRatios error:', error);
            // Fallback to empty if table doesn't exist yet
            return [];
        }
        return data || [];
    } catch (e) {
        console.error('getReferenceRatios exception:', e);
        return [];
    }
}

export async function upsertReferenceRatio(ratio: string, is_hidden: boolean = false): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const payload = {
        ratio,
        is_hidden,
        user_id: session.user.id,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('dilution_reference_ratios')
        .upsert(payload, { onConflict: 'ratio, user_id' });
    
    if (error) {
        console.error('upsertReferenceRatio error:', error);
        throw error;
    }
}

export async function deleteReferenceRatio(ratio: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase
        .from('dilution_reference_ratios')
        .delete()
        .match({ ratio, user_id: session.user.id });
    
    if (error) {
        console.error('deleteReferenceRatio error:', error);
        throw error;
    }
}
