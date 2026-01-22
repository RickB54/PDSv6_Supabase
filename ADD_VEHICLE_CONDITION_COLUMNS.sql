-- Add missing condition columns to vehicles table
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS condition_inside TEXT,
ADD COLUMN IF NOT EXISTS condition_outside TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vehicles' 
AND column_name IN ('condition_inside', 'condition_outside');
