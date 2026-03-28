-- Migration script to update the payments table for Stripe integration
-- This aligns the schema with our Edge Functions

-- 1. Drop existing payments table if it's too simple or conflicting
DROP TABLE IF EXISTS public.payments;

-- 2. Create proper payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  customer_email text,
  amount_total numeric NOT NULL,
  currency text DEFAULT 'usd',
  payment_status text,
  metadata jsonb DEFAULT '{}'::jsonb,
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4. Admin Access Policy
CREATE POLICY "Admins can do everything on payments" ON public.payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Customer Access Policy (View their own payments)
CREATE POLICY "Customers can view their own payments" ON public.payments
  FOR SELECT USING (
    customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 6. Add indexes
CREATE INDEX idx_payments_stripe_session ON public.payments(stripe_session_id);
CREATE INDEX idx_payments_customer_email ON public.payments(customer_email);
