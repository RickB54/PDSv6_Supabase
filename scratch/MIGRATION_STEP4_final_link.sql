-- MIGRATION STEP 4: Final targeted linking for the last remaining items
-- This explicitly targets the specific names you listed to permanently link them
-- to their descriptions and remove the final duplicate.

-- 1. APC (Meguiar's)
UPDATE chemicals SET chemical_library_id = 'a1000002-0000-0000-0000-000000000002' WHERE name ILIKE 'APC%';

-- 2. Armor All Wheel & Tire Cleaner
UPDATE chemicals SET chemical_library_id = 'a1000005-0000-0000-0000-000000000005' WHERE name ILIKE '%Armor All Wheel & Tire Cleaner%';

-- 3. CERAKOTE Platinum Rapid Ceramic Paint Sealant Spray (Fixes the duplicate!)
UPDATE chemicals SET chemical_library_id = 'a1000007-0000-0000-0000-000000000007' WHERE name ILIKE '%CERAKOTE%Platinum%';

-- 4. Ceramic Acrylic Black Wax
UPDATE chemicals SET chemical_library_id = 'a1000008-0000-0000-0000-000000000008' WHERE name ILIKE '%Ceramic Acrylic Black Wax%';

-- 5. Dark Fury
UPDATE chemicals SET chemical_library_id = 'a1000012-0000-0000-0000-000000000012' WHERE name ILIKE 'Dark Fury%';

-- 6. EZ Shine
UPDATE chemicals SET chemical_library_id = 'a1000015-0000-0000-0000-000000000015' WHERE name ILIKE 'EZ Shine%';

-- 7. Muscle Magic
UPDATE chemicals SET chemical_library_id = 'a1000023-0000-0000-0000-000000000023' WHERE name ILIKE 'Muscle Magic%';

-- 8. Total Interior
UPDATE chemicals SET chemical_library_id = 'a1000034-0000-0000-0000-000000000034' WHERE name ILIKE 'Total Interior%';

-- 9. Zap It
UPDATE chemicals SET chemical_library_id = 'a1000037-0000-0000-0000-000000000037' WHERE name ILIKE 'Zap It%';
