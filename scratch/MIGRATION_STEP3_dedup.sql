-- MIGRATION STEP 3: Link existing inventory items to the new library items
-- This script fixes the typos in your inventory and ensures they don't show up as duplicates.

-- 1. Fix "Leather Conditionaer" typo and link it to the real "Leather Conditioner" (a1000022...)
UPDATE chemicals 
SET chemical_library_id = 'a1000022-0000-0000-0000-000000000022',
    name = 'Leather Conditioner'
WHERE name ILIKE '%Conditionaer%';

-- 2. Link "Total Interior" to "Total Interior Cleaner & Protectant" (a1000034...)
UPDATE chemicals 
SET chemical_library_id = 'a1000034-0000-0000-0000-000000000034',
    name = 'Total Interior Cleaner & Protectant'
WHERE name ILIKE 'Total Interior';

-- 3. Link "Supreme Wash & Wax" to the library version (a1000032...)
UPDATE chemicals 
SET chemical_library_id = 'a1000032-0000-0000-0000-000000000032'
WHERE name ILIKE '%Supreme Wash & Wax%';

-- 4. Link "Leather Cleaner" to the library version (a1000021...)
UPDATE chemicals 
SET chemical_library_id = 'a1000021-0000-0000-0000-000000000021'
WHERE name ILIKE '%Leather Cleaner%';

-- 5. Auto-link any other exact matches just in case
UPDATE chemicals c
SET chemical_library_id = l.id
FROM chemical_library l
WHERE lower(c.name) = lower(l.name) 
  AND c.chemical_library_id IS NULL;

-- 6. Link cases where the inventory name is completely inside the library name (like 'APC' in 'APC - All Purpose Cleaner')
UPDATE chemicals c
SET chemical_library_id = l.id
FROM chemical_library l
WHERE lower(l.name) LIKE '%' || lower(c.name) || '%' 
  AND c.chemical_library_id IS NULL 
  AND length(c.name) > 5;
