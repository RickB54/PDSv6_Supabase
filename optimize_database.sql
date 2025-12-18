-- PERFORMANCE OPTIMIZATION SCRIPT
-- This script adds "Indexes" to your database.
-- Indexes function like a "Table of Contents" for a book, helping the database find data instantly without scanning every page.
-- Running this will resolve many of the "Performance Issues" listed in Supabase.

-- 1. App Users (Most critical for login speed)
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);

-- 2. Training Progress (Speed up "My Certifications" load)
CREATE INDEX IF NOT EXISTS idx_training_progress_user_id ON training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_module_id ON training_progress(module_id);

-- 3. Tasks (Speed up Kanban board)
-- UPDATED: Indexed the columns that actually exist
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- 4. Estimates & Invoices (Speed up dashboard charts)
CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);

-- 5. Customers (Speed up search)
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
-- CORRECTED: Use 'full_name' instead of 'name'
CREATE INDEX IF NOT EXISTS idx_customers_full_name ON customers(full_name);


