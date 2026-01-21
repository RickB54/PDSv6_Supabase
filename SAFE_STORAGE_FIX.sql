-- 🛡️ SAFE STORAGE POLICY FIX
-- This avoids system table ownership errors by using the public API

-- 1. Ensure the bucket is public (This often works even without table ownership)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'customer-photos';

-- 2. Add public read policy if it doesn't exist
-- We use a DO block to prevent "already exists" errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Public Access'
    ) THEN
        CREATE POLICY "Public Access" ON storage.objects
        FOR SELECT USING (bucket_id = 'customer-photos');
    END IF;
END
$$;

-- 3. Add authenticated upload policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Authenticated Upload'
    ) THEN
        CREATE POLICY "Authenticated Upload" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'customer-photos');
    END IF;
END
$$;
