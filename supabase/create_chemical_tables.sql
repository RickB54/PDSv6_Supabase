-- Create chemicals table
CREATE TABLE IF NOT EXISTS chemicals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT NOT NULL CHECK (category IN ('Exterior', 'Interior', 'Dual-Use')),
    description TEXT, -- 'What This Chemical Is'
    used_for TEXT[], -- Top bullet points
    when_to_use TEXT,
    why_to_use TEXT,
    primary_uses TEXT,
    other_uses TEXT,
    
    -- Structured Data as JSONB
    dilution_ratios JSONB DEFAULT '[]'::jsonb, -- Array of { method: string, ratio: string, soil_level: string, notes: string }
    application_guide JSONB DEFAULT '{}'::jsonb, -- { method: string, dwell_time: string, max_dwell: string, agitation: string, rinse: string }
    surface_compatibility JSONB DEFAULT '{}'::jsonb, -- { safe: string[], risky: string[], avoid: string[] }
    interactions JSONB DEFAULT '{}'::jsonb, -- { do_not_mix: string[], sequencing: string[] }
    warnings JSONB DEFAULT '{}'::jsonb, -- { risks: string[], damage_risk: 'Low'|'Medium'|'High' }
    
    -- Multimedia & Aesthetics
    theme_color TEXT DEFAULT '#3b82f6', -- Hex code
    primary_image_url TEXT,
    gallery_image_urls TEXT[] DEFAULT '{}',
    video_urls TEXT[] DEFAULT '{}', -- Array of { type: 'youtube'|'vimeo', url: string, title: string }
    
    -- Relationships (stored as arrays of chemical IDs/Names for simplicity, or could be separate table)
    compatible_chemicals TEXT[] DEFAULT '{}',
    alternative_chemicals TEXT[] DEFAULT '{}',
    
    -- Extras
    pro_tips TEXT[] DEFAULT '{}',
    safety_info TEXT,  -- storage, ppe
    sds_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chemicals ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admin: Full access
CREATE POLICY "Admin All Access Chemicals" ON chemicals
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM app_users WHERE role = 'admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM app_users WHERE role = 'admin'));

-- Employee: Read Only
CREATE POLICY "Employee Read Only Chemicals" ON chemicals
    FOR SELECT
    USING (auth.uid() IN (SELECT id FROM app_users WHERE role IN ('admin', 'employee')));
    
-- Public/Customer: No access (default)

-- Create a junction table for Service Step -> Chemical linking integration
-- This allows multiple chemicals per service step without modifying the static definitions too much,
-- or we can just store chemical_ids in the service definition JSON.
-- For now, let's create a table to be safe and relational.
CREATE TABLE IF NOT EXISTS service_step_chemicals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id TEXT NOT NULL, -- Corresponds to package ID or addon ID
    step_id TEXT NOT NULL, -- The specific step ID within the service
    chemical_id UUID REFERENCES chemicals(id) ON DELETE CASCADE,
    usage_notes TEXT, -- Specific instructions for this step
    dilution_override TEXT, -- Step-specific dilution
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_step_chemicals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin All Access ServiceChemicals" ON service_step_chemicals
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM app_users WHERE role = 'admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM app_users WHERE role = 'admin'));

CREATE POLICY "Employee Read Only ServiceChemicals" ON service_step_chemicals
    FOR SELECT
    USING (auth.uid() IN (SELECT id FROM app_users WHERE role IN ('admin', 'employee')));
