-- ============================================================
-- Employee Profile Schema Migration
-- Additive only — no existing columns altered or dropped
-- All new columns are nullable (no defaults that affect existing rows)
-- ============================================================

ALTER TABLE app_users
  -- Personal / Contact
  ADD COLUMN IF NOT EXISTS full_legal_name            TEXT,
  ADD COLUMN IF NOT EXISTS phone                      TEXT,
  ADD COLUMN IF NOT EXISTS home_address               TEXT,
  ADD COLUMN IF NOT EXISTS dob                        DATE,
  ADD COLUMN IF NOT EXISTS emergency_contact_name     TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone    TEXT,

  -- Employment
  ADD COLUMN IF NOT EXISTS job_title                  TEXT,
  ADD COLUMN IF NOT EXISTS employee_type              TEXT,
  ADD COLUMN IF NOT EXISTS status                     TEXT,
  ADD COLUMN IF NOT EXISTS hire_date                  DATE,
  ADD COLUMN IF NOT EXISTS termination_date           DATE,
  ADD COLUMN IF NOT EXISTS tax_classification         TEXT,

  -- Compensation
  ADD COLUMN IF NOT EXISTS payment_method_notes       TEXT,

  -- Performance
  ADD COLUMN IF NOT EXISTS skill_rating               SMALLINT,
  ADD COLUMN IF NOT EXISTS work_ethic_notes           TEXT,
  ADD COLUMN IF NOT EXISTS customer_feedback_score    NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS incident_log               JSONB,
  ADD COLUMN IF NOT EXISTS tier_promotion_history     JSONB,

  -- Admin
  ADD COLUMN IF NOT EXISTS internal_notes             TEXT,
  ADD COLUMN IF NOT EXISTS documents_on_file          JSONB;
