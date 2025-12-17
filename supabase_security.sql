-- -----------------------------------------------------------------------------
-- Supabase Security & Performance Fixes
-- Run this script in the Supabase SQL Editor to resolve the reported issues.
-- -----------------------------------------------------------------------------

-- 1. FIX "PAUL" ISSUE (Allow Users to Update Their Own Profile)
-- Enable RLS on app_users
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read profiles (needed for team chat/assigning)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_users;
CREATE POLICY "Enable read access for all users" ON public.app_users
FOR SELECT USING (true);

-- Allow users to update their own profile (Fixes name reversion)
DROP POLICY IF EXISTS "Users can update own profile" ON public.app_users;
CREATE POLICY "Users can update own profile" ON public.app_users
FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (Fixes signup/first login)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.app_users;
CREATE POLICY "Users can insert own profile" ON public.app_users
FOR INSERT WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 2. FIX "TABLE IS PUBLIC" security warnings
-- We enable RLS and allow public read, but restrict writes to authenticated users.
-- -----------------------------------------------------------------------------

-- Packages
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read packages" ON public.packages;
CREATE POLICY "Public read packages" ON public.packages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth write packages" ON public.packages;
CREATE POLICY "Auth write packages" ON public.packages FOR ALL USING (auth.role() = 'authenticated');

-- Add-ons
ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read add_ons" ON public.add_ons;
CREATE POLICY "Public read add_ons" ON public.add_ons FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth write add_ons" ON public.add_ons;
CREATE POLICY "Auth write add_ons" ON public.add_ons FOR ALL USING (auth.role() = 'authenticated');

-- Team Messages
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read team messages" ON public.team_messages;
CREATE POLICY "Read team messages" ON public.team_messages FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Insert team messages" ON public.team_messages;
CREATE POLICY "Insert team messages" ON public.team_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth delete messages" ON public.team_messages;
CREATE POLICY "Auth delete messages" ON public.team_messages FOR DELETE USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 3. FIX "SLOW QUERIES" (Missing Indexes)
-- Adding indexes to foreign keys to speed up joins
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON public.vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON public.estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_vehicle_id ON public.estimates(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_sender ON public.team_messages(sender_email);
