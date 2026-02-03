-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.personal_notebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.personal_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES public.personal_notebooks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.personal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES public.personal_sections(id) ON DELETE CASCADE, -- null for Quick Notes
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    versions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS on Tables
ALTER TABLE public.personal_notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for Tables (Authenticated Users Access Own Data)
DROP POLICY IF EXISTS "Users can manage their own notebooks" ON public.personal_notebooks;
CREATE POLICY "Users can manage their own notebooks" 
ON public.personal_notebooks FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own sections" ON public.personal_sections;
CREATE POLICY "Users can manage their own sections" 
ON public.personal_sections FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.personal_notes;
CREATE POLICY "Users can manage their own notes" 
ON public.personal_notes FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. Create Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('note-images', 'note-images', true, 10485760, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS Policies
-- Allow Public Read Access
DROP POLICY IF EXISTS "Public Select Note Images" ON storage.objects;
CREATE POLICY "Public Select Note Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'note-images' );

-- Allow Authenticated Full Access (Insert/Update/Delete)
DROP POLICY IF EXISTS "Auth Manage Note Images" ON storage.objects;
CREATE POLICY "Auth Manage Note Images"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'note-images' )
WITH CHECK ( bucket_id = 'note-images' );
