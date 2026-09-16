-- Migration: booking_drafts table for abandoned/incomplete public booking form capture
-- Writes go exclusively through the upsert-booking-draft edge function (service-role key).
-- No anon INSERT/UPDATE policies are needed or created.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.booking_drafts (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      text        NOT NULL,
  name            text,
  email           text,
  phone           text,
  address         text,
  vehicle_make    text,
  vehicle_model   text,
  vehicle_year    text,
  vehicle_type    text,
  vehicle_color   text,
  service_package text,
  add_ons         text[],
  preferred_date  text,
  status          text        NOT NULL DEFAULT 'draft',  -- 'draft' | 'converted' | 'archived' | 'dismissed'
  booking_id      uuid,                                  -- FK set on successful real submission
  client_ip       text,                                  -- stored for rate-limit counting
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '48 hours')
);

-- Fast lookup by session_id (the primary access pattern)
CREATE INDEX IF NOT EXISTS booking_drafts_session_id_idx
  ON public.booking_drafts (session_id);

-- Fast CRM query: active drafts not yet expired
CREATE INDEX IF NOT EXISTS booking_drafts_status_expires_idx
  ON public.booking_drafts (status, expires_at DESC);

-- Enable RLS
ALTER TABLE public.booking_drafts ENABLE ROW LEVEL SECURITY;

-- Admins can read all drafts (for CRM display)
CREATE POLICY "Admins can read booking drafts"
  ON public.booking_drafts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update (e.g. dismiss from CRM)
CREATE POLICY "Admins can update booking drafts"
  ON public.booking_drafts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- All INSERT/UPDATE from the public form routes through the edge function
-- with the service-role key, which bypasses RLS entirely. No anon policies needed.

COMMENT ON TABLE public.booking_drafts IS
  'Lightweight draft records from incomplete public booking form submissions. '
  'Written exclusively via the upsert-booking-draft edge function (service-role). '
  'Expires 48h after last update. status=converted means a real booking was created.';
