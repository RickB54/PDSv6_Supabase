-- Create employee_communications table
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

-- Set up Row Level Security
ALTER TABLE public.employee_communications ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can select communications" ON public.employee_communications FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert communications" ON public.employee_communications FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update communications" ON public.employee_communications FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete communications" ON public.employee_communications FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
  )
);
