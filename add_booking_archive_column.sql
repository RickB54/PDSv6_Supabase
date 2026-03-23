-- Add is_archived column to bookings table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'is_archived') THEN
        ALTER TABLE public.bookings ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
