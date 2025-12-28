// Supabase backup storage functions
import supabase from '@/lib/supabase';

export interface BackupMetadata {
    id: string;
    user_id: string;
    filename: string;
    created_at: string;
    size_bytes: number;
    schema_version: number;
}

/**
 * Save backup JSON to Supabase storage
 */
export async function saveBackupToSupabase(json: string, filename?: string): Promise<string | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const name = filename || `pds-backup-${new Date().toISOString().split('T')[0]}.json`;
        const path = `backups/${user.id}/${name}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('app-backups')
            .upload(path, json, {
                contentType: 'application/json',
                upsert: true
            });

        if (error) throw error;

        // Save metadata to database
        const payload = JSON.parse(json);
        await supabase.from('backup_metadata').insert({
            user_id: user.id,
            filename: name,
            size_bytes: new Blob([json]).size,
            schema_version: payload.schemaVersion || 1,
            storage_path: path
        });

        return data.path;
    } catch (error) {
        console.error('Error saving backup to Supabase:', error);
        return null;
    }
}

/**
 * List all backups for current user
 */
export async function listSupabaseBackups(): Promise<BackupMetadata[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('backup_metadata')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error listing backups:', error);
        return [];
    }
}

/**
 * Load backup JSON from Supabase storage
 */
export async function loadBackupFromSupabase(filename: string): Promise<string | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const path = `backups/${user.id}/${filename}`;

        const { data, error } = await supabase.storage
            .from('app-backups')
            .download(path);

        if (error) throw error;

        const text = await data.text();
        return text;
    } catch (error) {
        console.error('Error loading backup from Supabase:', error);
        return null;
    }
}

/**
 * Delete backup from Supabase
 */
export async function deleteSupabaseBackup(filename: string): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const path = `backups/${user.id}/${filename}`;

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('app-backups')
            .remove([path]);

        if (storageError) throw storageError;

        // Delete metadata
        await supabase
            .from('backup_metadata')
            .delete()
            .eq('user_id', user.id)
            .eq('filename', filename);

        return true;
    } catch (error) {
        console.error('Error deleting backup:', error);
        return false;
    }
}
