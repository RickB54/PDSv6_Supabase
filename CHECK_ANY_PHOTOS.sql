-- Check if ANY photos exist in the database
SELECT 
    c.full_name as customer,
    v.year,
    v.make,
    v.model,
    array_length(v.general_photos, 1) as general,
    array_length(v.before_photos, 1) as before_,
    array_length(v.after_photos, 1) as after_,
    array_length(v.video_urls, 1) as videos,
    v.general_photos[1] as sample_photo_url
FROM vehicles v
LEFT JOIN customers c ON v.customer_id = c.id
WHERE 
    array_length(v.general_photos, 1) > 0 OR
    array_length(v.before_photos, 1) > 0 OR
    array_length(v.after_photos, 1) > 0 OR
    array_length(v.video_urls, 1) > 0
ORDER BY v.created_at DESC NULLS LAST
LIMIT 10;

-- If no results, that means uploads are failing silently
