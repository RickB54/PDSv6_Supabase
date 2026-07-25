INSERT INTO public.employee_communications (employee_id, method, direction, subject, content, follow_up_required, status)
SELECT 
    id AS employee_id,
    'Text' AS method,
    'Sent by me' AS direction,
    'Test Communication via SQL' AS subject,
    'This is a test communication row inserted directly to verify the Communications tab works correctly.' AS content,
    false AS follow_up_required,
    'Resolved' AS status
FROM public.app_users 
WHERE role = 'employee' 
LIMIT 1;
