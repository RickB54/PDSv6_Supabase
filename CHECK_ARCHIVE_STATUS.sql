-- Check is_archived status of all customers
SELECT 
    full_name,
    type,
    is_archived,
    CASE 
        WHEN is_archived IS NULL THEN 'NULL (will show as active)'
        WHEN is_archived = true THEN 'TRUE (archived)'
        WHEN is_archived = false THEN 'FALSE (active)'
    END as archive_status
FROM customers
WHERE type = 'customer'
ORDER BY full_name
LIMIT 20;
