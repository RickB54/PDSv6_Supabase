import imageCompression from 'browser-image-compression';

/**
 * Compress an image file using browser-image-compression library.
 * Optimized for mobile to prevent OOM errors with large 50MP+ photos.
 */
export async function compressImage(file: File, maxWidth = 1280, quality = 0.6): Promise<File> {
    try {
        // If not an image, return original
        if (!file.type.startsWith('image/')) {
            return file;
        }

        const options = {
            maxSizeMB: 0.4, // Reduced from 0.8 to prevent mobile memory issues
            maxWidthOrHeight: maxWidth, // Default 1280px (down from 1600)
            useWebWorker: true,
            alwaysUseWebWorker: true, // Force web worker on mobile
            initialQuality: quality, // Reduced from 0.7 to 0.6
            maxIteration: 10, // Limit compression attempts
            fileType: 'image/jpeg'
        };

        console.log(`Compressing ${file.type} (${(file.size / 1024 / 1024).toFixed(2)} MB) with options:`, options);

        const compressedFile = await imageCompression(file, options);

        console.log(`Compression result: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

        return compressedFile;

    } catch (error) {
        console.error("Compression failed:", error);
        // Fallback: return original file if compression crashes
        return file;
    }
}
