ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'Individual';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name text;
