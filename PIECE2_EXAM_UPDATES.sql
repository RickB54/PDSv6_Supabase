-- ========================================================================
-- Add exam tracking columns to app_users table
-- ========================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_users' AND column_name='exam_unlocked') THEN
        ALTER TABLE public.app_users ADD COLUMN exam_unlocked BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_users' AND column_name='exam_completed') THEN
        ALTER TABLE public.app_users ADD COLUMN exam_completed BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_users' AND column_name='exam_date') THEN
        ALTER TABLE public.app_users ADD COLUMN exam_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_users' AND column_name='exam_score') THEN
        ALTER TABLE public.app_users ADD COLUMN exam_score INTEGER;
    END IF;
END $$;

-- ========================================================================
-- Create a policy so that admins can read PDFs if needed
-- ========================================================================
-- Create policy if it does not exist (safeguard)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can view training documents'
    ) THEN
        CREATE POLICY "Admins can view training documents" ON storage.objects
        FOR SELECT USING (
            bucket_id = 'training-documents' AND
            EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;
