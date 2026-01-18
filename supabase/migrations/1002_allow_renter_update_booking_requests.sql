-- Allow renters to update their booking requests (e.g., review timestamps)
DROP POLICY IF EXISTS "Equipment owners can update booking requests for their equipment" ON booking_requests;
DROP POLICY IF EXISTS "Authenticated users can update booking requests" ON booking_requests;

CREATE POLICY "Authenticated users can update booking requests" ON booking_requests
FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = renter_id
    OR EXISTS (
      SELECT 1
      FROM equipment
      WHERE equipment.id = booking_requests.equipment_id
        AND equipment.owner_id = auth.uid()
    )
  )
);
