-- Fix missing columns for Training Center Upgrade
-- Run this in the Supabase SQL Editor

-- 1. Ensure Badges Table Exists
CREATE TABLE IF NOT EXISTS training_badges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon_name TEXT DEFAULT 'Shield',
    color TEXT DEFAULT 'purple',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Badges if empty
INSERT INTO training_badges (title, description, color, icon_name)
SELECT 'Exterior PRO', 'Certified in Exterior Detailing', 'blue', 'Car'
WHERE NOT EXISTS (SELECT 1 FROM training_badges WHERE title = 'Exterior PRO');

INSERT INTO training_badges (title, description, color, icon_name)
SELECT 'Interior PRO', 'Certified in Interior Detailing', 'green', 'Armchair'
WHERE NOT EXISTS (SELECT 1 FROM training_badges WHERE title = 'Interior PRO');

INSERT INTO training_badges (title, description, color, icon_name)
SELECT 'Safety First', 'Completed Safety Training', 'red', 'AlertTriangle'
WHERE NOT EXISTS (SELECT 1 FROM training_badges WHERE title = 'Safety First');

-- 2. Add Missing Columns to training_modules
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_modules' AND column_name = 'is_safety') THEN
        ALTER TABLE training_modules ADD COLUMN is_safety BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_modules' AND column_name = 'sop_link') THEN
        ALTER TABLE training_modules ADD COLUMN sop_link TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_modules' AND column_name = 'badge_reward_id') THEN
        ALTER TABLE training_modules ADD COLUMN badge_reward_id UUID REFERENCES training_badges(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_modules' AND column_name = 'prerequisite_ids') THEN
        ALTER TABLE training_modules ADD COLUMN prerequisite_ids JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_modules' AND column_name = 'is_optional') THEN
        ALTER TABLE training_modules ADD COLUMN is_optional BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. Add Missing Columns to training_progress
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_progress' AND column_name = 'video_position') THEN
        ALTER TABLE training_progress ADD COLUMN video_position NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_progress' AND column_name = 'acknowledged_at') THEN
        ALTER TABLE training_progress ADD COLUMN acknowledged_at TIMESTAMPTZ;
    END IF;
END $$;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload config';
