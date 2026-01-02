-- Add AI tracking columns to chemical_library table
ALTER TABLE chemical_library
ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manually_modified boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN chemical_library.ai_generated IS 'True if the chemical card was created using AI auto-fill';
COMMENT ON COLUMN chemical_library.manually_modified IS 'True if the user manually edited content fields after AI generation';
