-- ✅ FIX: Link orphaned vehicles to customers
-- These vehicles have photos butcustomer_id is NULL, so they don't show in the gallery

-- STEP 1: See the orphaned vehicles and decide which customer to assign each to
SELECT 
    v.id as vehicle_id,
    v.year,
    v.make,
    v.model,
    array_length(v.general_photos, 1) as photos,
    '--- Assign to which customer? ---' as action
FROM vehicles v
WHERE v.customer_id IS NULL
  AND (
    array_length(v.general_photos, 1) > 0 OR
    array_length(v.before_photos, 1) > 0 OR
    array_length(v.after_photos, 1) > 0
  );

-- STEP 2: Link them! (Replace 'Customer Name' with actual names)
-- Example: Link all Toyota Venza to "Linda Thompson"

-- UPDATE vehicles 
-- SET customer_id = (SELECT id FROM customers WHERE full_name = 'Linda Thompson' LIMIT 1)
-- WHERE make = 'Toyota' AND model = 'Venza' AND customer_id IS NULL;

-- UPDATE vehicles 
-- SET customer_id = (SELECT id FROM customers WHERE full_name = 'Customer Name' LIMIT 1)
-- WHERE make = 'Ram' AND model = '1500' AND customer_id IS NULL;

-- Etc. for each orphaned vehicle...

-- STEP 3: Verify they're linked
SELECT 
    c.full_name as customer,
    v.year,
    v.make,
    v.model,
    array_length(v.general_photos, 1) + 
    array_length(v.before_photos, 1) + 
    array_length(v.after_photos, 1) as total_photos
FROM vehicles v
JOIN customers c ON v.customer_id = c.id
WHERE 
    array_length(v.general_photos, 1) > 0 OR
    array_length(v.before_photos, 1) > 0 OR
    array_length(v.after_photos, 1) > 0;
