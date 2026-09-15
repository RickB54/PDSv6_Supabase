import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseKey = serviceRoleKey || anonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKETS = [
  'customer-photos',
  'blog-media',
  'note-images',
  'chemicals'
];

const BACKUP_DIR = path.join(process.cwd(), 'backups/storage_archive');
const COMPRESSED_DIR = path.join(process.cwd(), 'backups/compressed_storage');
const THUMBNAIL_DIR = path.join(process.cwd(), 'backups/thumbnails_storage');

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

interface StorageFile {
  bucket: string;
  filePath: string;
  name: string;
}

async function run() {
  const isUploadMode = process.argv.includes('--upload');
  
  if (isUploadMode) {
    console.log('⚡ UPLOAD MODE ENABLED: Will compress originals & upload _thumb.webp variants to Supabase ⚡\n');
  } else {
    console.log('🔍 ANALYSIS & BACKUP MODE: Will download, backup losslessly, and generate thumbnails locally 🔍\n');
  }

  await ensureDir(BACKUP_DIR);
  await ensureDir(COMPRESSED_DIR);
  await ensureDir(THUMBNAIL_DIR);

  console.log('Listing files from storage buckets...');
  const allFiles: StorageFile[] = [];

  for (const bucket of BUCKETS) {
    let bucketCount = 0;
    async function walk(dirPath: string = '') {
      const { data: list, error: listError } = await supabase.storage.from(bucket).list(dirPath, { limit: 1000 });
      if (listError || !list) return;

      for (const item of list) {
        if (item.id === null && item.name !== '.emptyFolderPlaceholder') {
          await walk(dirPath ? `${dirPath}/${item.name}` : item.name);
        } else {
          if (item.name === '.emptyFolderPlaceholder') continue;
          if (item.name.includes('_thumb.webp') || item.name.startsWith('thumb_')) continue;

          const ext = item.name.split('.').pop()?.toLowerCase() || '';
          if (!['jpg', 'jpeg', 'png', 'webp', 'heic', 'avif'].includes(ext)) continue;

          const filePath = dirPath ? `${dirPath}/${item.name}` : item.name;
          allFiles.push({ bucket, filePath, name: item.name });
          bucketCount++;
        }
      }
    }
    await walk();
    console.log(`Bucket ${bucket}: found ${bucketCount} images`);
  }

  console.log(`\nTotal images to process: ${allFiles.length}\n`);

  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  let totalThumbSize = 0;
  let processedCount = 0;

  // Process in batches of 8 for reliable bandwidth
  const concurrency = 8;
  for (let i = 0; i < allFiles.length; i += concurrency) {
    const chunk = allFiles.slice(i, i + concurrency);
    await Promise.all(chunk.map(async (fileItem) => {
      const { bucket, filePath, name } = fileItem;
      const ext = name.split('.').pop()?.toLowerCase() || '';

      const dotIdx = filePath.lastIndexOf('.');
      const baseName = dotIdx > 0 ? filePath.substring(0, dotIdx) : filePath;
      const thumbPath = `${baseName}_thumb.webp`;

      const localBackupPath = path.join(BACKUP_DIR, bucket, filePath);
      const localCompressedPath = path.join(COMPRESSED_DIR, bucket, `${baseName}.webp`);
      const localThumbPath = path.join(THUMBNAIL_DIR, bucket, thumbPath);

      await ensureDir(path.dirname(localBackupPath));
      await ensureDir(path.dirname(localCompressedPath));
      await ensureDir(path.dirname(localThumbPath));

      // 1. Lossless Backup Download
      if (!fs.existsSync(localBackupPath)) {
        let downloaded = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(filePath);
            if (!downloadError && blob) {
              const buffer = Buffer.from(await blob.arrayBuffer());
              fs.writeFileSync(localBackupPath, buffer);
              downloaded = true;
              break;
            }
          } catch {
            // retry
          }
          await new Promise(r => setTimeout(r, 500 * attempt));
        }
        if (!downloaded) {
          console.warn(`[Skip] Could not download ${bucket}/${filePath}`);
          return;
        }
      }

      const originalBuffer = fs.readFileSync(localBackupPath);
      const originalSize = originalBuffer.length;
      totalOriginalSize += originalSize;

      // 2. Generate Full WebP Compressed Variant (max 1024px, target <100KB)
      let compressedBuffer: Buffer;
      if (!fs.existsSync(localCompressedPath)) {
        try {
          compressedBuffer = await sharp(originalBuffer)
            .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 70, effort: 4 })
            .toBuffer();
          fs.writeFileSync(localCompressedPath, compressedBuffer);
        } catch {
          compressedBuffer = originalBuffer;
        }
      } else {
        compressedBuffer = fs.readFileSync(localCompressedPath);
      }
      totalCompressedSize += compressedBuffer.length;

      // 3. Generate _thumb.webp Variant (max 200px, target <15KB)
      let thumbBuffer: Buffer;
      if (!fs.existsSync(localThumbPath)) {
        try {
          thumbBuffer = await sharp(originalBuffer)
            .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 50, effort: 4 })
            .toBuffer();
          fs.writeFileSync(localThumbPath, thumbBuffer);
        } catch {
          thumbBuffer = compressedBuffer;
        }
      } else {
        thumbBuffer = fs.readFileSync(localThumbPath);
      }
      totalThumbSize += thumbBuffer.length;

      processedCount++;

      // 4. Upload if in --upload mode
      if (isUploadMode) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            // Re-upload compressed original
            await supabase.storage.from(bucket).upload(filePath, compressedBuffer, {
              upsert: true,
              contentType: `image/${ext === 'jpg' ? 'jpeg' : ext === 'heic' ? 'jpeg' : ext}`
            });

            // Upload _thumb.webp variant
            await supabase.storage.from(bucket).upload(thumbPath, thumbBuffer, {
              upsert: true,
              contentType: 'image/webp'
            });
            break;
          } catch {
            if (attempt === 3) {
              console.warn(`[Upload Warn] ${bucket}/${filePath} failed after 3 attempts`);
            }
            await new Promise(r => setTimeout(r, 500 * attempt));
          }
        }
      }
    }));

    if (processedCount % 50 === 0 || processedCount === allFiles.length) {
      console.log(`Progress: ${processedCount}/${allFiles.length} files processed...`);
    }
  }

  const originalMB = (totalOriginalSize / 1024 / 1024).toFixed(2);
  const compressedMB = (totalCompressedSize / 1024 / 1024).toFixed(2);
  const thumbMB = (totalThumbSize / 1024 / 1024).toFixed(2);
  const savedMB = ((totalOriginalSize - totalCompressedSize) / 1024 / 1024).toFixed(2);
  const reductionPercent = totalOriginalSize > 0 ? (((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100).toFixed(1) : '0';

  console.log('\n======================================');
  console.log(`📸 PROCESSED ${processedCount} IMAGES`);
  console.log(`🖼️ THUMBNAILS GENERATED: ${processedCount} (_thumb.webp variants)`);
  console.log(`📦 Original Total Library:        ${originalMB} MB`);
  console.log(`📦 Compressed Full Library:       ${compressedMB} MB`);
  console.log(`📦 Thumbnail Library (_thumb):    ${thumbMB} MB`);
  console.log(`🎉 Total Storage Reduction:       ${savedMB} MB (${reductionPercent}%)`);
  console.log('======================================\n');
}

run().catch(console.error);
