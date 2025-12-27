-- STEP 2: VERIFY PAUL IS DELETED
-- Copy this entire file and run it in Supabase SQL Editor

SELECT * FROM app_users WHERE email = 'pg0124@gmail.com';

-- Expected result: "No rows" or empty table
-- If you still see Paul, go back and run step1_delete_paul.sql again
