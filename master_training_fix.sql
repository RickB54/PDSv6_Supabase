-- MASTER FIX FOR TRAINING CENTER
-- Run this script to fix Constraints, Columns, and Permissions (RLS) all at once.

-- 1. FIX COLUMNS (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_modules' AND column_name = 'is_optional') THEN
        ALTER TABLE training_modules ADD COLUMN is_optional BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'training_modules' AND column_name = 'prerequisite_ids') THEN
        ALTER TABLE training_modules ADD COLUMN prerequisite_ids JSONB DEFAULT '[]';
    END IF;
END $$;

-- 2. FIX UNIQUE CONSTRAINT (For Upsert)
-- We drop it first to ensure we don't have a broken state, then recreate it.
ALTER TABLE training_progress DROP CONSTRAINT IF EXISTS training_progress_user_module_key;
ALTER TABLE training_progress ADD CONSTRAINT training_progress_user_module_key UNIQUE (user_id, module_id);

-- 3. FIX RLS POLICIES (Permissions)
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;

-- Drop old policies to clean up
DROP POLICY IF EXISTS "Users can view own progress" ON training_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON training_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON training_progress;
DROP POLICY IF EXISTS "Authenticated can view progress" ON training_progress;
DROP POLICY IF EXISTS "Authenticated can modify progress" ON training_progress;

-- Create ALL-IN-ONE permissive policy for authenticated users (simpler for now)
CREATE POLICY "Authenticated users can manage own training progress"
ON training_progress
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also allow Admins to view all (optional, but good for dashboard)
CREATE POLICY "Admins can view all progress"
ON training_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);

-- 4. RELOAD
NOTIFY pgrst, 'reload config';
