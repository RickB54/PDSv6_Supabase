import browserImageCompression from "browser-image-compression";

/**
 * Centrally managed image compression and thumbnail generation engine.
 * Designed to minimize payload sizes and prevent mobile out-of-memory errors.
 */

export interface ImageVariants {
  full: File;
  thumb: File;
}

/**
 * Compresses an image file according to the requested variant:
 * - 'full': Max 1024px, < 120KB WebP
 * - 'thumb': Max 200px, < 15KB WebP
 */
export const compressImageVariant = async (
  file: File,
  target: 'full' | 'thumb',
  customOptions: any = {}
): Promise<File> => {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Give the browser UI thread a moment to settle after camera capture on mobile
  await new Promise(resolve => setTimeout(resolve, 300));

  const isThumb = target === 'thumb';
  const defaultOptions = isThumb
    ? {
        maxSizeMB: 0.015,         // Max 15KB for thumbnails
        maxWidthOrHeight: 200,    // 200px max
        useWebWorker: true,
        initialQuality: 0.5,
        fileType: 'image/webp'
      }
    : {
        maxSizeMB: 0.12,          // Max 120KB for full image
        maxWidthOrHeight: 1024,   // 1024px max
        useWebWorker: true,
        initialQuality: 0.65,
        fileType: 'image/webp'
      };

  try {
    return await browserImageCompression(file, { ...defaultOptions, ...customOptions });
  } catch (err) {
    console.warn(`Worker-based ${target} compression failed, trying main thread:`, err);
    try {
      return await browserImageCompression(file, { ...defaultOptions, ...customOptions, useWebWorker: false });
    } catch (fallbackErr) {
      console.warn(`All ${target} compression attempts failed, falling back:`, fallbackErr);
      return file;
    }
  }
};

/**
 * Backward-compatible helper for full image compression.
 */
export const compressImageForUpload = async (file: File, options = {}): Promise<File> => {
  return compressImageVariant(file, 'full', options);
};

/**
 * Resolves media URL to either thumbnail or full version.
 * If variant is 'thumb', automatically points to the `_thumb.webp` sibling for Supabase Storage assets.
 */
export const getMediaUrl = (url?: string | null, variant: 'thumb' | 'full' = 'full'): string => {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  if (variant === 'thumb') {
    if (url.includes('_thumb.webp') || url.includes('_thumb.png') || url.includes('_thumb.jpg')) {
      return url;
    }
    // Find last dot
    const lastDotIdx = url.lastIndexOf('.');
    if (lastDotIdx > 0 && !url.endsWith('/')) {
      const base = url.substring(0, lastDotIdx);
      return `${base}_thumb.webp`;
    }
    return url;
  }

  // variant === 'full'
  if (url.includes('_thumb.webp')) {
    return url.replace('_thumb.webp', '.webp');
  }
  return url;
};
