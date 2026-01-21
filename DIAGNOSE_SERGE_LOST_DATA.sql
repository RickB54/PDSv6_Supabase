-- 🔎 DETAILED INVESTIGATION OF SERGE MICHAUD
-- This checks if Serge has legacy vehicle data or if he's unlinked from the vehicles table

-- 1. Get ALL columns for Serge
SELECT * FROM customers WHERE full_name ILIKE '%Serge%' OR full_name ILIKE '%Michaud%';

-- 2. Check for ANY vehicle that mentions Serge's old ID or name
-- (This helps if the ID changed but we can find the vehicle by other means)
SELECT v.* 
FROM vehicles v
WHERE v.customer_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = v.customer_id);

-- 3. Check if Serge has many-to-many or other issues
-- (Sometimes there's a join table if the schema was different before)
SELECT * FROM information_schema.tables WHERE table_name ILIKE '%customer%' OR table_name ILIKE '%vehicle%';
