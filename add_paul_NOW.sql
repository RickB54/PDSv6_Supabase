-- PAUL EXISTS IN AUTH.USERS - NOW ADD HIM TO APP_USERS

-- Step 1: Verify Paul is in auth.users
SELECT id, email, created_at FROM auth.users WHERE email = 'pg0124@gmail.com';

-- Step 2: Add Paul to app_users with role='employee'
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

-- Step 3: Verify Paul is in app_users with role='employee'
SELECT id, email, role, name, created_at FROM app_users WHERE email = 'pg0124@gmail.com';

-- Expected: One row with role='employee'
