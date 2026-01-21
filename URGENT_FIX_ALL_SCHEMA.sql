-- ========================================
-- URGENT: Complete Schema Fix for Prime Auto Detail
-- Run this ENTIRE file in Supabase SQL Editor
-- ========================================

-- 1. FIX CUSTOMERS TABLE (Prospects Update Error)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS how_found text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS how_found_other text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS condition_inside text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS condition_outside text;

-- 2. FIX VEHICLES TABLE (Media Gallery Upload Error)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS general_photos text[];
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS before_photos text[];
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS after_photos text[];
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS video_urls text[];

-- 3. FIX COMMENTS TABLE (Blog Reply Error)
ALTER TABLE learning_library_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES learning_library_comments(id) ON DELETE CASCADE;

-- ========================================
-- VERIFICATION: Check all columns exist
-- ========================================
SELECT 
    'customers' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'customers' 
  AND column_name IN ('how_found', 'how_found_other', 'condition_inside', 'condition_outside')
UNION ALL
SELECT 
    'vehicles' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'vehicles' 
  AND column_name IN ('general_photos', 'before_photos', 'after_photos', 'video_urls')
UNION ALL
SELECT 
    'learning_library_comments' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'learning_library_comments' 
  AND column_name = 'parent_id';
