-- Check RLS policies on customers table
-- This might be why only one customer is showing

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'customers'
ORDER BY policyname;

-- If RLS is enabled but too restrictive, you'll see policies here
-- that might be filtering out most customers
