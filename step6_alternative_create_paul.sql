-- ALTERNATIVE: CREATE PAUL DIRECTLY IN SUPABASE
-- Use this if the Edge Function isn't working
-- Run this in Supabase SQL Editor

-- Step 1: Create Paul in auth.users
-- NOTE: This requires service role access
-- If this doesn't work, we'll need to use the Supabase Dashboard UI

-- Step 2: Insert Paul into app_users with correct role
INSERT INTO app_users (id, email, role, name, created_at, updated_at)
VALUES (
  gen_random_uuid(),  -- Generate a new UUID for Paul
  'pg0124@gmail.com',
  'employee',         -- This is the key - set role to employee
  'Paul',
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'employee',
  name = 'Paul',
  updated_at = NOW();

-- Verify Paul was created
SELECT id, email, role, name, created_at
FROM app_users
WHERE email = 'pg0124@gmail.com';

-- Expected result: One row with role='employee'
