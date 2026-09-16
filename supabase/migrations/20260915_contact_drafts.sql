-- Migration: 20260915_contact_drafts.sql
-- Description: Extend booking_drafts table with source, message, preferred_timing, and city columns

ALTER TABLE public.booking_drafts 
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'booking',
ADD COLUMN IF NOT EXISTS message text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS preferred_timing text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS city text DEFAULT NULL;

-- Create index for source filtering if needed
CREATE INDEX IF NOT EXISTS booking_drafts_source_idx ON public.booking_drafts (source);
