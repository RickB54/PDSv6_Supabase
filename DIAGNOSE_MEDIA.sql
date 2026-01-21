-- Check what data is actually in the database
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check how many customers exist
SELECT 
    'CUSTOMERS' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT id) as unique_ids
FROM customers;

-- 2. Check how many vehicles exist and if they have photos
SELECT 
    'VEHICLES' as table_name,
    COUNT(*) as total_vehicles,
    COUNT(customer_id) as vehicles_with_customer,
    COUNT(*) FILTER (WHERE array_length(general_photos, 1) > 0) as vehicles_with_general_photos,
    COUNT(*) FILTER (WHERE array_length(before_photos, 1) > 0) as vehicles_with_before_photos,
    COUNT(*) FILTER (WHERE array_length(after_photos, 1) > 0) as vehicles_with_after_photos,
    COUNT(*) FILTER (WHERE array_length(video_urls, 1) > 0) as vehicles_with_videos
FROM vehicles;

-- 3. Show sample vehicle data with photos
SELECT 
    v.id,
    v.make,
    v.model,
    v.year,
    v.customer_id,
    c.full_name as customer_name,
    array_length(v.general_photos, 1) as general_count,
    array_length(v.before_photos, 1) as before_count,
    array_length(v.after_photos, 1) as after_count,
    array_length(v.video_urls, 1) as video_count
FROM vehicles v
LEFT JOIN customers c ON v.customer_id = c.id
ORDER BY v.created_at DESC
LIMIT 10;

-- 4. Show actual photo URLs (if any exist)
SELECT 
    v.make || ' ' || v.model as vehicle,
    c.full_name as customer,
    v.general_photos,
    v.before_photos,
    v.after_photos
FROM vehicles v
LEFT JOIN customers c ON v.customer_id = c.id
WHERE 
    array_length(v.general_photos, 1) > 0 OR
    array_length(v.before_photos, 1) > 0 OR
    array_length(v.after_photos, 1) > 0
LIMIT 5;
