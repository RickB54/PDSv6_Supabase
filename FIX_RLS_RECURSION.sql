-- FIX INFINITE RECURSION IN RLS POLICIES
-- The error "infinite recursion detected" happens because the Admin Policy checked the User Table,
-- which checked the Admin Policy, creating an endless loop.
-- This script fixes it by creating a "Security Definer" function that bypasses the loop.

-- 1. Create a secure function to check admin status
-- "SECURITY DEFINER" means this function runs with higher privileges, avoiding the RLS check loop
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 2. Update "app_users" policies to use the safe function
DROP POLICY IF EXISTS "Admins can read all profiles" ON app_users;
DROP POLICY IF EXISTS "Admins All Access" ON app_users;

CREATE POLICY "Admins All Access" ON app_users
    FOR ALL
    USING (
        auth.uid() = id 
        OR 
        is_admin()
    );

-- 3. Update "chemical_library" policies to use the safe function
DROP POLICY IF EXISTS "Admin All Access ChemicalLibrary" ON chemical_library;
CREATE POLICY "Admin All Access ChemicalLibrary" ON chemical_library
    FOR ALL
    USING ( is_admin() )
    WITH CHECK ( is_admin() );

-- 4. Update "service_step_chemicals" policies to use the safe function
DROP POLICY IF EXISTS "Admin All Access ServiceChemicals" ON service_step_chemicals;
CREATE POLICY "Admin All Access ServiceChemicals" ON service_step_chemicals
    FOR ALL
    USING ( is_admin() );

-- 5. Fallback for Super Admin (Hardcoded Safety Net)
DROP POLICY IF EXISTS "SuperAdmin fallback" ON app_users;
CREATE POLICY "SuperAdmin fallback" ON app_users
    FOR ALL
    USING (auth.jwt() ->> 'email' IN ('rberube54@gmail.com', 'primedetailsolutions.ma.nh@gmail.com'));
