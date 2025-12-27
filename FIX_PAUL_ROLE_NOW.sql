-- FIX PAUL'S ROLE - CHANGE FROM CUSTOMER TO EMPLOYEE

-- Simply update Paul's role to employee
UPDATE app_users
SET 
  role = 'employee',
  name = 'Paul',
  updated_at = NOW()
WHERE email = 'pg0124@gmail.com';

-- Verify it worked
SELECT id, email, role, name, updated_at
FROM app_users
WHERE email = 'pg0124@gmail.com';

-- Expected: role should now be 'employee'
