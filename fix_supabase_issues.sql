-- -----------------------------------------------------------------------------
-- Fix Security Warning & Performance Issues (Round 3 - Final Fix)
-- -----------------------------------------------------------------------------

-- 1. FIX "SECURITY DEFINER" WARNING
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.app_users (id, email, role, name)
  VALUES (new.id, new.email, 'customer', new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 2. FIX "SLOW QUERIES" - INDEXES
-- ensuring we only use columns we KNOW exist: 'scheduled_at' and 'status' for bookings.

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON public.bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_full_name ON public.customers(full_name);

-- App Users
CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);

-- Removed 'updated_at' index as column may not exist.
-- 'scheduled_at' is the main sorting column used in the app.
