-- Create manual_income table if missing
CREATE TABLE IF NOT EXISTS public.manual_income (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount numeric NOT NULL,
  category text,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  customer_name text,
  payment_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure RLS is enabled
ALTER TABLE public.manual_income ENABLE ROW LEVEL SECURITY;

-- Policies for manual_income
DROP POLICY IF EXISTS "Admins can do everything on manual_income" ON public.manual_income;
CREATE POLICY "Admins can do everything on manual_income" ON public.manual_income
  FOR ALL USING (EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'));

-- Ensure invoices table is ready (mirroring what's in local db)
-- (Already handled by create_customer_dashboard_tables.sql usually)

-- Ensure tax_expenses table is ready
-- (Already handled by create_taxes_table.sql usually)
