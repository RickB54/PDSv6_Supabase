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

export { getMediaUrl, compressImageVariant, compressImageForUpload } from './image-compression';

/**
 * Uploads a file to a specific Supabase Storage bucket.
 * Returns the public URL of the uploaded file.
 * Automatically compresses full images (<120KB) and generates/uploads _thumb.webp (<15KB) variants.
 */
export const uploadFile = async (bucket: string, file: File, path?: string, skipCompression: boolean = false): Promise<string> => {
    let fileToUpload = file;
    let thumbFile: File | null = null;
    
    const baseName = path || `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const dotIdx = baseName.lastIndexOf('.');
    const basePrefix = dotIdx > 0 ? baseName.substring(0, dotIdx) : baseName;
    const thumbName = `${basePrefix}_thumb.webp`;

    if (!skipCompression && file.type.startsWith('image/')) {
        try {
            const { compressImageVariant } = await import('./image-compression');
            const [compressedFull, compressedThumb] = await Promise.all([
                compressImageVariant(file, 'full'),
                compressImageVariant(file, 'thumb')
            ]);
            fileToUpload = compressedFull;
            thumbFile = compressedThumb;
        } catch (compErr) {
            console.warn("Auto-compression failed before upload:", compErr);
        }
    }

    const { data, error } = await supabase.storage.from(bucket).upload(baseName, fileToUpload, {
        cacheControl: '3600',
        upsert: true
    });

    if (error) {
        console.error(`Upload to bucket "${bucket}" failed:`, error);
        throw error;
    }

    // Upload thumbnail variant asynchronously
    if (thumbFile) {
        supabase.storage.from(bucket).upload(thumbName, thumbFile, {
            cacheControl: '3600',
            upsert: true
        }).catch(err => console.warn(`Thumb upload failed for ${thumbName}:`, err));
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
};

// Auto-run on import - but don't block the main thread
setTimeout(() => {
    ensureAllStorageBuckets().catch(err => console.warn('Storage init error:', err));
}, 100);

