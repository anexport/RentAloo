-- ============================================================================
-- Migration: Fix notify_on_booking_created trigger
-- Description: 
--   The notify_on_booking_created() function was incorrectly referencing
--   NEW.renter_id, NEW.equipment_id, and NEW.total_amount which don't exist
--   on the bookings table. The bookings table only has booking_request_id,
--   so we need to join to booking_requests to get these values.
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  v_equipment_title TEXT;
  v_owner_id UUID;
  v_renter_id UUID;
  v_amount NUMERIC;
  v_equipment_id UUID;
BEGIN
  -- Get booking request, equipment details via join
  -- NEW only has booking_request_id on the bookings table
  SELECT e.title, e.owner_id, br.renter_id, br.total_amount, br.equipment_id
  INTO v_equipment_title, v_owner_id, v_renter_id, v_amount, v_equipment_id
  FROM booking_requests br
  JOIN equipment e ON e.id = br.equipment_id
  WHERE br.id = NEW.booking_request_id;
  
  -- Exit if we couldn't find the booking request or any required data (shouldn't happen but be safe)
  IF v_renter_id IS NULL OR v_owner_id IS NULL OR v_equipment_id IS NULL OR v_equipment_title IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Notify owner: new booking confirmed
  PERFORM create_notification(
    v_owner_id,
    'booking_confirmed'::notification_type,
    'New Booking Confirmed',
    format('You have a new booking for %s - $%s', v_equipment_title, v_amount),
    'booking',
    NEW.id,
    v_renter_id,
    format('booking:%s', NEW.id)
  );
  
  -- Notify renter: booking confirmed
  PERFORM create_notification(
    v_renter_id,
    'booking_confirmed'::notification_type,
    'Booking Confirmed!',
    format('Your booking for %s is confirmed', v_equipment_title),
    'booking',
    NEW.id,
    v_owner_id,
    format('booking:%s', NEW.id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
