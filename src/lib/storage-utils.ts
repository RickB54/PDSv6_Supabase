import { supabase } from './supa-data';

/**
 * Ensures all required storage buckets exist in Supabase.
 * Creates them if they don't exist.
 * Safe to call multiple times - only creates missing buckets.
 */
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
                allowedMimeTypes: ['image/*', 'video/*', 'application/pdf']
            }
        },
        {
            name: 'chemicals',
            config: {
                public: true,
                fileSizeLimit: 10485760, // 10MB
                allowedMimeTypes: ['image/*']
            }
        },
        {
            name: 'app-backups',
            config: {
                public: false, // Private!
                fileSizeLimit: 52428800, // 50MB
                allowedMimeTypes: ['application/json']
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
                    if ((createError as any).code === '42501') {
                        // Silence RLS errors in production as buckets are likely already created by admin
                        console.log(`ℹ️ Bucket "${bucket.name}" could not be created/verified (RLS). Skipping.`);
                    } else {
                        console.warn(`Failed to create bucket "${bucket.name}":`, createError);
                    }
                } else {
                    console.log(`✅ Created storage bucket: ${bucket.name}`);
                }
            }
        }
    } catch (err) {
        console.warn('Storage bucket initialization failed:', err);
    }
};

/**
 * Uploads a file to a specific Supabase Storage bucket.
 * Returns the public URL of the uploaded file.
 * Automatically compresses images to prevent mobile device out-of-memory errors.
 */
export const uploadFile = async (bucket: string, file: File, path?: string, skipCompression: boolean = false): Promise<string> => {
    let fileToUpload = file;
    
    // Automatically apply compression for image uploads unless explicitly skipped
    if (!skipCompression && file.type.startsWith('image/')) {
        try {
            const { compressImageForUpload } = await import('./image-compression');
            fileToUpload = await compressImageForUpload(file);
        } catch (compErr) {
            console.warn("Auto-compression failed before upload:", compErr);
            // Continue with original file if compression fails
        }
    }

    const fileName = path || `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: true
    });

    if (error) {
        console.error(`Upload to bucket "${bucket}" failed:`, error);
        throw error;
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
};

// Auto-run on import - but don't block the main thread
setTimeout(() => {
    ensureAllStorageBuckets().catch(err => console.warn('Storage init error:', err));
}, 100);

