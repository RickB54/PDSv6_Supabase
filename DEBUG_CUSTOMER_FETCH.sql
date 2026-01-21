-- Debug why only one customer is showing in the app
-- Run this to see what the app should be fetching

-- 1. Count by type (should match app logic)
SELECT 
    type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE is_archived = true) as archived_count,
    COUNT(*) FILTER (WHERE is_archived IS NULL OR is_archived = false) as active_count
FROM customers
GROUP BY type
ORDER BY type;

-- 2. Show all active customers (what should appear in Customers page)
SELECT 
    id,
    full_name,
    email,
    type,
    is_archived,
    created_at
FROM customers
WHERE type = 'customer'
  AND (is_archived IS NULL OR is_archived = false)
ORDER BY created_at DESC;

-- 3. Check if there's some weird data issue
SELECT 
    id,
    full_name,
    email,
    type,
    CASE 
        WHEN type IS NULL THEN 'TYPE IS NULL'
        WHEN type = '' THEN 'TYPE IS EMPTY'
        WHEN type = 'customer' THEN 'CORRECT'
        ELSE 'WRONG TYPE: ' || type
    END as type_check,
    CASE 
        WHEN is_archived IS NULL THEN 'NULL (treated as not archived)'
        WHEN is_archived = true THEN 'TRUE (archived)'
        WHEN is_archived = false THEN 'FALSE (not archived)'
    END as archive_status
FROM customers
WHERE type = 'customer'
LIMIT 20;
