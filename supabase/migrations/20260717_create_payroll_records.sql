CREATE TABLE IF NOT EXISTS public.payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    employee_name TEXT NOT NULL,
    booking_id UUID,
    booking_title TEXT NOT NULL,
    job_price NUMERIC(10,2) NOT NULL,
    stripe_fee NUMERIC(10,2) NOT NULL,
    material_costs NUMERIC(10,2) NOT NULL,
    labor_revenue NUMERIC(10,2) NOT NULL,
    commission_percent NUMERIC(5,2) NOT NULL,
    earned_amount NUMERIC(10,2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' or 'paid'
    expense_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

-- RLS policies
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users"
    ON public.payroll_records
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access for authenticated users"
    ON public.payroll_records
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access for authenticated users"
    ON public.payroll_records
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow delete access for authenticated users"
    ON public.payroll_records
    FOR DELETE
    TO authenticated
    USING (true);

-- Also add a stripe_fee and material_costs column to bookings if we want to store it there, 
-- but let's stick to payroll_records for the earnings calculation as requested.
