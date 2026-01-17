-- Switch reviews.booking_id to reference booking_requests instead of bookings
ALTER TABLE reviews
DROP CONSTRAINT IF EXISTS reviews_booking_id_fkey;

-- Backfill booking_id from bookings -> booking_requests
UPDATE reviews r
SET booking_id = b.booking_request_id
FROM bookings b
WHERE r.booking_id = b.id;

-- Recreate FK to booking_requests
ALTER TABLE reviews
ADD CONSTRAINT reviews_booking_id_fkey
FOREIGN KEY (booking_id) REFERENCES booking_requests(id) ON DELETE CASCADE;

-- Update insert policy to allow renter or owner to review
DROP POLICY IF EXISTS "Users can create reviews for their bookings" ON reviews;

CREATE POLICY "Users can create reviews for their bookings" ON reviews
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM booking_requests br
    JOIN equipment e ON e.id = br.equipment_id
    WHERE br.id = reviews.booking_id
      AND (br.renter_id = auth.uid() OR e.owner_id = auth.uid())
  )
);
