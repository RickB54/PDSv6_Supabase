-- Create tax_reports table to archive generated reports
CREATE TABLE IF NOT EXISTS public.tax_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  year integer NOT NULL,
  report_name text NOT NULL,
  report_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  notes text
);

-- Enable RLS
ALTER TABLE public.tax_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can do everything on tax_reports" ON public.tax_reports
  FOR ALL USING (EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "ReadOnly access for employees to tax_reports" ON public.tax_reports
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'employee')));

-- Index for yearly lookup
CREATE INDEX IF NOT EXISTS idx_tax_reports_year ON public.tax_reports(year);
