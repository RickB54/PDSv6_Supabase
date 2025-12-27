-- STEP 1: DELETE PAUL FROM APP_USERS
-- Copy this entire file and run it in Supabase SQL Editor

DELETE FROM app_users WHERE email = 'pg0124@gmail.com';

-- Expected result: "Success. No rows returned" or "DELETE 1"
-- This means Paul was deleted from app_users table
