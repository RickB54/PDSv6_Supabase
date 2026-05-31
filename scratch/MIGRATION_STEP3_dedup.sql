-- MIGRATION STEP 3: Link EXISTING inventory items to the library metadata
-- This will ensure the descriptions are attached to your existing items (with pictures)
-- and remove the duplicates that got created from the mismatch.

-- 1. APC (Meguiar's)
UPDATE chemicals SET chemical_library_id = 'a1000002-0000-0000-0000-000000000002' WHERE name ILIKE 'APC%';

-- 2. Carpet Bomber
UPDATE chemicals SET chemical_library_id = 'a1000006-0000-0000-0000-000000000006' WHERE name ILIKE 'Carpet Bomber%';

-- 3. Ceramic Coating (Cerakote)
UPDATE chemicals SET chemical_library_id = 'a1000007-0000-0000-0000-000000000007' WHERE name ILIKE 'Ceramic Coating (Cerakote)%';

-- 4. Interior Detailer and Protectant
UPDATE chemicals SET chemical_library_id = 'a1000019-0000-0000-0000-000000000019' WHERE name ILIKE 'Interior Detailer and Protectant%';

-- 5. Leather Conditioner
UPDATE chemicals SET chemical_library_id = 'a1000022-0000-0000-0000-000000000022' WHERE name ILIKE 'Leather Condition%';

-- 6. ONR (Optimum No Rinse)
UPDATE chemicals SET chemical_library_id = 'a1000024-0000-0000-0000-000000000024' WHERE name ILIKE 'ONR%';

-- 7. P&S Xpress Interior Cleaner
UPDATE chemicals SET chemical_library_id = 'a1000025-0000-0000-0000-000000000025' WHERE name ILIKE 'P & S Xpress%' OR name ILIKE 'P&S Xpress%';

-- 8. Rain X
UPDATE chemicals SET chemical_library_id = 'a1000028-0000-0000-0000-000000000028' WHERE name ILIKE 'Rain X%' OR name ILIKE 'Rain-X%';

-- 9. Terminator
UPDATE chemicals SET chemical_library_id = 'a1000033-0000-0000-0000-000000000033' WHERE name ILIKE 'Terminator%';

-- 10. Total Interior
UPDATE chemicals SET chemical_library_id = 'a1000034-0000-0000-0000-000000000034' WHERE name ILIKE 'Total Interior%';

-- 11. Supreme Wash & Wax
UPDATE chemicals SET chemical_library_id = 'a1000032-0000-0000-0000-000000000032' WHERE name ILIKE 'Supreme Wash & Wax%';

-- 12. Leather Cleaner
UPDATE chemicals SET chemical_library_id = 'a1000021-0000-0000-0000-000000000021' WHERE name ILIKE 'Leather Cleaner%';

-- 13. Safety pass: link any exact matches we might have missed
UPDATE chemicals c
SET chemical_library_id = l.id
FROM chemical_library l
WHERE lower(c.name) = lower(l.name) 
  AND c.chemical_library_id IS NULL;
