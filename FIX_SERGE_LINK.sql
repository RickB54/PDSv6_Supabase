-- 🛠️ FIX SERGE'S VEHICLE LINKAGE
-- Run this if Serge is showing "No Vehicles" in the upload modal

-- 1. Find Serge's actual ID
SELECT id, full_name FROM customers WHERE full_name ILIKE '%Serge%';

-- 2. Find any vehicles that MIGHT belong to Serge (e.g., matching a make/model you know he has)
-- Replace 'Make' and 'Model' if you know them 
SELECT * FROM vehicles WHERE customer_id IS NULL;

-- 3. Link Serge (Replace 'SERGE_ID' with the ID from step 1 and 'VEHICLE_ID' from step 2)
-- UPDATE vehicles SET customer_id = 'SERGE_ID' WHERE id = 'VEHICLE_ID';

-- OR if you just want to link all "Ram" vehicles to Serge:
-- UPDATE vehicles SET customer_id = (SELECT id FROM customers WHERE full_name ILIKE '%Serge%' LIMIT 1) WHERE make = 'Ram' AND customer_id IS NULL;
