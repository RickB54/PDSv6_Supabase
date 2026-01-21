-- 🔍 INVESTIGATE SERGE AND HIS VEHICLES
-- 1. Check Serge's ID
SELECT id, full_name, email FROM customers WHERE full_name ILIKE '%Serge%';

-- 2. Check ALL vehicles and if they have a customer_id
SELECT id, make, model, year, customer_id FROM vehicles;

-- 3. Check if Serge has vehicles linked to his ID
SELECT v.* 
FROM vehicles v
JOIN customers c ON v.customer_id = c.id
WHERE c.full_name ILIKE '%Serge%';

-- 4. Check for orphaned vehicles that look like they belong to Serge
SELECT * FROM vehicles WHERE make ILIKE '%Ram%' OR model ILIKE '%1500%';
