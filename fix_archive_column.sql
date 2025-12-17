-- Add is_archived column to customers table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'is_archived') THEN
        ALTER TABLE public.customers ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
