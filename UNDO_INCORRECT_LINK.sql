-- 🧹 UNDO INCORRECT LINKAGE
-- Run this to clear the 2019 Ram 1500 from Serge Michaud's profile

UPDATE vehicles 
SET customer_id = NULL 
WHERE make = 'Ram' AND model = '1500' AND year = 2019;

-- Verify it's back to NULL (Unassigned)
SELECT id, make, model, year, customer_id 
FROM vehicles 
WHERE make = 'Ram';
