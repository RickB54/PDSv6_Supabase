-- Create missing tables for invoices, estimates, and update bookings table
-- This script adds the necessary tables and columns for the customer dashboard

-- INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number integer,
  customer_id uuid REFERENCES public.customers(id),
  vehicle_id uuid REFERENCES public.vehicles(id),
  services jsonb DEFAULT '[]'::jsonb,
  total numeric DEFAULT 0,
  date text,
  status text DEFAULT 'unpaid',
  paid_amount numeric DEFAULT 0,
  paid_date text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Admins can do everything on invoices" ON public.invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Customers can view their own invoices" ON public.invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customers 
      WHERE customers.id = invoices.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

-- ESTIMATES TABLE
CREATE TABLE IF NOT EXISTS public.estimates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES public.customers(id),
  customer_name text,
  vehicle text,
  services jsonb DEFAULT '[]'::jsonb,
  total numeric DEFAULT 0,
  notes text,
  date text,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on estimates
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for estimates
CREATE POLICY "Admins can do everything on estimates" ON public.estimates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Customers can view their own estimates" ON public.estimates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customers 
      WHERE customers.id = estimates.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

-- Add missing columns to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_vehicle jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS add_ons jsonb DEFAULT '[]'::jsonb;

-- Update bookings RLS policies
DROP POLICY IF EXISTS "Customers can view their own bookings" ON public.bookings;
CREATE POLICY "Customers can view their own bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customers 
      WHERE customers.id = bookings.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can do everything on bookings" ON public.bookings;
CREATE POLICY "Admins can do everything on bookings" ON public.bookings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON public.estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
