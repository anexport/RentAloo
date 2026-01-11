-- Enable Row Level Security for equipment inspections and allow admins to review them.

ALTER TABLE equipment_inspections ENABLE ROW LEVEL SECURITY;

-- Admins can manage all equipment inspections.
DROP POLICY IF EXISTS "Admins can manage equipment inspections" ON equipment_inspections;
CREATE POLICY "Admins can manage equipment inspections"
ON equipment_inspections
FOR ALL
USING (is_admin(auth.uid()));

-- Renters and owners can view inspections for their bookings.
DROP POLICY IF EXISTS "Users can view inspections for their bookings" ON equipment_inspections;
CREATE POLICY "Users can view inspections for their bookings"
ON equipment_inspections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM booking_requests br
    WHERE br.id = equipment_inspections.booking_id
    AND br.renter_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM booking_requests br
    JOIN equipment e ON e.id = br.equipment_id
    WHERE br.id = equipment_inspections.booking_id
    AND e.owner_id = auth.uid()
  )
);

-- Renters can create inspections for their bookings.
DROP POLICY IF EXISTS "Renters can create inspections for their bookings" ON equipment_inspections;
CREATE POLICY "Renters can create inspections for their bookings"
ON equipment_inspections
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM booking_requests br
    WHERE br.id = equipment_inspections.booking_id
    AND br.renter_id = auth.uid()
  )
);
