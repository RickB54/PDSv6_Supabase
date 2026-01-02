ALTER TABLE chemical_library
ADD COLUMN IF NOT EXISTS video_urls text[];
