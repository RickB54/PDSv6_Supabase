import supabase from '@/lib/supabase';
import { isDemoActive } from '@/lib/supa-data';

export async function getAppSetting<T>(key: string): Promise<T | null> {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', key)
            .maybeSingle();

        if (error) {
            console.warn(`Error fetching app setting [${key}]:`, error);
            return null;
        }

        return data?.value as T | null;
    } catch (err) {
        console.warn(`Exception fetching app setting [${key}]:`, err);
        return null;
    }
}

export async function saveAppSetting(key: string, value: any): Promise<boolean> {
    if (isDemoActive()) return true;
    try {
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

        if (error) {
            console.error(`Error saving app setting [${key}]:`, error);
            return false;
        }

        return true;
    } catch (err) {
        console.error(`Exception saving app setting [${key}]:`, err);
        return false;
    }
}
