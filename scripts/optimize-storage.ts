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
  'chemicals',
  'images',
  'gallery-images',
  'vehicle-photos',
  'supplies',
  'tools'
];

const BACKUP_DIR = path.join(process.cwd(), 'backups/pics');
const COMPRESSED_DIR = path.join(process.cwd(), 'backups/compressed_pics');

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function run() {
  const isUploadMode = process.argv.includes('--upload');
  
  if (isUploadMode) {
    console.log('⚠️ UPLOAD MODE ENABLED: Will overwrite files on Supabase ⚠️\n');
  } else {
    console.log('🔍 ANALYSIS & BACKUP MODE: Will only download and compress locally 🔍\n');
  }

  await ensureDir(BACKUP_DIR);
  await ensureDir(COMPRESSED_DIR);

  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  let filesProcessed = 0;
  let filesSkipped = 0;
  let filesAlreadySmall = 0;

  for (const bucket of BUCKETS) {
    let bucketFiles = 0;

    async function processDirectory(dirPath: string = '') {
      const { data: list, error: listError } = await supabase.storage.from(bucket).list(dirPath, { limit: 1000 });
      if (listError) return;
      if (!list) return;

      for (const item of list) {
        if (item.id === null && item.name !== '.emptyFolderPlaceholder') {
          // It's a folder
          await processDirectory(dirPath ? `${dirPath}/${item.name}` : item.name);
        } else {
          // It's a file
          if (item.name === '.emptyFolderPlaceholder') continue;
          if (item.name.includes('thumb') || item.name.startsWith('thumb_')) {
            filesSkipped++;
            continue;
          }

          // Only process images
          const ext = item.name.split('.').pop()?.toLowerCase() || '';
          if (!['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext)) {
            filesSkipped++;
            continue;
          }

          const filePath = dirPath ? `${dirPath}/${item.name}` : item.name;
          const localOriginalPath = path.join(BACKUP_DIR, bucket, filePath);
          const localCompressedPath = path.join(COMPRESSED_DIR, bucket, filePath);

          await ensureDir(path.dirname(localOriginalPath));
          await ensureDir(path.dirname(localCompressedPath));

          // 1. Download
          if (!fs.existsSync(localOriginalPath)) {
            const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(filePath);
            if (downloadError || !blob) {
              console.error(`Failed to download ${bucket}/${filePath}:`, downloadError);
              continue;
            }
            const buffer = Buffer.from(await blob.arrayBuffer());
            fs.writeFileSync(localOriginalPath, buffer);
          }

          const originalBuffer = fs.readFileSync(localOriginalPath);
          const originalSize = originalBuffer.length;

          // Skip if already small enough
          if (originalSize <= 150 * 1024) {
            filesAlreadySmall++;
            continue;
          }

          // 2. Compress
          let compressedBuffer: Buffer;
          if (!fs.existsSync(localCompressedPath)) {
            try {
              compressedBuffer = await sharp(originalBuffer)
                .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 70, force: false })
                .webp({ quality: 70, force: false })
                .png({ quality: 70, force: false })
                .toBuffer();
              
              fs.writeFileSync(localCompressedPath, compressedBuffer);
            } catch (err) {
              console.error(`Error compressing ${bucket}/${filePath}:`, err);
              continue;
            }
          } else {
            compressedBuffer = fs.readFileSync(localCompressedPath);
          }

          const compressedSize = compressedBuffer.length;
          
          totalOriginalSize += originalSize;
          totalCompressedSize += compressedSize;
          filesProcessed++;
          bucketFiles++;

          // 3. Upload (if flag is set)
          if (isUploadMode) {
             const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, compressedBuffer, {
               upsert: true,
               contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`
             });
             if (uploadError) {
               console.error(`❌ Failed to upload ${bucket}/${filePath}:`, uploadError);
             } else {
               console.log(`✅ Overwrote ${bucket}/${filePath} (-${((originalSize - compressedSize) / 1024).toFixed(1)} KB)`);
             }
          }
        }
      }
    }

    await processDirectory();
    if (bucketFiles > 0) {
      console.log(`Bucket processed: ${bucket}`);
    }
  }

  const originalMB = (totalOriginalSize / 1024 / 1024).toFixed(2);
  const compressedMB = (totalCompressedSize / 1024 / 1024).toFixed(2);
  const savedMB = ((totalOriginalSize - totalCompressedSize) / 1024 / 1024).toFixed(2);
  const reductionPercent = totalOriginalSize > 0 ? (((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100).toFixed(1) : '0';

  console.log('\n======================================');
  console.log(`📸 PROCESSED ${filesProcessed} IMAGES`);
  console.log(`⏭️ SKIPPED ${filesSkipped} non-images/thumbnails`);
  console.log(`✨ ALREADY SMALL: ${filesAlreadySmall} images under 150KB (left untouched)`);
  console.log(`📦 Original Size of Processed:   ${originalMB} MB`);
  console.log(`📦 Compressed Size of Processed: ${compressedMB} MB`);
  console.log(`🎉 Estimated Savings: ${savedMB} MB (${reductionPercent}% reduction on processed files)`);
  console.log('======================================\n');
  
  if (!isUploadMode) {
    console.log('To apply these changes and overwrite the cloud files, run:');
    console.log('npx tsx scripts/optimize-storage.ts --upload');
  }
}

run().catch(console.error);
