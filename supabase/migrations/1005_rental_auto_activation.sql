-- Function to automatically activate rentals when start_date is reached
CREATE OR REPLACE FUNCTION transition_rentals_to_active()
RETURNS INTEGER AS $$
DECLARE
  activated_count INTEGER := 0;
  booking_record RECORD;
BEGIN
  -- Find all rentals ready to activate
  FOR booking_record IN
    SELECT br.id
    FROM booking_requests br
    WHERE br.status = 'awaiting_start_date'
    AND br.start_date <= CURRENT_DATE
  LOOP
    -- Update status (trigger will validate transition)
    UPDATE booking_requests
    SET
      status = 'active',
      activated_at = COALESCE(activated_at, now()),
      status_updated_at = now()
    WHERE id = booking_record.id;

    -- Log rental event
    INSERT INTO rental_events (booking_id, event_type, event_data, created_at)
    VALUES (
      booking_record.id,
      'rental_started',
      jsonb_build_object('auto_activated', true, 'activation_date', CURRENT_DATE),
      now()
    );

    -- Create notification for both parties
    INSERT INTO notifications (user_id, type, priority, title, message, related_entity_type, related_entity_id, created_at)
    SELECT
      unnest(ARRAY[br.renter_id, e.owner_id]),
      'booking_confirmed',
      'high',
      'Rental Started',
      'Your rental for ' || e.title || ' has started.',
      'booking',
      br.id,
      now()
    FROM booking_requests br
    JOIN equipment e ON e.id = br.equipment_id
    WHERE br.id = booking_record.id;

    activated_count := activated_count + 1;
  END LOOP;

  RETURN activated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION transition_rentals_to_active() TO service_role;

-- Add comment
COMMENT ON FUNCTION transition_rentals_to_active() IS
  'Automatically activates rentals when start_date is reached. Called by pg_cron every hour.';

-- Schedule cron job (runs every hour at minute 0)
SELECT cron.schedule(
  'activate-rentals-hourly',
  '0 * * * *',
  $$SELECT transition_rentals_to_active()$$
);
