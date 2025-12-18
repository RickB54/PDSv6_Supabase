-- VERIFY PAUL'S ROLE (Corrected for 'name' column)

SELECT id, email, role, name 
FROM app_users 
WHERE email = 'pgd124@gmail.com';

-- If this returns 'employee', then the ID Card is correct, but the App is misreading it.
-- If this returns 'customer', then the SQL UPDATE didn't work.
