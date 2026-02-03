-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('note-images', 'note-images', true, 10485760, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Read Access
DROP POLICY IF EXISTS "Public Select Note Images" ON storage.objects;
CREATE POLICY "Public Select Note Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'note-images' );

-- 3. Allow Authenticated Uploads
DROP POLICY IF EXISTS "Auth Upload Note Images" ON storage.objects;
CREATE POLICY "Auth Upload Note Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'note-images' );

-- 4. Allow Authenticated Updates/Deletes
DROP POLICY IF EXISTS "Auth Update Note Images" ON storage.objects;
CREATE POLICY "Auth Update Note Images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'note-images' );

DROP POLICY IF EXISTS "Auth Delete Note Images" ON storage.objects;
CREATE POLICY "Auth Delete Note Images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'note-images' );
