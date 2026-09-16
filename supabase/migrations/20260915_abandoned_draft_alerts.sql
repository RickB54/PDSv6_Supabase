-- Migration: 20260915_abandoned_draft_alerts.sql
-- Description: Add notified_at to booking_drafts, partial index, trigger function, and pg_cron schedule

-- 1. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Add notified_at column to booking_drafts
ALTER TABLE public.booking_drafts 
ADD COLUMN IF NOT EXISTS notified_at timestamptz DEFAULT NULL;

-- 3. Partial index for ultra-efficient scanning of unnotified abandoned drafts
CREATE INDEX IF NOT EXISTS booking_drafts_unnotified_abandoned_idx 
ON public.booking_drafts (status, notified_at, updated_at)
WHERE status = 'draft' AND notified_at IS NULL;

-- 4. Database trigger function for pg_cron
-- Checks internally within Postgres first (0 egress if no drafts exist)
CREATE OR REPLACE FUNCTION public.trigger_abandoned_draft_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
  v_daily_sent int;
  v_url text := 'https://kqhaoyaermsqrilhsfxj.supabase.co/functions/v1/notify-abandoned-drafts';
  v_service_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaGFveWFlcm1zcXJpbGhzZnhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM3NDY3NSwiZXhwIjoyMDgwOTUwNjc1fQ.K5HIM8P-Shw37f4YJrj1huUIDLTPHgfS_-RJ6IwEaRM';
BEGIN
  -- Check if any unnotified abandoned drafts exist (older than 15 mins)
  SELECT count(*) INTO v_count
  FROM public.booking_drafts
  WHERE status = 'draft'
    AND notified_at IS NULL
    AND updated_at < now() - INTERVAL '15 minutes'
    AND expires_at > now();

  -- If 0 drafts qualify, terminate immediately (0 external network calls)
  IF v_count = 0 THEN
    RETURN;
  END IF;

  -- Secondary hard circuit breaker (30/day) in case edge function is ever unreachable
  IF v_daily_sent >= 30 THEN
    RAISE WARNING 'Daily abandoned draft email hard circuit breaker (30) reached. Skipping.';
    RETURN;
  END IF;

  -- Trigger Edge Function via pg_net with Service Role authorization
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'source', 'pg_cron',
      'triggered_at', now()
    )
  );
END;
$$;

-- 5. Schedule cron job to run every 5 minutes
-- Unschedule first if exists to prevent duplicates
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'check-abandoned-drafts';

SELECT cron.schedule(
  'check-abandoned-drafts',
  '*/5 * * * *',
  $$ SELECT public.trigger_abandoned_draft_check(); $$
);
