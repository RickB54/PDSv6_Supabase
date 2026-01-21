-- ========================================
-- FIX RLS POLICIES - Allow operations on new columns
-- ========================================

-- Drop existing restrictive policies if any and recreate them
DROP POLICY IF EXISTS "Users can update own customers" ON customers;
DROP POLICY IF EXISTS "Employees can update customers" ON customers;
DROP POLICY IF EXISTS "Users can update vehicles" ON vehicles;
DROP POLICY IF EXISTS "Employees can update vehicles" ON vehicles;

-- CUSTOMERS: Allow authenticated users to insert/update
CREATE POLICY "Authenticated users can manage customers"
ON customers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- VEHICLES: Allow authenticated users to insert/update
CREATE POLICY "Authenticated users can manage vehicles"
ON vehicles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- COMMENTS: Allow authenticated users to add comments/replies
CREATE POLICY "Authenticated users can manage comments"
ON learning_library_comments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ========================================
-- Grant explicit permissions on new columns
-- ========================================
GRANT ALL ON customers TO authenticated;
GRANT ALL ON vehicles TO authenticated;
GRANT ALL ON learning_library_comments TO authenticated;
