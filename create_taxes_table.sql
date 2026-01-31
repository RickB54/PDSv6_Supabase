-- Create tax_expenses table
CREATE TABLE IF NOT EXISTS public.tax_expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  vendor text,
  payment_method text,
  category text NOT NULL,
  tags text[],
  is_deductible boolean DEFAULT true,
  notes text,
  receipt_url text,
  asset_id text, -- Link to inventory item ID (which could be UUID or string depending on localforage legacy)
  is_recurring boolean DEFAULT false,
  recurring_interval text, -- 'monthly', 'yearly', etc.
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tax_expenses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can do everything on tax_expenses" ON public.tax_expenses
  FOR ALL USING (EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "ReadOnly access for employees to tax_expenses" ON public.tax_expenses
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('admin', 'employee')));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_expenses_date ON public.tax_expenses(date);
CREATE INDEX IF NOT EXISTS idx_tax_expenses_category ON public.tax_expenses(category);
CREATE INDEX IF NOT EXISTS idx_tax_expenses_year ON public.tax_expenses (extract(year from date));
