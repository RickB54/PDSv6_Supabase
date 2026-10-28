-- Migration: Add is_hidden column to content_testimonials table
-- Safely adds is_hidden with default false so all existing testimonials remain visible.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'content_testimonials' 
        AND column_name = 'is_hidden'
    ) THEN
        ALTER TABLE public.content_testimonials 
        ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;
