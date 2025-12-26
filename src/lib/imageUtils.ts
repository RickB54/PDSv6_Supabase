import imageCompression from 'browser-image-compression';

/**
 * Compress an image file using browser-image-compression library.
 * Optimized for mobile to prevent OOM errors with large 50MP+ photos.
 */
export async function compressImage(file: File, maxWidth = 1600, quality = 0.7): Promise<File> {
    try {
        // If not an image, return original
        if (!file.type.startsWith('image/')) {
            return file;
        }

        const options = {
            maxSizeMB: 0.8, // Target 0.8MB max for speed
            maxWidthOrHeight: maxWidth,
            useWebWorker: true, // Use worker to prevent UI freeze
            initialQuality: quality,
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
