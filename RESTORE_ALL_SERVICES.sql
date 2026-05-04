
-- ==========================================
-- RESTORE_ALL_SERVICES.sql
-- Run this in your Supabase SQL Editor to restore all 6 packages
-- and all standard add-ons with correct pricing.
-- ==========================================

-- 1. Restore Packages
INSERT INTO packages (id, name, description, compact_price, midsize_price, truck_price, luxury_price, is_active)
VALUES 
('prime-essential-exterior', 'Prime Essential Exterior', 'A professional exterior cleaning restoration.', 90, 110, 120, 130, true),
('prime-essential-interior', 'Prime Essential Interior', 'Quickly freshen up your car’s interior.', 180, 200, 210, 240, true),
('prime-essential-full', 'Prime Essential Full Detail', 'Includes everything in the Essential Interior & Essential Exterior combined.', 230, 270, 290, 320, true),
('prime-elite-exterior', 'Prime Elite Exterior', 'Advanced exterior restoration and protection.', 160, 180, 190, 210, false),
('prime-elite-interior', 'Prime Elite Interior', 'A deep interior cleaning restoration.', 390, 475, 495, 590, false),
('prime-elite-full', 'Prime Elite Full Detail', 'The ultimate restoration and protection package.', 495, 595, 695, 850, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  compact_price = EXCLUDED.compact_price,
  midsize_price = EXCLUDED.midsize_price,
  truck_price = EXCLUDED.truck_price,
  luxury_price = EXCLUDED.luxury_price,
  is_active = EXCLUDED.is_active;
