-- ========================================================================
-- Create Employee Training Progress Checklist Table
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.employee_training_progress_checklist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL,
    item_key TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),
    UNIQUE(employee_id, phase_number, item_key)
);

-- ========================================================================
-- Set up Row Level Security (RLS)
-- ========================================================================
ALTER TABLE public.employee_training_progress_checklist ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "Admins can select training checklist" ON public.employee_training_progress_checklist 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can insert training checklist" ON public.employee_training_progress_checklist 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update training checklist" ON public.employee_training_progress_checklist 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete training checklist" ON public.employee_training_progress_checklist 
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
);

-- Employees can read their own checklist
CREATE POLICY "Employees can view own checklist" ON public.employee_training_progress_checklist
FOR SELECT USING (
  auth.uid() = employee_id
);

-- Note: We do not allow employees to UPDATE or INSERT to this table. Admin only!

-- ========================================================================
-- Add training completed columns to app_users if they don't exist
-- ========================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_users' AND column_name='training_completed') THEN
        ALTER TABLE public.app_users ADD COLUMN training_completed BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_users' AND column_name='training_completed_on') THEN
        ALTER TABLE public.app_users ADD COLUMN training_completed_on DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_users' AND column_name='training_notes') THEN
        ALTER TABLE public.app_users ADD COLUMN training_notes JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
