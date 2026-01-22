-- Add ALL missing columns to vehicles table at once
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS mileage TEXT,
ADD COLUMN IF NOT EXISTS condition_inside TEXT,
ADD COLUMN IF NOT EXISTS condition_outside TEXT,
ADD COLUMN IF NOT EXISTS vin TEXT,
ADD COLUMN IF NOT EXISTS general_photos TEXT[],
ADD COLUMN IF NOT EXISTS before_photos TEXT[],
ADD COLUMN IF NOT EXISTS after_photos TEXT[],
ADD COLUMN IF NOT EXISTS video_urls TEXT[];

-- Verify all columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vehicles' 
ORDER BY column_name;
