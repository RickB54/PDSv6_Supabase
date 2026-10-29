-- Migration: Add resets_followup column to engagements table
-- Safe to run multiple times. Defaults to true so all existing records continue counting toward follow-up.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'engagements' 
        AND column_name = 'resets_followup'
    ) THEN
        ALTER TABLE public.engagements 
        ADD COLUMN resets_followup BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;
