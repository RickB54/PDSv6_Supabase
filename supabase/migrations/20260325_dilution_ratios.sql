-- Create table for dilution reference ratios
CREATE TABLE IF NOT EXISTS dilution_reference_ratios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ratio TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ratio, user_id)
);

-- Enable RLS
ALTER TABLE dilution_reference_ratios ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all dilution ratios" ON dilution_reference_ratios
    FOR SELECT
    USING (auth.uid() IN (SELECT id FROM app_users WHERE role IN ('admin', 'employee')));

CREATE POLICY "Admins can manage dilution ratios" ON dilution_reference_ratios
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM app_users WHERE role = 'admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM app_users WHERE role = 'admin'));

CREATE POLICY "Users can insert own dilution ratios" ON dilution_reference_ratios
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
