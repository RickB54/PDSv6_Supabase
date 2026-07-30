-- Remove the strict foreign key constraint so orphaned reviews can still migrate successfully
ALTER TABLE prime_booking_reviews DROP CONSTRAINT IF EXISTS prime_booking_reviews_booking_id_fkey;
