-- STEP 4: VERIFY TRIGGER WAS CREATED
-- Copy this entire file and run it in Supabase SQL Editor

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'enforce_employee_role_trigger';

-- Expected result: One row showing:
-- trigger_name: enforce_employee_role_trigger
-- event_manipulation: UPDATE
-- event_object_table: app_users
