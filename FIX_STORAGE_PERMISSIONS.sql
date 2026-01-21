-- ✅ FIX STORAGE BUCKET PERMISSIONS
-- This ensures the buckets exist and have the correct RLS policies for uploading and viewing

-- 1. Create buckets if they don't exist (just in case)
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-photos', 'customer-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-media', 'blog-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow All Authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- 3. Enable RLS on storage.objects (if not already)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Create NEW Permissive Policies

-- 🔓 Allow anyone to SELECT (Read) objects (Public Buckets)
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id IN ('customer-photos', 'blog-media', 'note-images', 'chemicals') );

-- 🔐 Allow Authenticated users to INSERT (Upload)
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id IN ('customer-photos', 'blog-media', 'note-images', 'chemicals') );

-- 🔐 Allow Authenticated users to UPDATE
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id IN ('customer-photos', 'blog-media', 'note-images', 'chemicals') );

-- 🔐 Allow Authenticated users to DELETE
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id IN ('customer-photos', 'blog-media', 'note-images', 'chemicals') );

-- 5. Grant permissions to service roles
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO service_role;
GRANT SELECT ON storage.objects TO anon;

-- Verify Buckets
SELECT id, name, public FROM storage.buckets;
