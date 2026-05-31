-- MIGRATION STEP 5: Bulletproof linking script
-- We are using highly generic wildcards to guarantee these items get linked
-- regardless of exact spelling, spaces, or brand prefixes in your inventory.

-- 1. APC
UPDATE chemicals SET chemical_library_id = 'a1000002-0000-0000-0000-000000000002' WHERE name ILIKE '%APC%';

-- 2. Armor All Wheel & Tire
UPDATE chemicals SET chemical_library_id = 'a1000005-0000-0000-0000-000000000005' WHERE name ILIKE '%Armor All%' AND name ILIKE '%Wheel%';

-- 3. Cerakote Platinum
UPDATE chemicals SET chemical_library_id = 'a1000007-0000-0000-0000-000000000007' WHERE name ILIKE '%Platinum%Rapid%';

-- 4. Ceramic Acrylic Black Wax
UPDATE chemicals SET chemical_library_id = 'a1000008-0000-0000-0000-000000000008' WHERE name ILIKE '%Acrylic%Black%';

-- 5. Dark Fury
UPDATE chemicals SET chemical_library_id = 'a1000012-0000-0000-0000-000000000012' WHERE name ILIKE '%Dark%Fury%';

-- 6. EZ Shine
UPDATE chemicals SET chemical_library_id = 'a1000015-0000-0000-0000-000000000015' WHERE name ILIKE '%EZ%Shine%';

-- 7. Muscle Magic
UPDATE chemicals SET chemical_library_id = 'a1000023-0000-0000-0000-000000000023' WHERE name ILIKE '%Muscle%Magic%';

-- 8. Total Interior
UPDATE chemicals SET chemical_library_id = 'a1000034-0000-0000-0000-000000000034' WHERE name ILIKE '%Total%Interior%';

-- 9. Zap It
UPDATE chemicals SET chemical_library_id = 'a1000037-0000-0000-0000-000000000037' WHERE name ILIKE '%Zap%It%';
