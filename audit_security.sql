-- SECURITY AUDIT SCRIPT
-- Lists all tables, whether RLS is enabled, and their policies.

-- 1. Check RLS Status per Table
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public';

-- 2. List All Active Policies
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
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 3. Check app_users columns for PII
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'app_users';
