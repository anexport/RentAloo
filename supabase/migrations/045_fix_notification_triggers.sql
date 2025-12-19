-- ============================================================================
-- Migration: Fix notification triggers
-- Description:
--   1. Fix promotion notifications to use promotion_notifications preference
--   2. Fix cancelled booking notifications to use booking id instead of request id
-- ============================================================================

-- ============================================================================
-- FIX 1: Update create_notification to handle promotion category separately
-- ============================================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_group_key TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_priority notification_priority;
  v_category TEXT;
  v_pref_enabled BOOLEAN;
BEGIN
  -- Determine the category from the notification type
  v_category := CASE
    WHEN p_type IN ('booking_confirmed', 'booking_cancelled', 'booking_completed', 'booking_reminder') THEN 'booking'
    WHEN p_type = 'new_message' THEN 'message'
    WHEN p_type IN ('payment_received', 'payment_processed', 'payout_sent', 'refund_issued') THEN 'payment'
    WHEN p_type = 'review_received' THEN 'review'
    WHEN p_type IN ('verification_approved', 'verification_rejected', 'verification_reminder') THEN 'verification'
    WHEN p_type IN ('equipment_favorited', 'equipment_views_milestone') THEN 'equipment'
    WHEN p_type = 'system_announcement' THEN 'system'
    WHEN p_type = 'promotion' THEN 'promotion'
    ELSE 'system'
  END;

  -- Check if user has this notification category enabled
  SELECT CASE v_category
    WHEN 'booking' THEN np.booking_notifications
    WHEN 'message' THEN np.message_notifications
    WHEN 'payment' THEN np.payment_notifications
    WHEN 'review' THEN np.review_notifications
    WHEN 'verification' THEN np.verification_notifications
    WHEN 'equipment' THEN np.equipment_notifications
    WHEN 'system' THEN np.system_notifications
    WHEN 'promotion' THEN np.promotion_notifications
    ELSE TRUE
  END INTO v_pref_enabled
  FROM notification_preferences np
  WHERE np.user_id = p_user_id;

  -- Default to enabled if no preferences exist
  IF v_pref_enabled IS NULL THEN
    v_pref_enabled := TRUE;
  END IF;

  -- Only create notification if enabled
  IF v_pref_enabled THEN
    -- Determine priority based on notification type
    v_priority := CASE
      WHEN p_type IN ('booking_cancelled', 'payment_received', 'refund_issued') THEN 'high'::notification_priority
      WHEN p_type IN ('booking_confirmed', 'booking_completed', 'payout_sent', 'verification_approved', 'verification_rejected') THEN 'medium'::notification_priority
      WHEN p_type IN ('new_message', 'review_received', 'booking_reminder') THEN 'medium'::notification_priority
      WHEN p_type IN ('equipment_favorited', 'equipment_views_milestone', 'promotion') THEN 'low'::notification_priority
      ELSE 'low'::notification_priority
    END;

    INSERT INTO notifications (
      user_id,
      type,
      priority,
      title,
      message,
      related_entity_type,
      related_entity_id,
      actor_id,
      group_key
    ) VALUES (
      p_user_id,
      p_type,
      v_priority,
      p_title,
      p_message,
      p_related_entity_type,
      p_related_entity_id,
      p_actor_id,
      p_group_key
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- FIX 2: Update cancelled booking notification to use booking id
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_booking_request_cancelled()
RETURNS TRIGGER AS $$
DECLARE
  v_equipment_title TEXT;
  v_owner_id UUID;
  v_booking_id UUID;
BEGIN
  -- Only trigger on cancellation
  IF NEW.status != 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Try to find the associated booking (may not exist if cancelled before approval)
  SELECT id INTO v_booking_id
  FROM bookings
  WHERE booking_request_id = NEW.id;

  -- Get equipment details
  SELECT e.title, e.owner_id
  INTO v_equipment_title, v_owner_id
  FROM equipment e
  WHERE e.id = NEW.equipment_id;

  -- Notify renter
  PERFORM create_notification(
    NEW.renter_id,
    'booking_cancelled'::notification_type,
    'Booking Cancelled',
    format('Your booking for %s has been cancelled', v_equipment_title),
    'booking',
    v_booking_id,  -- Use booking id (may be NULL if no booking exists yet)
    NULL,
    NULL
  );

  -- Notify owner
  PERFORM create_notification(
    v_owner_id,
    'booking_cancelled'::notification_type,
    'Booking Cancelled',
    format('A booking for %s has been cancelled', v_equipment_title),
    'booking',
    v_booking_id,  -- Use booking id (may be NULL if no booking exists yet)
    NEW.renter_id,
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
