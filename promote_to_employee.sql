-- PROMOTE USER TO EMPLOYEE
-- Specific fix for Paul (pgd124@gmail.com)

UPDATE app_users
SET role = 'employee'
WHERE email = 'pgd124@gmail.com';

-- Verify the change:
SELECT * FROM app_users WHERE email = 'pgd124@gmail.com';
