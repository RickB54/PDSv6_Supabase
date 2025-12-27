-- STEP 7: VERIFY PAUL WAS RECREATED CORRECTLY
-- Copy this entire file and run it in Supabase SQL Editor

SELECT id, email, role, name, created_at, updated_at
FROM app_users
WHERE email = 'pg0124@gmail.com';

-- Expected result: One row showing:
-- id: (some UUID)
-- email: pg0124@gmail.com
-- role: employee
-- name: Paul
-- created_at: (recent timestamp - today's date)
-- updated_at: (recent timestamp - today's date)

-- If role is NOT 'employee', something went wrong!
-- If you don't see any rows, Paul wasn't created - go back to step 6
