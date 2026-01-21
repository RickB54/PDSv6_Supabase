-- Add missing columns to learning_library_items table
ALTER TABLE public.learning_library_items 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

ALTER TABLE public.learning_library_items 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Ensure the blog assets are publicly accessible
-- If we use 'customer-photos' for the blog, it needs to be public for guests to see images
UPDATE storage.buckets 
SET public = true 
WHERE id = 'customer-photos';

-- Alternatively, creating a dedicated public bucket for the blog is cleaner
INSERT INTO storage.buckets (id, name, public) 
VALUES ('blog-assets', 'blog-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Grant access to the new bucket
DROP POLICY IF EXISTS "Public Access to Blog Assets" ON storage.objects;
CREATE POLICY "Public Access to Blog Assets"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'blog-assets' );

DROP POLICY IF EXISTS "Auth Users Manage Blog Assets" ON storage.objects;
CREATE POLICY "Auth Users Manage Blog Assets"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'blog-assets' )
WITH CHECK ( bucket_id = 'blog-assets' );
