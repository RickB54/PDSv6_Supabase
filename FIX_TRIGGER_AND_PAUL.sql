-- DISABLE TRIGGER, FIX PAUL'S ROLE, RE-ENABLE TRIGGER

-- Step 1: Disable the trigger temporarily
DROP TRIGGER IF EXISTS enforce_employee_role_trigger ON app_users;

-- Step 2: Update Paul's role to employee
UPDATE app_users
SET 
  role = 'employee',
  name = 'Paul',
  updated_at = NOW()
WHERE email = 'pg0124@gmail.com';

-- Step 3: Recreate the trigger (IMPROVED VERSION)
-- This version only prevents changes FROM employee, not TO employee
CREATE OR REPLACE FUNCTION enforce_employee_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Only prevent changes if OLD role was 'employee' AND trying to change it
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

-- Step 4: Verify Paul's role is now 'employee'
SELECT id, email, role, name, updated_at
FROM app_users
WHERE email = 'pg0124@gmail.com';

-- Expected: role = 'employee'
