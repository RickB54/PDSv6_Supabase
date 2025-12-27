-- ============================================
-- VERIFY INVENTORY TABLES EXIST
-- Run this to check if tables are already set up
-- ============================================

-- Check if tables exist
SELECT 
  'chemicals' as table_name,
  COUNT(*) as row_count
FROM chemicals
UNION ALL
SELECT 
  'materials' as table_name,
  COUNT(*) as row_count
FROM materials
UNION ALL
SELECT 
  'tools' as table_name,
  COUNT(*) as row_count
FROM tools
UNION ALL
SELECT 
  'usage_history' as table_name,
  COUNT(*) as row_count
FROM usage_history;

-- If this runs without error, your tables are ready! ✅
-- The row_count shows how many items are in each table
