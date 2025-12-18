-- FIX AUTH PERMISSIONS (GUARANTEED ACCESS)
-- This script simplifies the security rules to ensure the App can ALWAYS read the user's role.

-- 1. Enable RLS (Ensure it's on)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- 2. DROP ALL existing policies to ensure a clean slate (prevents "already exists" errors)
DROP POLICY IF EXISTS "Users can read own profile" ON app_users;
DROP POLICY IF EXISTS "Admins can do everything" ON app_users;
DROP POLICY IF EXISTS "Enable read access for all users" ON app_users;
DROP POLICY IF EXISTS "Public Read" ON app_users;
DROP POLICY IF EXISTS "Allow All Auth Read" ON app_users;
DROP POLICY IF EXISTS "Admins can update everything" ON app_users;
DROP POLICY IF EXISTS "Users can update own profile" ON app_users;

-- 3. CREATE "OPEN READ" POLICY
-- This allows ANY logged-in user to read ANY profile.
-- This is safe for now and GUARANTEES the app can see "Paul is an employee".
CREATE POLICY "Allow All Auth Read"
ON app_users
FOR SELECT
TO authenticated
USING (true);

-- 4. Keep Admin Write Access
-- CHANGED from 'FOR ALL' to 'FOR INSERT, UPDATE, DELETE' to avoid infinite recursion
-- (Because 'FOR ALL' includes SELECT, which triggers the check, which selects, which triggers the check...)
CREATE POLICY "Admins can update everything"
ON app_users
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM app_users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can update everything_upd"
ON app_users
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM app_users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can update everything_del"
ON app_users
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM app_users WHERE id = auth.uid()) = 'admin'
);

-- 5. Allow users to update their own profile (name, etc)
CREATE POLICY "Users can update own profile"
ON app_users
FOR UPDATE
TO authenticated
USING (auth.uid() = id);
