-- FIX AUTHENTICATION & ROLE PERMISSIONS
-- Run this in Supabase SQL Editor

-- 1. Ensure app_users table is secure but accessible
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies (Clean Slate)
DROP POLICY IF EXISTS "Users can see own profile" ON app_users;
DROP POLICY IF EXISTS "Users can read own profile" ON app_users;
DROP POLICY IF EXISTS "Users can update own profile" ON app_users;
DROP POLICY IF EXISTS "Users can insert own profile" ON app_users;
DROP POLICY IF EXISTS "Admins can view all" ON app_users;
DROP POLICY IF EXISTS "Admins can do everything" ON app_users;
DROP POLICY IF EXISTS "Employees can view all" ON app_users;

-- 3. Create Functional Policies

-- A. ALLOW READ: Users must be able to read their own role to log in correctly.
CREATE POLICY "Users can read own profile"
ON app_users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- B. ALLOW UPSERT: Users are upserted on login in auth.ts
CREATE POLICY "Users can update own profile"
ON app_users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON app_users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- C. ALLOW ADMINS to Manage Users (Crucial for Admin Dashboard)
CREATE POLICY "Admins can do everything"
ON app_users FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);

-- 4. FIX "Paul" specifically (Optional but helpful if he got stuck)
-- Reset anyone who isn't admin back to 'employee' if their email matches known pattern?
-- Better: Let the user manually fix roles via Dashboard once they can log in.

-- 5. RELOAD
NOTIFY pgrst, 'reload config';
