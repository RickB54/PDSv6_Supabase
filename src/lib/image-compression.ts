import browserImageCompression from "browser-image-compression";
import { toast } from "sonner";

/**
 * Centrally managed image compression profile for the application.
 * Designed to prevent "low memory" errors on mobile devices while maintaining 
 * high enough quality for inventory and notes.
 */
export const compressImageForUpload = async (file: File, options = {}) => {
  // Give the browser UI thread more time to settle after returning from native camera
  // Give the browser UI thread a moment to settle after returning from native camera.
  // This helps prevent "low memory" crashes on mobile by following the system's
  // memory reclamation cycle. 500ms is the "sweet spot" for snappy but stable.
  await new Promise(resolve => setTimeout(resolve, 500));
  const defaultOptions = {
    maxSizeMB: 0.3,           // Target size < 300KB (even safer for mobile)
    maxWidthOrHeight: 800,   // Slightly smaller dimensions for faster processing/lower RAM
    useWebWorker: true,
    initialQuality: 0.5,      // Lower initial quality to reduce initial canvas pressure
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
    console.warn("Worker-based compression failed, trying main-thread fallback:", error);
    try {
      // Fallback for extremely low memory: no web worker
      const fallbackOptions = { ...defaultOptions, useWebWorker: false };
      return await browserImageCompression(file, fallbackOptions);
    } catch (fallbackError) {
      console.warn("All compression attempts failed, falling back to original file:", fallbackError);
      return file;
    }
  }
};
