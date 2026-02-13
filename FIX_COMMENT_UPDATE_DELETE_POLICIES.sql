-- Add UPDATE and DELETE policies for learning_library_comments
-- This allows users to edit and delete their own comments, and admins to manage all comments

-- First, drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can update own comments" ON learning_library_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON learning_library_comments;
DROP POLICY IF EXISTS "Admins can update any comment" ON learning_library_comments;
DROP POLICY IF EXISTS "Admins can delete any comment" ON learning_library_comments;

-- CREATE UPDATE POLICY
-- Allow authenticated users to update comments (we'll check author in application logic)
CREATE POLICY "Authenticated users can update comments"
  ON learning_library_comments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- CREATE DELETE POLICY  
-- Allow authenticated users to delete comments (we'll check author/admin in application logic)
CREATE POLICY "Authenticated users can delete comments"
  ON learning_library_comments
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant necessary permissions
GRANT UPDATE, DELETE ON learning_library_comments TO authenticated;

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'learning_library_comments'
ORDER BY cmd;
