-- ============================================
-- STEP-BY-STEP FIX FOR PAUL'S ROLE
-- Run each section separately in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: DELETE PAUL
-- Copy and run this section first
-- ============================================

DELETE FROM app_users WHERE email = 'pg0124@gmail.com';

-- After running, you should see: "Success. No rows returned"
-- This means Paul was deleted

-- ============================================
-- STEP 2: VERIFY PAUL IS DELETED
-- Copy and run this section to verify
-- ============================================

SELECT * FROM app_users WHERE email = 'pg0124@gmail.com';

-- Should return: "No rows" or empty result
-- If you still see Paul, the delete didn't work

-- ============================================
-- STEP 3: CREATE THE TRIGGER
-- Copy and run this entire section
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enforce_employee_role_trigger ON app_users;
DROP FUNCTION IF EXISTS enforce_employee_role();

-- Create function to enforce employee role
CREATE OR REPLACE FUNCTION enforce_employee_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If this user has role='employee', keep it that way
  IF OLD.role = 'employee' AND NEW.role != 'employee' THEN
    RAISE NOTICE 'Prevented role change for employee: % from % to %', 
      NEW.email, OLD.role, NEW.role;
    NEW.role := 'employee';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER enforce_employee_role_trigger
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION enforce_employee_role();

-- Should see: "Success. No rows returned"

-- ============================================
-- STEP 4: VERIFY TRIGGER WAS CREATED
-- Copy and run this to verify
-- ============================================

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'enforce_employee_role_trigger';

-- Should show one row with the trigger details

-- ============================================
-- STEP 5: ALSO DELETE FROM AUTH.USERS
-- This is important! Run this in Supabase Dashboard:
-- ============================================

-- Go to: Authentication > Users
-- Find: pg0124@gmail.com
-- Click the three dots (...)
-- Click "Delete user"
-- Confirm deletion

-- ============================================
-- STEP 6: RECREATE PAUL IN THE APP
-- ============================================

-- 1. Go to Operations → Users & Roles
-- 2. Click "Onboard New Employee"
-- 3. Fill in:
--    - Name: Paul
--    - Email: pg0124@gmail.com
--    - Password: (create new password)
-- 4. Click "Add Employee"

-- ============================================
-- STEP 7: VERIFY PAUL WAS RECREATED CORRECTLY
-- Run this after recreating Paul
-- ============================================

SELECT id, email, role, name, created_at, updated_at
FROM app_users
WHERE email = 'pg0124@gmail.com';

-- Should show:
-- role: 'employee'
-- name: 'Paul'
-- Recent created_at timestamp

-- ============================================
-- DONE!
-- ============================================
