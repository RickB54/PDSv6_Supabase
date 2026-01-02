-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chemicals', 'chemicals', true, 10485760, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Read Access (so images show on cards)
DROP POLICY IF EXISTS "Public Select Chemicals" ON storage.objects;
CREATE POLICY "Public Select Chemicals"
ON storage.objects FOR SELECT
USING ( bucket_id = 'chemicals' );

-- 3. Allow Authenticated Uploads (so you can upload)
DROP POLICY IF EXISTS "Auth Upload Chemicals" ON storage.objects;
CREATE POLICY "Auth Upload Chemicals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'chemicals' );

-- 4. Allow Authenticated Updates/Deletes (optional, for replacing images)
DROP POLICY IF EXISTS "Auth Update Chemicals" ON storage.objects;
CREATE POLICY "Auth Update Chemicals"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'chemicals' );

DROP POLICY IF EXISTS "Auth Delete Chemicals" ON storage.objects;
CREATE POLICY "Auth Delete Chemicals"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'chemicals' );
