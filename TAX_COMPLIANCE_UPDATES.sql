-- Add multi-state tax compliance columns to app_users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_users' AND column_name='state_of_residence') THEN
        ALTER TABLE public.app_users ADD COLUMN state_of_residence TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_users' AND column_name='state_of_work') THEN
        ALTER TABLE public.app_users ADD COLUMN state_of_work TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_users' AND column_name='tax_docs_status') THEN
        ALTER TABLE public.app_users ADD COLUMN tax_docs_status JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Create employee-documents storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for employee-documents (Admin only access)
DO $$
BEGIN
    -- Allow admins to insert documents
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload employee documents'
    ) THEN
        CREATE POLICY "Admins can upload employee documents" ON storage.objects
        FOR INSERT WITH CHECK (
            bucket_id = 'employee-documents' AND
            EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

    -- Allow admins to select/read documents
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can view employee documents'
    ) THEN
        CREATE POLICY "Admins can view employee documents" ON storage.objects
        FOR SELECT USING (
            bucket_id = 'employee-documents' AND
            EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

    -- Allow admins to delete documents
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete employee documents'
    ) THEN
        CREATE POLICY "Admins can delete employee documents" ON storage.objects
        FOR DELETE USING (
            bucket_id = 'employee-documents' AND
            EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;
