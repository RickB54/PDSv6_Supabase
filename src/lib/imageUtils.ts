/**
 * Compress an image file using browser Canvas API.
 * Converts to JPG with reduced quality and resizing.
 * optimized for mobile memory constraints.
 */
export async function compressImage(file: File, maxWidth = 1280, quality = 0.8): Promise<File> {
    return new Promise((resolve) => {
        // If not an image, return original
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.src = objectUrl;

        img.onload = () => {
            // Clean up the URL object immediately to free memory
            URL.revokeObjectURL(objectUrl);

            try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Aggressively resize if huge to save memory
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    console.warn("Canvas context creation failed");
                    resolve(file); // Fallback to original
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        console.warn("Canvas blob creation failed");
                        resolve(file);
                        return;
                    }
                    // Create new file from blob
                    const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });

                    // Explicitly clear canvas references
                    canvas.width = 0;
                    canvas.height = 0;

                    resolve(newFile);
                }, 'image/jpeg', quality);
            } catch (e) {
                console.error("Compression failed (likely OOM), using original", e);
                resolve(file); // Failsafe: return original
            }
        };

        img.onerror = (err) => {
            console.error("Image load error during compression", err);
            URL.revokeObjectURL(objectUrl);
            resolve(file); // Return original on error
        };
    });
}
