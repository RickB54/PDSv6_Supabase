-- ========================================
-- CRITICAL: ADD PHOTO COLUMNS TO VEHICLES
-- ========================================
-- Run this IMMEDIATELY in Supabase SQL Editor
-- This will allow vehicle photos to be stored and displayed

-- Add the photo columns to vehicles table
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS general_photos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS before_photos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS after_photos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_urls text[] DEFAULT '{}';

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'vehicles'
AND column_name IN ('general_photos', 'before_photos', 'after_photos', 'video_urls')
ORDER BY column_name;

-- Expected result: Should show 4 rows with the new columns
