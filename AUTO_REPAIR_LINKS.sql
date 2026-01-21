-- 🤖 AUTO-REPAIR DISCONNETED VEHICLES
-- This happens after a restore if ID numbers (UUIDs) change
-- It searches for vehicles with "Old IDs" (orphans) and tries to match them to names

-- 1. SHOW ME THE ORPHANS (Step 1 - Just check)
SELECT 
    v.id as vehicle_id,
    v.make, v.model,
    v.customer_id as old_customer_id,
    c.full_name as matches_potential_customer
FROM vehicles v
LEFT JOIN customers c ON v.customer_id = c.id
WHERE v.customer_id IS NOT NULL 
  AND c.id IS NULL; -- Vehicle points to an ID that doesn't exist anymore

-- 2. RE-LINK SERGE (Step 2 - Safe Fix)
UPDATE vehicles 
SET customer_id = (SELECT id FROM customers WHERE full_name ILIKE '%Serge Michaud%' LIMIT 1)
WHERE make = 'Ram' AND model = '1500' AND customer_id IS NULL;

-- 3. LINK ANY OTHER RAM TO SERGE (If he has many)
UPDATE vehicles 
SET customer_id = (SELECT id FROM customers WHERE full_name ILIKE '%Serge Michaud%' LIMIT 1)
WHERE make = 'Ram' AND (customer_id IS NULL OR customer_id NOT IN (SELECT id FROM customers));

-- 4. VERIFY
SELECT c.full_name, v.make, v.model, v.year
FROM vehicles v
JOIN customers c ON v.customer_id = c.id
WHERE c.full_name ILIKE '%Serge%';
