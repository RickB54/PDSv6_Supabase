-- ========================================================================
-- Create Employee Communications Table
-- This table stores a chronological log of all communications with an employee.
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.employee_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    method TEXT NOT NULL,
    direction TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_due_date DATE,
    status TEXT DEFAULT 'Open'
);

-- ========================================================================
-- Set up Row Level Security (RLS)
-- ========================================================================
ALTER TABLE public.employee_communications ENABLE ROW LEVEL SECURITY;

-- Admins can select communications
CREATE POLICY "Admins can select communications" ON public.employee_communications 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can insert communications
CREATE POLICY "Admins can insert communications" ON public.employee_communications 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update communications
CREATE POLICY "Admins can update communications" ON public.employee_communications 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can delete communications
CREATE POLICY "Admins can delete communications" ON public.employee_communications 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ========================================================================
-- Verify creation
-- ========================================================================
-- Insert a test row for Rick (or first admin found) to ensure everything works
-- Uncomment the below to test manually:
/*
INSERT INTO public.employee_communications (employee_id, method, direction, subject, content)
VALUES (
    (SELECT id FROM public.app_users LIMIT 1),
    'Text',
    'Sent by me',
    'Test Communication',
    'This is a test message to ensure the table works correctly.'
);
*/
