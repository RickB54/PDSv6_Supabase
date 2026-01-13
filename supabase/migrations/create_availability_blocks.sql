-- Manual Availability Blocks Table
-- Stores admin-created time blocks that sync across all devices

CREATE TABLE IF NOT EXISTS public.availability_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast date lookups
CREATE INDEX IF NOT EXISTS idx_availability_blocks_date ON public.availability_blocks(date);

-- RLS Policies
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read blocks (for customer-facing availability)
CREATE POLICY "Anyone can view availability blocks"
    ON public.availability_blocks
    FOR SELECT
    USING (true);

-- Only authenticated users can insert/update/delete (admin only)
CREATE POLICY "Authenticated users can manage blocks"
    ON public.availability_blocks
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_availability_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER availability_blocks_updated_at
    BEFORE UPDATE ON public.availability_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_availability_blocks_updated_at();
