import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, anonKey);

const BUCKETS = ['customer-photos', 'blog-media', 'note-images', 'chemicals'];

interface FileRef {
  bucket: string;
  path: string;
}

async function spotCheck() {
  console.log('==========================================');
  console.log('🧪 RUNNING STORAGE SPOT-CHECK ACROSS ALL BUCKETS');
  console.log('==========================================\n');

  for (const bucket of BUCKETS) {
    const bucketFiles: string[] = [];

    async function walk(dir: string = '') {
      if (bucketFiles.length >= 5) return;
      const { data: list } = await supabase.storage.from(bucket).list(dir, { limit: 100 });
      if (!list) return;

      for (const item of list) {
        if (bucketFiles.length >= 5) break;
        if (item.id === null && item.name !== '.emptyFolderPlaceholder') {
          await walk(dir ? `${dir}/${item.name}` : item.name);
        } else {
          if (item.name === '.emptyFolderPlaceholder') continue;
          if (item.name.includes('_thumb.webp') || item.name.startsWith('thumb_')) continue;
          const ext = item.name.split('.').pop()?.toLowerCase() || '';
          if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
            bucketFiles.push(dir ? `${dir}/${item.name}` : item.name);
          }
        }
      }
    }

    await walk();

    console.log(`📁 Bucket [${bucket}] (Tested ${bucketFiles.length} sample pairs):`);
    for (const filePath of bucketFiles.slice(0, 3)) {
      const { data: origUrl } = supabase.storage.from(bucket).getPublicUrl(filePath);

      const dotIdx = filePath.lastIndexOf('.');
      const baseName = dotIdx > 0 ? filePath.substring(0, dotIdx) : filePath;
      const thumbPath = `${baseName}_thumb.webp`;
      const { data: thumbUrl } = supabase.storage.from(bucket).getPublicUrl(thumbPath);

      const resOrig = await fetch(origUrl.publicUrl, { method: 'HEAD' });
      const resThumb = await fetch(thumbUrl.publicUrl, { method: 'HEAD' });

      console.log(`  📄 File: ${filePath}`);
      console.log(`     - Original/Full (${resOrig.status} ${resOrig.statusText}): ${origUrl.publicUrl}`);
      console.log(`     - Thumbnail     (${resThumb.status} ${resThumb.statusText}): ${thumbUrl.publicUrl}`);
    }
    console.log('');
  }
}

spotCheck().catch(console.error);
