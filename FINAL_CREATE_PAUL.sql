-- ============================================
-- SIMPLEST SOLUTION - JUST RUN THIS ONE SCRIPT
-- ============================================
-- This will create Paul with a RANDOM password
-- You'll reset it later using "Forgot Password"
-- ============================================

-- Step 1: Create Paul in auth.users with a random password
-- (This uses Supabase's admin function)
SELECT extensions.create_user(
  'pg0124@gmail.com',  -- email
  'TempPassword123!',  -- temporary password (change this later)
  jsonb_build_object(
    'email_confirm', true,
    'role', 'employee',
    'name', 'Paul'
  )
);

-- Step 2: Add Paul to app_users
INSERT INTO app_users (id, email, role, name, created_at, updated_at)
SELECT 
  id,
  'pg0124@gmail.com',
  'employee',
  'Paul',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'pg0124@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'employee',
  name = 'Paul',
  updated_at = NOW();

-- Step 3: Verify Paul was created
SELECT id, email, role, name FROM app_users WHERE email = 'pg0124@gmail.com';

-- ============================================
-- DONE! Paul is created!
-- ============================================
-- Login credentials:
-- Email: pg0124@gmail.com
-- Password: TempPassword123!
--
-- IMPORTANT: Have Paul change his password after first login!
-- ============================================
