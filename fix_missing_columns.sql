-- Migration to add missing columns to customers and learning_library_comments
ALTER TABLE customers ADD COLUMN IF NOT EXISTS how_found text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS how_found_other text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS condition_inside text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS condition_outside text;

-- Add parent_id for threaded replies in blog/library comments
ALTER TABLE learning_library_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES learning_library_comments(id) ON DELETE CASCADE;
