-- Fix missing Unique Constraint for Upsert Logic
-- Run this in Supabase SQL Editor

-- 1. Ensure training_progress has a unique constraint on (user_id, module_id)
-- This allows ON CONFLICT (user_id, module_id) DO UPDATE to work.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'training_progress_user_module_key'
    ) THEN
        ALTER TABLE training_progress ADD CONSTRAINT training_progress_user_module_key UNIQUE (user_id, module_id);
    END IF;
END $$;

-- 2. Verify is_optional column exists (Just in case)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_modules' AND column_name = 'is_optional') THEN
        ALTER TABLE training_modules ADD COLUMN is_optional BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. Reload Schema
NOTIFY pgrst, 'reload config';
