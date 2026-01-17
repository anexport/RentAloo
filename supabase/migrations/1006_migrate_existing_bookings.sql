-- Migrate existing 'approved' bookings to appropriate new statuses
-- Based on their actual state (inspections, dates)

-- 1. approved + payment + no pickup inspection → awaiting_pickup_inspection
UPDATE booking_requests br
SET
  status = 'awaiting_pickup_inspection',
  status_updated_at = now()
WHERE br.status = 'approved'
AND EXISTS (
  SELECT 1 FROM payments p
  WHERE p.booking_request_id = br.id
  AND p.payment_status = 'succeeded'
)
AND NOT EXISTS (
  SELECT 1 FROM equipment_inspections ei
  WHERE ei.booking_id = br.id
  AND ei.inspection_type = 'pickup'
  AND ei.verified_by_renter = true
);

-- 2. approved + pickup inspection + start_date NOT reached → awaiting_start_date
UPDATE booking_requests br
SET
  status = 'awaiting_start_date',
  status_updated_at = now()
WHERE br.status = 'approved'
AND EXISTS (
  SELECT 1 FROM equipment_inspections ei
  WHERE ei.booking_id = br.id
  AND ei.inspection_type = 'pickup'
  AND ei.verified_by_renter = true
)
AND br.start_date > CURRENT_DATE;

-- 3. approved + pickup inspection + start_date reached → active
UPDATE booking_requests br
SET
  status = 'active',
  activated_at = COALESCE(br.activated_at, now()),
  status_updated_at = now()
WHERE br.status = 'approved'
AND EXISTS (
  SELECT 1 FROM equipment_inspections ei
  WHERE ei.booking_id = br.id
  AND ei.inspection_type = 'pickup'
  AND ei.verified_by_renter = true
)
AND br.start_date <= CURRENT_DATE;

-- 4. active + return inspection (renter done, owner not) → pending_owner_review
UPDATE booking_requests br
SET
  status = 'pending_owner_review',
  status_updated_at = now()
WHERE br.status = 'active'
AND EXISTS (
  SELECT 1 FROM equipment_inspections ei
  WHERE ei.booking_id = br.id
  AND ei.inspection_type = 'return'
  AND ei.verified_by_renter = true
  AND ei.verified_by_owner = false
);

-- Log migration in rental_events for any bookings that were migrated
INSERT INTO rental_events (booking_id, event_type, event_data, created_at)
SELECT
  id,
  'rental_started',
  jsonb_build_object('migrated', true, 'migration_date', CURRENT_TIMESTAMP),
  now()
FROM booking_requests
WHERE status IN ('awaiting_pickup_inspection', 'awaiting_start_date', 'pending_owner_review')
AND NOT EXISTS (
  SELECT 1 FROM rental_events re
  WHERE re.booking_id = booking_requests.id
  AND re.event_data->>'migrated' = 'true'
);
