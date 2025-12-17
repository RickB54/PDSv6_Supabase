-- -----------------------------------------------------------------------------
-- Fix "Not enough permissions" when creating Prospects/Customers
-- -----------------------------------------------------------------------------

-- Enable RLS (already enabled likely, but good to ensure)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 1. Allow Authenticated Users (Admins/Employees) to INSERT new customers
-- This fixes the "violates row-level security policy" error when adding prospects
DROP POLICY IF EXISTS "Auth users can insert customers" ON public.customers;
CREATE POLICY "Auth users can insert customers" ON public.customers
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. Allow Authenticated Users to UPDATE customers
DROP POLICY IF EXISTS "Auth users can update customers" ON public.customers;
CREATE POLICY "Auth users can update customers" ON public.customers
FOR UPDATE USING (auth.role() = 'authenticated');

-- 3. Allow Authenticated Users to DELETE customers (optional, but good for employees)
DROP POLICY IF EXISTS "Auth users can delete customers" ON public.customers;
CREATE POLICY "Auth users can delete customers" ON public.customers
FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Allow Authenticated Users to SELECT (view) customers
-- (This might already exist via "Enable read access for all users", but let's be explicitly safe for ALL rows)
DROP POLICY IF EXISTS "Auth users can select customers" ON public.customers;
CREATE POLICY "Auth users can select customers" ON public.customers
FOR SELECT USING (auth.role() = 'authenticated');
