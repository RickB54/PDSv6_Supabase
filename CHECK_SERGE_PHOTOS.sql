-- Check if Serge's vehicle has photos
SELECT 
    c.full_name as customer_name,
    c.type,
    v.id as vehicle_id,
    v.make,
    v.model,
    v.year,
    array_length(v.general_photos, 1) as general_count,
    array_length(v.before_photos, 1) as before_count,
    array_length(v.after_photos, 1) as after_count,
    array_length(v.video_urls, 1) as video_count,
    v.general_photos,
    v.before_photos,
    v.after_photos
FROM vehicles v
LEFT JOIN customers c ON v.customer_id = c.id
WHERE c.full_name ILIKE '%Serge%'
ORDER BY v.created_at DESC;

-- If no results, check if Serge has any vehicles at all
SELECT 
    c.full_name,
    c.id as customer_id,
    COUNT(v.id) as vehicle_count
FROM customers c
LEFT JOIN vehicles v ON v.customer_id = c.id
WHERE c.full_name ILIKE '%Serge%'
GROUP BY c.id, c.full_name;
