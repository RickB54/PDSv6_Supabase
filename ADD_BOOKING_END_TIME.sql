-- ADD END_TIME COLUMN TO BOOKINGS
-- This is required to fix the "scheduling overlap" issue where morning bookings block the whole afternoon.

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

-- Refresh the PostgREST schema cache (Supabase usually does this automatically, but this ensures it)
NOTIFY pgrst, 'reload schema';
