-- FIX STORAGE AND PRINT INFRASTRUCTURE
-- 1. Create Storage Bucket for Chemical Images
-- Note: 'storage' schema operations usually require superuser or specific API calls.
-- If this fails in SQL Editor, please CREATE BUCKET 'chemical-images' via the Supabase Dashboard -> Storage.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('chemical-images', 'chemical-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies (Allow anyone to read, Authenticated to upload)
-- POLICY: Public Read
DROP POLICY IF EXISTS "Public Access Chemical Images" ON storage.objects;
CREATE POLICY "Public Access Chemical Images" ON storage.objects
  FOR SELECT
  USING ( bucket_id = 'chemical-images' );

-- POLICY: Auth Upload (Admin/Employee)
DROP POLICY IF EXISTS "Auth Upload Chemical Images" ON storage.objects;
CREATE POLICY "Auth Upload Chemical Images" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'chemical-images' AND
    auth.role() = 'authenticated'
  );

-- POLICY: Auth Delete/Update (Admin only - simplification: auth users can manage for MVP)
DROP POLICY IF EXISTS "Auth Manage Chemical Images" ON storage.objects;
CREATE POLICY "Auth Manage Chemical Images" ON storage.objects
  FOR DELETE
  USING ( bucket_id = 'chemical-images' AND auth.role() = 'authenticated' );

-- 3. (Optional) Any specific Print settings managed via DB? No, purely CSS.
