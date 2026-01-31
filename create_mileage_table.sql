-- MILEAGE LOG TABLE
CREATE TABLE IF NOT EXISTS public.mileage_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  miles_driven numeric NOT NULL,
  purpose text NOT NULL, -- e.g. Customer job, Supplies, Business travel
  start_location text,
  end_location text,
  odometer_start numeric,
  odometer_end numeric,
  customer_id uuid REFERENCES public.customers(id),
  job_id uuid REFERENCES public.bookings(id),
  is_business boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on mileage_log
ALTER TABLE public.mileage_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mileage_log
CREATE POLICY "Admins can do everything on mileage_log" ON public.mileage_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Employees can view and create mileage entries
CREATE POLICY "Employees can view mileage_log" ON public.mileage_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'employee'))
  );

CREATE POLICY "Employees can create mileage_log" ON public.mileage_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'employee'))
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mileage_log_date ON public.mileage_log(date);
CREATE INDEX IF NOT EXISTS idx_mileage_log_customer_id ON public.mileage_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_mileage_log_job_id ON public.mileage_log(job_id);
