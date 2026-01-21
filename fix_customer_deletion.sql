-- FIX CUSTOMER DELETION ISSUES
-- This script enables ON DELETE CASCADE for foreign keys linked to customers.
-- This allows you to delete a customer and automatically remove their vehicles, bookings, and invoices.
-- Run this in the Supabase SQL Editor.

-- 1. FIX VEHICLES CASCADE
ALTER TABLE public.vehicles
DROP CONSTRAINT IF EXISTS vehicles_customer_id_fkey,
ADD CONSTRAINT vehicles_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE CASCADE;

-- 2. FIX BOOKINGS CASCADE
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey,
ADD CONSTRAINT bookings_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE CASCADE;

-- 3. FIX INVOICES CASCADE
ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey,
ADD CONSTRAINT invoices_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE CASCADE;

-- 4. FIX ESTIMATES CASCADE
ALTER TABLE public.estimates
DROP CONSTRAINT IF EXISTS estimates_customer_id_fkey,
ADD CONSTRAINT estimates_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE CASCADE;

-- 5. ENSURE ADMINS HAVE PERMISSION TO DELETE EVERYTHING
-- This uses the robust is_admin() function from previous fixes
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Apply "Admins can do everything" to all relevant tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name IN ('customers', 'vehicles', 'bookings', 'invoices', 'estimates', 'app_users')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admins All Access %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Admins All Access %I" ON public.%I FOR ALL USING (public.is_admin())', t, t);
    END LOOP;
END $$;

-- 6. VERIFY
SELECT 'Success! Cascading deletes and Admin permissions are now configured.' as status;
