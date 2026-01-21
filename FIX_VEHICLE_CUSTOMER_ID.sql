-- ========================================
-- FIX: Make customer_id NULLABLE in vehicles table
-- This allows vehicle media to be uploaded before customer is assigned
-- ========================================

ALTER TABLE vehicles ALTER COLUMN customer_id DROP NOT NULL;

-- Verify the change
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'vehicles' 
  AND column_name = 'customer_id';
