-- SQL Script to create the prime_booking_reviews table
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS prime_booking_reviews (
  booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  performance TEXT,
  mistakes TEXT,
  sentiment TEXT,
  google_review BOOLEAN DEFAULT false,
  google_stars INTEGER,
  google_review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE prime_booking_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for authenticated users" 
ON prime_booking_reviews 
FOR ALL 
USING (auth.role() = 'authenticated');
