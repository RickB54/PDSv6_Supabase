-- NUCLEAR RLS & PERMISSIONS RESET
-- This script wipes all restrictive policies and ensures the "authenticated" role has full access.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO FIX INVOICE CREATION, DELETION, AND BACKUPS.

-- 1. DROP ALL EXISTING POLICIES TO START FRESH
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'customers', 'vehicles', 'bookings', 'invoices', 'estimates', 
            'app_users', 'authorized_users', 'backup_metadata', 'availability_blocks',
            'content_vehicle_types', 'content_faqs', 'content_testimonials', 
            'content_about', 'content_contact', 'content_services_meta',
            'packages', 'add_ons', 'pricing_config', 'team_messages',
            'personal_notes', 'personal_sections', 'personal_notebooks', 
            'library_items', 'learning_library_items', 'learning_library_comments'
        )
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 2. SCHEMA UPGRADES (Ensure blog columns exist)
-- This fixes the "Could not find column is_published" error
ALTER TABLE public.learning_library_items ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE public.learning_library_items ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.learning_library_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. ENABLE RLS (Required for security, but we will make it permissive for logged-in users)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_library_comments ENABLE ROW LEVEL SECURITY;

-- 4. CREATE UNIVERSAL PERMISSIVE POLICIES
-- This allows any logged-in user (Admin/Employee) to view, create, edit, and delete records.
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name IN (
                'customers', 'vehicles', 'bookings', 'invoices', 'estimates', 
                'app_users', 'authorized_users', 'backup_metadata', 'availability_blocks',
                'content_vehicle_types', 'content_faqs', 'content_testimonials', 
                'content_about', 'content_contact', 'content_services_meta',
                'packages', 'add_ons', 'pricing_config', 'team_messages',
                'personal_notes', 'personal_sections', 'personal_notebooks', 
                'library_items', 'learning_library_items', 'learning_library_comments'
             )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('CREATE POLICY "Master Access %I" ON public.%I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'')', t, t);
    END LOOP;
END $$;

-- Public read access for verified/published blog items (for Guests)
DROP POLICY IF EXISTS "Guest Read Blogs" ON public.learning_library_items;
CREATE POLICY "Guest Read Blogs" ON public.learning_library_items
FOR SELECT TO public
USING (is_published = true AND is_verified = true);

-- 5. ROBUST ADMIN CHECK FUNCTION (With hardcoded safety net)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
  OR (auth.jwt() ->> 'email' IN ('rberube54@gmail.com', 'primedetailsolutions.ma.nh@gmail.com'));
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. STORAGE BUCKET POLICIES (Fixes "new row violates row-level security policy" for backups & blog)
-- Ensure buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app-backups', 'app-backups', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('customer-photos', 'customer-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('blog-assets', 'blog-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Allow Auth Users to Backup" ON storage.objects;
DROP POLICY IF EXISTS "Allow Auth Users to Manage Customer Photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow Auth Users to Manage Blog Assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Blog Assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Customer Photos" ON storage.objects;

-- Create storage access policies (Authenticated users can manage everything)
CREATE POLICY "Allow Auth Users to Backup"
ON storage.objects FOR ALL TO authenticated
USING ( bucket_id = 'app-backups' )
WITH CHECK ( bucket_id = 'app-backups' );

CREATE POLICY "Allow Auth Users to Manage Customer Photos"
ON storage.objects FOR ALL TO authenticated
USING ( bucket_id = 'customer-photos' )
WITH CHECK ( bucket_id = 'customer-photos' );

CREATE POLICY "Allow Auth Users to Manage Blog Assets"
ON storage.objects FOR ALL TO authenticated
USING ( bucket_id = 'blog-assets' )
WITH CHECK ( bucket_id = 'blog-assets' );

-- Public read access for blog and customer photos (to see image thumbnails)
CREATE POLICY "Public Access to Blog Assets"
ON storage.objects FOR SELECT TO public
USING ( bucket_id = 'blog-assets' );

CREATE POLICY "Public Access to Customer Photos"
ON storage.objects FOR SELECT TO public
USING ( bucket_id = 'customer-photos' );

-- 7. VERIFY CASCADING DELETES ARE CONFIGURED
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_customer_id_fkey, ADD CONSTRAINT vehicles_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey, ADD CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey, ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
ALTER TABLE public.estimates DROP CONSTRAINT IF EXISTS estimates_customer_id_fkey, ADD CONSTRAINT estimates_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

-- FINAL OUTPUT
SELECT 'SUCCESS: All RLS policies have been reset, columns added, and Storage permissions fixed.' as status;
