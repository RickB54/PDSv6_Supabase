-- RUN THIS SCRIPT IN THE SUPABASE DASHBOARD SQL EDITOR
-- This will ensure your cloud database has the structure for Chemical Cards AND fixes your Admin permissions.

-- 1. Create Knowledge Base table (Safe if exists)
CREATE TABLE IF NOT EXISTS chemical_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT NOT NULL CHECK (category IN ('Exterior', 'Interior', 'Dual-Use')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS used_for TEXT[];
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS when_to_use TEXT;
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS why_to_use TEXT;
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS primary_uses TEXT;
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS other_uses TEXT;
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS dilution_ratios JSONB DEFAULT '[]'::jsonb;
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS application_guide JSONB DEFAULT '{}'::jsonb;
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS surface_compatibility JSONB DEFAULT '{}'::jsonb;
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS interactions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS warnings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#3b82f6';
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS primary_image_url TEXT;
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS gallery_image_urls TEXT[] DEFAULT '{}';
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS video_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS pro_tips TEXT[] DEFAULT '{}';
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS safety_info TEXT;
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS sds_url TEXT;
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS compatible_chemicals TEXT[] DEFAULT '{}';
ALTER TABLE chemical_library ADD COLUMN IF NOT EXISTS alternative_chemicals TEXT[] DEFAULT '{}';

-- 3. Security
ALTER TABLE chemical_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin All Access ChemicalLibrary" ON chemical_library;
CREATE POLICY "Admin All Access ChemicalLibrary" ON chemical_library
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM app_users WHERE role = 'admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM app_users WHERE role = 'admin'));

DROP POLICY IF EXISTS "Employee Read Only ChemicalLibrary" ON chemical_library;
CREATE POLICY "Employee Read Only ChemicalLibrary" ON chemical_library
    FOR SELECT
    USING (auth.uid() IN (SELECT id FROM app_users WHERE role IN ('admin', 'employee')));

-- 4. Service Link Table
CREATE TABLE IF NOT EXISTS service_step_chemicals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    chemical_id UUID REFERENCES chemical_library(id) ON DELETE CASCADE,
    usage_notes TEXT,
    dilution_override TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE service_step_chemicals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin All Access ServiceChemicals" ON service_step_chemicals;
CREATE POLICY "Admin All Access ServiceChemicals" ON service_step_chemicals
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM app_users WHERE role = 'admin'));

DROP POLICY IF EXISTS "Employee Read Only ServiceChemicals" ON service_step_chemicals;
CREATE POLICY "Employee Read Only ServiceChemicals" ON service_step_chemicals
    FOR SELECT
    USING (auth.uid() IN (SELECT id FROM app_users WHERE role IN ('admin', 'employee')));

-- 5. LINKING: Add column to EXISTING Inventory table
ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS chemical_library_id UUID REFERENCES chemical_library(id) ON DELETE SET NULL;

-- 6. *** FIX ADMIN PERMISSIONS ***
-- This ensures your user is recognized as Admin in the remote database tables
INSERT INTO app_users (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'rberube54@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Update user metadata as a backup
UPDATE auth.users SET raw_app_meta_data = '{"role": "admin"}' 
WHERE email = 'rberube54@gmail.com';
