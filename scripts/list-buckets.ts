import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function checkStorage() {
  const possibleBuckets = [
    'customer-photos',
    'blog-media',
    'note-images',
    'chemicals',
    'images',
    'gallery-images',
    'vehicle-photos',
    'supplies',
    'tools'
  ];
  
  let totalSize = 0;
  let totalFiles = 0;
  
  for (const bucket of possibleBuckets) {
    let bucketSize = 0;
    let bucketFiles = 0;
    
    // We will do a simple list. We might need a recursive list if there are folders.
    async function walk(path: string = '') {
      const { data: list, error: listError } = await supabase.storage.from(bucket).list(path, { limit: 1000 });
      if (listError) {
        // usually means bucket doesn't exist or no permission
        return;
      }
      if (!list) return;
      
      for (const item of list) {
        // If it has no id and is not a placeholder, it might be a folder
        if (item.id === null && item.name !== '.emptyFolderPlaceholder') {
          await walk(path ? `${path}/${item.name}` : item.name);
        } else {
          // Exclude thumbnails
          if (item.name.includes('thumb') || item.name.startsWith('thumb_')) continue;
          if (item.name === '.emptyFolderPlaceholder') continue;
          
          if (item.metadata && item.metadata.size) {
            bucketSize += item.metadata.size;
            bucketFiles++;
          }
        }
      }
    }
    
    await walk();
    if (bucketFiles > 0) {
      console.log(`Bucket ${bucket}: ${bucketFiles} files, ${(bucketSize / 1024 / 1024).toFixed(2)} MB`);
      totalSize += bucketSize;
      totalFiles += bucketFiles;
    }
  }
  console.log(`Total: ${totalFiles} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

checkStorage();
