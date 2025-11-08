-- Migration: Fix booking payment_status sync on creation
-- This migration updates handle_booking_approval to check payment status
-- when creating a booking record, ensuring payment_status is synced correctly
-- even if the payment was updated before the booking was created.

-- Update function to handle booking approval with payment status sync
CREATE OR REPLACE FUNCTION handle_booking_approval()
RETURNS TRIGGER AS $$
DECLARE
  date_range_days INTEGER;
  max_booking_days INTEGER := 30;
  payment_status_value TEXT;
BEGIN
  -- Only process if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Validate date range (maximum 30 days)
    date_range_days := (NEW.end_date - NEW.start_date) + 1;
    IF date_range_days > max_booking_days THEN
      RAISE EXCEPTION 'Booking date range exceeds maximum allowed period of % days', max_booking_days;
    END IF;
    
    -- Validate that end_date is after start_date
    IF NEW.end_date < NEW.start_date THEN
      RAISE EXCEPTION 'Invalid date range: end_date must be after start_date';
    END IF;
    
    -- Check if payment exists and get its status
    -- Use COALESCE to default to 'pending' if no payment exists
    SELECT COALESCE(
      (SELECT payment_status 
       FROM payments 
       WHERE booking_request_id = NEW.id 
       ORDER BY created_at DESC 
       LIMIT 1),
      'pending'
    ) INTO payment_status_value;
    
    -- Create bookings record if it doesn't exist
    -- Use payment status if available, otherwise default to 'pending'
    INSERT INTO bookings (booking_request_id, payment_status, return_status)
    VALUES (NEW.id, payment_status_value, 'pending')
    ON CONFLICT (booking_request_id) DO UPDATE
    SET payment_status = payment_status_value;
    
    -- Mark dates as unavailable in availability_calendar using set-based approach
    INSERT INTO availability_calendar (equipment_id, date, is_available)
    SELECT NEW.equipment_id, date_series::date, false
    FROM generate_series(NEW.start_date, NEW.end_date, '1 day'::interval) AS date_series
    ON CONFLICT (equipment_id, date)
    DO UPDATE SET is_available = false;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security: This function is trigger-only and should not be directly executable by users
-- Revoke any existing grants (safe to run even if grants don't exist):
REVOKE EXECUTE ON FUNCTION handle_booking_approval() FROM authenticated;

