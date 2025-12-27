-- CHECK IF PAUL EXISTS IN DATABASE

-- Check app_users table
SELECT id, email, role, name, created_at 
FROM app_users 
WHERE email = 'pg0124@gmail.com';

-- Check auth.users table
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'pg0124@gmail.com';

-- If both show results, Paul exists
-- If app_users is empty, run the insert again
-- If auth.users is empty, you need to create Paul in Authentication > Users
