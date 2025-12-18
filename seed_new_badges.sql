-- Add requested badges for Training Center
-- Run this in Supabase SQL Editor

INSERT INTO training_badges (title, description, color, icon_name)
SELECT 'Materials Specialist', 'Completed Materials Training', 'orange', 'Box'
WHERE NOT EXISTS (SELECT 1 FROM training_badges WHERE title = 'Materials Specialist');

INSERT INTO training_badges (title, description, color, icon_name)
SELECT 'Chemicals Expert', 'Certified in Chemical Safety & Usage', 'pink', 'FlaskConical'
WHERE NOT EXISTS (SELECT 1 FROM training_badges WHERE title = 'Chemicals Expert');

INSERT INTO training_badges (title, description, color, icon_name)
SELECT 'Hardware Pro', 'Mastery of Tools & Equipment', 'cyan', 'Wrench'
WHERE NOT EXISTS (SELECT 1 FROM training_badges WHERE title = 'Hardware Pro');
