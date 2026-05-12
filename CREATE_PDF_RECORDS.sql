
-- Create PDF Records table for persistent storage across devices
CREATE TABLE IF NOT EXISTS public.pdf_records (
    id text PRIMARY KEY,
    file_name text NOT NULL,
    record_type text NOT NULL,
    customer_name text NOT NULL,
    date text NOT NULL,
    timestamp timestamptz DEFAULT now(),
    record_id text,
    pdf_data text NOT NULL, -- Store as base64 for now to avoid storage bucket setup
    path text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_records ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can do everything on pdf_records" ON public.pdf_records
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin')
    );

-- Allow public insert for BookNow (if needed, but usually we want admin to see it)
-- Actually, BookNow runs as anon. So we need a policy for anon to insert.
CREATE POLICY "Allow anon to insert pdf_records" ON public.pdf_records
    FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pdf_records_customer ON public.pdf_records(customer_name);
CREATE INDEX IF NOT EXISTS idx_pdf_records_type ON public.pdf_records(record_type);
CREATE INDEX IF NOT EXISTS idx_pdf_records_timestamp ON public.pdf_records(timestamp DESC);
