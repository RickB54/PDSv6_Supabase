-- COMPREHENSIVE CHECK - FIND OUT EXACTLY WHAT'S WRONG

-- 1. Check if Paul is in auth.users
SELECT 'AUTH.USERS:' as table_name, id, email, created_at 
FROM auth.users 
WHERE email = 'pg0124@gmail.com';

-- 2. Check if Paul is in app_users
SELECT 'APP_USERS:' as table_name, id, email, role, name, created_at, updated_at
FROM app_users 
WHERE email = 'pg0124@gmail.com';

-- 3. Check ALL employees in app_users
SELECT 'ALL EMPLOYEES:' as table_name, id, email, role, name
FROM app_users
WHERE role = 'employee';

-- 4. Check if there's a Paul with ANY role
SELECT 'ANY PAUL:' as table_name, id, email, role, name
FROM app_users
WHERE email LIKE '%pg0124%' OR name LIKE '%Paul%';

-- This will show us EXACTLY where Paul is and what his role is
