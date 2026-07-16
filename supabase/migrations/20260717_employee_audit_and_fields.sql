-- ============================================================
-- Employee Profile: Audit Log Table + Additional Fields
-- Additive only — no existing columns altered or dropped
-- ============================================================

-- 1. Append-only audit log table
CREATE TABLE IF NOT EXISTS employee_profile_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  changed_by    TEXT NOT NULL,       -- email of admin who made the change
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  field_name    TEXT NOT NULL,       -- which field changed
  old_value     TEXT,                -- previous value (stringified)
  new_value     TEXT                 -- new value (stringified)
);

-- Index for fast per-employee lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_employee_id ON employee_profile_audit_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at  ON employee_profile_audit_log(changed_at DESC);

-- Row-level security: admin can insert/select, nobody can update or delete
ALTER TABLE employee_profile_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select" ON employee_profile_audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON employee_profile_audit_log;

CREATE POLICY "audit_log_select" ON employee_profile_audit_log
  FOR SELECT USING (true);

CREATE POLICY "audit_log_insert" ON employee_profile_audit_log
  FOR INSERT WITH CHECK (true);

-- 2. Additional profile columns on app_users (all nullable)
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS employment_type      TEXT,  -- Full-Time / Part-Time / Seasonal / On-Call
  ADD COLUMN IF NOT EXISTS weekly_availability  TEXT,  -- free text or structured
  ADD COLUMN IF NOT EXISTS next_review_date     DATE,
  ADD COLUMN IF NOT EXISTS documents_with_expiry JSONB, -- [{name, expiry_date}]
  ADD COLUMN IF NOT EXISTS equipment_issued     JSONB;  -- ["vest","keys","tablet"]
