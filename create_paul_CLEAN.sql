-- CREATE PAUL - SIMPLE SQL METHOD
-- Copy ONLY this file and run it in Supabase SQL Editor

-- This script will:
-- 1. Get Paul's ID from auth.users (you created him in Authentication > Users)
-- 2. Insert him into app_users with role='employee'
-- 3. Verify it worked

DO $$
DECLARE
  paul_id UUID;
BEGIN
  -- Get Paul's ID from auth.users
  SELECT id INTO paul_id FROM auth.users WHERE email = 'pg0124@gmail.com';
  
  -- If Paul doesn't exist in auth.users, raise an error
  IF paul_id IS NULL THEN
    RAISE EXCEPTION 'Paul not found in auth.users. Create him in Authentication > Users first!';
  END IF;
  
  -- Insert Paul into app_users with role='employee'
  INSERT INTO app_users (id, email, role, name, created_at, updated_at)
  VALUES (
    paul_id,
    'pg0124@gmail.com',
    'employee',
    'Paul',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'employee',
    name = 'Paul',
    updated_at = NOW();
  
  RAISE NOTICE 'Paul created successfully with role=employee';
END $$;

-- Verify Paul was created correctly
SELECT id, email, role, name, created_at 
FROM app_users 
WHERE email = 'pg0124@gmail.com';

-- Expected result: One row with role='employee'
