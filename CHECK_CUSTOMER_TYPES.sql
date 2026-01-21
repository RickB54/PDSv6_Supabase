-- Check what customer types exist in the database
-- This will help us understand why the Customers/Prospects pages are empty

SELECT 
    type,
    COUNT(*) as count,
    array_agg(full_name) FILTER (WHERE full_name IS NOT NULL) as sample_names
FROM customers
GROUP BY type
ORDER BY count DESC;

-- Also check if there are customers with NULL or empty type
SELECT 
    id,
    full_name,
    email,
    type,
    CASE 
        WHEN type IS NULL THEN 'NULL'
        WHEN type = '' THEN 'EMPTY STRING'
        ELSE type
    END as type_status
FROM customers
ORDER BY created_at DESC
LIMIT 20;
