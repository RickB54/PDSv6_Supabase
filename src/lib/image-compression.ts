import browserImageCompression from "browser-image-compression";
import { toast } from "sonner";

/**
 * Centrally managed image compression profile for the application.
 * Designed to prevent "low memory" errors on mobile devices while maintaining 
 * high enough quality for inventory and notes.
 */
export const compressImageForUpload = async (file: File, options = {}) => {
  // Give the browser UI thread a moment to settle after returning from native camera
  // This is a known fix for mobile "low memory" crashes where the system is still
  // recovering from the Camera app's memory usage.
  await new Promise(resolve => setTimeout(resolve, 500));

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
