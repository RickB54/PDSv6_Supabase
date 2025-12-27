-- STEP 3: CREATE THE ROLE ENFORCEMENT TRIGGER
-- Copy this entire file and run it in Supabase SQL Editor

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

-- Expected result: "Success. No rows returned"
-- This means the trigger was created successfully
