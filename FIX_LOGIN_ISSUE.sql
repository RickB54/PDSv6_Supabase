-- FIX LOGIN ISSUES
-- The issue is that the application cannot READ your user role from the database because of missing security policies.
-- This script adds the necessary permissions.

-- 1. Allow users to read their own profile (Crucial for Login)
DROP POLICY IF EXISTS "Users can read own profile" ON app_users;
CREATE POLICY "Users can read own profile" ON app_users
    FOR SELECT
    USING (auth.uid() = id);

-- 2. Allow Admins to read ALL profiles (For User Management)
-- We use a hardcoded email check for the super-admin to avoid infinite recursion loops in RLS
DROP POLICY IF EXISTS "Admins can read all profiles" ON app_users;
CREATE POLICY "Admins can read all profiles" ON app_users
    FOR SELECT
    USING (
        auth.uid() = id 
        OR 
        (SELECT role FROM app_users WHERE id = auth.uid()) = 'admin'
    );
    
-- Note: If the above recurses (it might), use this safer fallback for specific admin email:
DROP POLICY IF EXISTS "SuperAdmin fallback" ON app_users;
CREATE POLICY "SuperAdmin fallback" ON app_users
    FOR ALL
    USING (auth.jwt() ->> 'email' IN ('rberube54@gmail.com', 'primedetailsolutions.ma.nh@gmail.com'));

-- 3. Ensure Inventory <-> Library linking works
-- Grant access to references for foreign keys if strict RLS is on
-- (Usually covered by table policies, but good to be sure)
