-- INSPECT TASKS TABLE
-- Run this to see what columns actually exist in the 'tasks' table.
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks';
