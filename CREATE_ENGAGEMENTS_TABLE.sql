-- Create the engagements table
CREATE TABLE IF NOT EXISTS public.engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name TEXT,
    customer_email TEXT,
    type TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;

-- Create basic policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" 
    ON public.engagements 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" 
    ON public.engagements 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" 
    ON public.engagements 
    FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" 
    ON public.engagements 
    FOR DELETE 
    USING (auth.role() = 'authenticated');
