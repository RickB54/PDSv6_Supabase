-- RUN THIS AFTER CREATING PAUL IN SUPABASE DASHBOARD
-- (Authentication > Users > Add user)

-- Add Paul to app_users with role='employee'
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

-- Verify it worked
SELECT id, email, role, name FROM app_users WHERE email = 'pg0124@gmail.com';

-- Expected: One row with role='employee'
