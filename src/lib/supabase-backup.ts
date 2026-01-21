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
export async function saveBackupToSupabase(json: string, filename?: string): Promise<{ path?: string, error?: string }> {
    try {
        // 1. Get Authentication Context
        const { data: { session } } = await supabase.auth.getSession();
        let user = session?.user;

        if (!user) {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            user = authUser || undefined;
        }

        if (!user) {
            console.error('Save Backup: No authenticated user found.');
            return { error: 'Not authenticated. Please log out and log back in to refresh your session.' };
        }

        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[1].split('Z')[0]; // HH-MM-SS-mmm
        const dateStr = now.toISOString().split('T')[0];
        const name = filename || `pds-backup-${dateStr}-${timestamp}.json`;
        const path = `${user.id}/${name}`;

        // 2. Upload to Supabase Storage
        const { data, error: storageError } = await supabase.storage
            .from('app-backups')
            .upload(path, json, {
                contentType: 'application/json',
                upsert: true
            });

        if (storageError) {
            console.error('Storage upload error:', storageError);
            return { error: `Storage Error: ${storageError.message}` };
        }

        // 3. Save metadata to database
        const payload = JSON.parse(json);
        const { error: dbError } = await supabase.from('backup_metadata').insert({
            user_id: user.id,
            filename: name,
            size_bytes: new Blob([json]).size,
            schema_version: payload.schemaVersion || 1,
            storage_path: path
        });

        if (dbError) {
            console.error('Database metadata error:', dbError);
            return { error: `Database Error: ${dbError.message} (File uploaded but metadata failed)` };
        }

        return { path: data.path };
    } catch (error: any) {
        console.error('Error saving backup to Supabase:', error);
        return { error: error.message || 'Unknown backup error' };
    }
}

/**
 * List all backups for current user
 */
export async function listSupabaseBackups(): Promise<BackupMetadata[]> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
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
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) throw new Error('Not authenticated');

        const path = `${user.id}/${filename}`;

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
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return false;

        const path = `${user.id}/${filename}`;

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
