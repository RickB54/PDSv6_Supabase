import { supabase } from './supa-data';

/**
 * Ensures all required storage buckets exist in Supabase.
 * Creates them if they don't exist.
 * Safe to call multiple times - only creates missing buckets.
 */
export const ensureAllStorageBuckets = async (): Promise<void> => {
    const bucketsToCreate = [
        {
            name: 'note-images',
            config: {
                public: true,
                fileSizeLimit: 10485760, // 10MB
                allowedMimeTypes: ['image/*']
            }
        },
        {
            name: 'blog-media',
            config: {
                public: true,
                fileSizeLimit: 10485760, // 10MB
                allowedMimeTypes: ['image/*', 'video/*']
            }
        },
        {
            name: 'customer-photos',
            config: {
                public: true,
                fileSizeLimit: 10485760, // 10MB
                allowedMimeTypes: ['image/*']
            }
        }
    ];

    try {
        const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

        if (listError) {
            console.warn('Failed to list buckets:', listError);
            return;
        }

        const existingNames = new Set(existingBuckets?.map(b => b.name) || []);

        for (const bucket of bucketsToCreate) {
            if (!existingNames.has(bucket.name)) {
                const { error: createError } = await supabase.storage.createBucket(
                    bucket.name,
                    bucket.config
                );

                if (createError) {
                    console.warn(`Failed to create bucket "${bucket.name}":`, createError);
                } else {
                    console.log(`✅ Created storage bucket: ${bucket.name}`);
                }
            }
        }
    } catch (err) {
        console.warn('Storage bucket initialization failed:', err);
    }
};

// Auto-run on import
ensureAllStorageBuckets();
