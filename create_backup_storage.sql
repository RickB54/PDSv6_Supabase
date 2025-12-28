-- Create Supabase Storage Bucket for Backups
-- Run this in Supabase SQL Editor

-- 1. Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-backups', 'app-backups', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Create backup metadata table
CREATE TABLE IF NOT EXISTS backup_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, filename)
);

-- 3. Enable RLS on backup_metadata
ALTER TABLE backup_metadata ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for backup_metadata
CREATE POLICY "Users can view their own backup metadata"
  ON backup_metadata FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backup metadata"
  ON backup_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backup metadata"
  ON backup_metadata FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Storage Policies for app-backups bucket
CREATE POLICY "Users can upload their own backups"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'app-backups' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own backups"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'app-backups' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own backups"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'app-backups' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_backup_metadata_user_created 
  ON backup_metadata(user_id, created_at DESC);

-- Verification queries
SELECT * FROM storage.buckets WHERE id = 'app-backups';
SELECT * FROM backup_metadata LIMIT 5;
