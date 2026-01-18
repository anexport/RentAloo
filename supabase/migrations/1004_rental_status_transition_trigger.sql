-- Create function to validate booking status transitions
CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions TEXT[][] := ARRAY[
    -- From pending
    ARRAY['pending', 'paid'],
    ARRAY['pending', 'declined'],
    ARRAY['pending', 'cancelled'],
    -- From paid (transitional, usually skipped)
    ARRAY['paid', 'awaiting_pickup_inspection'],
    ARRAY['paid', 'cancelled'],
    -- From awaiting_pickup_inspection
    ARRAY['awaiting_pickup_inspection', 'awaiting_start_date'],
    ARRAY['awaiting_pickup_inspection', 'cancelled'],
    -- From awaiting_start_date
    ARRAY['awaiting_start_date', 'active'],
    ARRAY['awaiting_start_date', 'cancelled'],
    -- From active
    ARRAY['active', 'awaiting_return_inspection'],
    -- From awaiting_return_inspection
    ARRAY['awaiting_return_inspection', 'pending_owner_review'],
    -- From pending_owner_review
    ARRAY['pending_owner_review', 'completed'],
    ARRAY['pending_owner_review', 'disputed'],
    -- From disputed
    ARRAY['disputed', 'completed'],
    -- Legacy support: approved -> new states (for migration)
    ARRAY['approved', 'awaiting_pickup_inspection'],
    ARRAY['approved', 'awaiting_start_date'],
    ARRAY['approved', 'active'],
    ARRAY['approved', 'cancelled']
  ];
  transition TEXT[];
  is_valid BOOLEAN := FALSE;
BEGIN
  -- Allow if status unchanged
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Check if transition is valid
  FOREACH transition SLICE 1 IN ARRAY valid_transitions
  LOOP
    IF OLD.status::TEXT = transition[1] AND NEW.status::TEXT = transition[2] THEN
      is_valid := TRUE;
      EXIT;
    END IF;
  END LOOP;

  IF NOT is_valid THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status
      USING HINT = 'Check valid transitions in validate_booking_status_transition()';
  END IF;

  -- Update timestamp on status change
  NEW.status_updated_at := now();

  -- Set disputed_at when entering disputed state
  IF NEW.status = 'disputed' AND OLD.status != 'disputed' THEN
    NEW.disputed_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS booking_status_transition_check ON booking_requests;
CREATE TRIGGER booking_status_transition_check
  BEFORE UPDATE OF status ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_status_transition();

-- Add comment
COMMENT ON FUNCTION validate_booking_status_transition() IS
  'Validates booking status transitions follow the defined state machine. Prevents invalid state changes.';
