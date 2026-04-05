import browserImageCompression from "browser-image-compression";
import { toast } from "sonner";

/**
 * Centrally managed image compression profile for the application.
 * Designed to prevent "low memory" errors on mobile devices while maintaining 
 * high enough quality for inventory and notes.
 */
export const compressImageForUpload = async (file: File, options = {}) => {
  const defaultOptions = {
    maxSizeMB: 0.5,           // Target size < 500KB
    maxWidthOrHeight: 1280,  // Maximum dimension 1280px (plenty for thumbnails/previews)
    useWebWorker: true,      // Use web worker to keep main thread responsive
    initialQuality: 0.7,      // Start with 70% quality
    alwaysKeepResolution: false,
    ...options
  };

  try {
    // If the file is already small, skip compression overhead
    if (file.size < 512 * 1024) {
      console.log("File is already under 512KB, skipping compression");
      return file;
    }

    const compressedFile = await browserImageCompression(file, defaultOptions);
    console.log(`Compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    return compressedFile;
  } catch (error) {
    console.warn("Image compression failed, falling back to original file:", error);
    // On some extremely low-memory devices, web workers might fail or browser might hang
    // We fall back to the original to at least TRY the upload, though it might still be heavy
    return file;
  }
};
