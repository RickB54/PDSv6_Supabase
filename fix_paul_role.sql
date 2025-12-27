-- Step 1: Check current state
SELECT 'Current Paul record:' as step;
SELECT id, email, role, name, created_at
FROM app_users
WHERE email = 'pg0124@gmail.com';

-- Step 2: Delete Paul from app_users
SELECT 'Deleting Paul from app_users...' as step;
DELETE FROM app_users WHERE email = 'pg0124@gmail.com';

-- Step 3: Check if Paul exists in customers table
SELECT 'Checking customers table...' as step;
SELECT id, full_name, email, phone, type
FROM customers
WHERE email = 'pg0124@gmail.com';

-- Step 4: (OPTIONAL) Delete from customers if he's not a real customer
-- Uncomment the next line ONLY if Paul should NOT be a customer:
-- DELETE FROM customers WHERE email = 'pg0124@gmail.com';

-- Step 5: Create database trigger to prevent role changes
SELECT 'Creating role enforcement trigger...' as step;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enforce_employee_role_trigger ON app_users;
DROP FUNCTION IF EXISTS enforce_employee_role();

-- Create function to enforce employee role
CREATE OR REPLACE FUNCTION enforce_employee_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If this user has role='employee', keep it that way
  IF OLD.role = 'employee' AND NEW.role != 'employee' THEN
    -- Log the attempted change (optional)
    RAISE NOTICE 'Prevented role change for employee: % from % to %', 
      NEW.email, OLD.role, NEW.role;
    -- Keep the role as employee
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

SELECT 'Trigger created successfully!' as step;

-- Step 6: Verify trigger exists
SELECT 'Verifying trigger...' as step;
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'enforce_employee_role_trigger';

-- ============================================
-- NEXT STEPS (DO IN THE APP):
-- ============================================
-- 1. Go to Operations → Users & Roles
-- 2. Click "Onboard New Employee"
-- 3. Fill in:
--    - Name: Paul
--    - Email: pg0124@gmail.com
--    - Password: (create new password)
-- 4. Click "Add Employee"
-- 5. Have Paul log out and back in
-- ============================================

-- Step 7: After recreating Paul in the app, verify:
-- Run this query to check:
SELECT 'Final verification (run after recreating Paul):' as step;
SELECT id, email, role, name, created_at, updated_at
FROM app_users
WHERE email = 'pg0124@gmail.com';

-- Should show:
-- role: 'employee'
-- name: 'Paul'

-- ============================================
-- DONE!
-- ============================================
