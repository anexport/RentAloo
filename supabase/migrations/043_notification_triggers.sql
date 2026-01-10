-- Migration: 043_notification_triggers.sql
-- Description: Database triggers that automatically create notifications
-- Created: 2025-12-18

-- ============================================================================
-- HELPER: GET NOTIFICATION PRIORITY BY TYPE
-- ============================================================================

CREATE OR REPLACE FUNCTION get_notification_priority(p_type notification_type)
RETURNS notification_priority AS $$
BEGIN
  RETURN CASE p_type
    -- Critical: Money-related
    WHEN 'payment_received' THEN 'critical'::notification_priority
    WHEN 'payout_sent' THEN 'critical'::notification_priority
    WHEN 'refund_issued' THEN 'critical'::notification_priority
    -- High: Important actions
    WHEN 'booking_confirmed' THEN 'high'::notification_priority
    WHEN 'booking_cancelled' THEN 'high'::notification_priority
    WHEN 'booking_completed' THEN 'high'::notification_priority
    WHEN 'review_received' THEN 'high'::notification_priority
    WHEN 'verification_approved' THEN 'high'::notification_priority
    WHEN 'verification_rejected' THEN 'high'::notification_priority
    -- Medium: Regular activity
    WHEN 'new_message' THEN 'medium'::notification_priority
    WHEN 'booking_reminder' THEN 'medium'::notification_priority
    WHEN 'verification_reminder' THEN 'medium'::notification_priority
    WHEN 'system_announcement' THEN 'medium'::notification_priority
    -- Low: Nice to know
    WHEN 'equipment_favorited' THEN 'low'::notification_priority
    WHEN 'equipment_views_milestone' THEN 'low'::notification_priority
    WHEN 'promotion' THEN 'low'::notification_priority
    ELSE 'medium'::notification_priority
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- HELPER: CREATE NOTIFICATION (with preference check)
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
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
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
    WHEN p_type IN ('system_announcement', 'promotion') THEN 'system'
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
      get_notification_priority(p_type),
      p_title,
      p_message,
      p_related_entity_type,
      p_related_entity_id,
      p_actor_id,
      p_group_key
    )
    RETURNING id INTO v_notification_id;
  END IF;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: ON BOOKING CONFIRMED (after payment creates booking)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  v_equipment_title TEXT;
  v_owner_id UUID;
  v_renter_id UUID;
  v_amount NUMERIC;
BEGIN
  -- Get equipment details
  SELECT e.title, e.owner_id, NEW.renter_id, NEW.total_amount
  INTO v_equipment_title, v_owner_id, v_renter_id, v_amount
  FROM equipment e
  WHERE e.id = NEW.equipment_id;
  
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

CREATE TRIGGER on_booking_created_notify
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_booking_created();

-- ============================================================================
-- TRIGGER: ON BOOKING STATUS CHANGE
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_equipment_title TEXT;
  v_owner_id UUID;
  v_renter_id UUID;
  v_booking_request RECORD;
BEGIN
  -- Only trigger on status changes
  IF OLD.payment_status = NEW.payment_status THEN
    RETURN NEW;
  END IF;
  
  -- Get booking request and equipment details
  SELECT br.*, e.title AS equipment_title, e.owner_id
  INTO v_booking_request
  FROM booking_requests br
  JOIN equipment e ON e.id = br.equipment_id
  WHERE br.id = NEW.booking_request_id;
  
  v_equipment_title := v_booking_request.equipment_title;
  v_owner_id := v_booking_request.owner_id;
  v_renter_id := v_booking_request.renter_id;
  
  -- Handle different status transitions
  -- Completed
  IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
    -- Notify renter: rental complete
    PERFORM create_notification(
      v_renter_id,
      'booking_completed'::notification_type,
      'Rental Complete!',
      format('Your rental of %s is complete. Leave a review!', v_equipment_title),
      'booking',
      NEW.id,
      v_owner_id,
      NULL
    );
    
    -- Notify owner: rental complete
    PERFORM create_notification(
      v_owner_id,
      'booking_completed'::notification_type,
      'Rental Completed',
      format('Rental of %s has been completed', v_equipment_title),
      'booking',
      NEW.id,
      v_renter_id,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_booking_status_change_notify
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_booking_status_change();

-- ============================================================================
-- TRIGGER: ON BOOKING REQUEST CANCELLED
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_booking_request_cancelled()
RETURNS TRIGGER AS $$
DECLARE
  v_equipment_title TEXT;
  v_owner_id UUID;
BEGIN
  -- Only trigger on cancellation
  IF NEW.status != 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;
  
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
    NEW.id,
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
    NEW.id,
    NEW.renter_id,
    NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_booking_request_cancelled_notify
  AFTER UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_booking_request_cancelled();

-- ============================================================================
-- TRIGGER: ON NEW MESSAGE
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_recipient RECORD;
BEGIN
  -- Skip system messages
  IF NEW.message_type != 'text' THEN
    RETURN NEW;
  END IF;

  -- Get sender display name (avoid exposing email for privacy)
  SELECT COALESCE(full_name, username, 'Someone') INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Notify all other participants in the conversation
  FOR v_recipient IN
    SELECT cp.profile_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.profile_id != NEW.sender_id
  LOOP
    PERFORM create_notification(
      v_recipient.profile_id,
      'new_message'::notification_type,
      'New Message',
      format('New message from %s', v_sender_name),
      'conversation',
      NEW.conversation_id,
      NEW.sender_id,
      format('messages:%s', NEW.conversation_id)  -- Group by conversation
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();

-- ============================================================================
-- TRIGGER: ON PAYMENT PAYOUT
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_payout()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_equipment_title TEXT;
BEGIN
  -- Only trigger when payout status changes to 'completed'
  IF NEW.payout_status != 'completed' OR OLD.payout_status = 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Get owner and equipment info
  SELECT e.owner_id, e.title
  INTO v_owner_id, v_equipment_title
  FROM booking_requests br
  JOIN equipment e ON e.id = br.equipment_id
  WHERE br.id = NEW.booking_request_id;
  
  -- Notify owner of payout
  PERFORM create_notification(
    v_owner_id,
    'payout_sent'::notification_type,
    'Payout Sent!',
    format('$%s has been sent to your account for %s', NEW.owner_amount, v_equipment_title),
    'payment',
    NEW.id,
    NULL,
    NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_payout_notify
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_payout();

-- ============================================================================
-- TRIGGER: ON REFUND
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_refund()
RETURNS TRIGGER AS $$
DECLARE
  v_renter_id UUID;
  v_equipment_title TEXT;
BEGIN
  -- Only trigger when escrow status changes to 'refunded'
  IF NEW.escrow_status != 'refunded' OR OLD.escrow_status = 'refunded' THEN
    RETURN NEW;
  END IF;
  
  -- Get renter and equipment info
  SELECT br.renter_id, e.title
  INTO v_renter_id, v_equipment_title
  FROM booking_requests br
  JOIN equipment e ON e.id = br.equipment_id
  WHERE br.id = NEW.booking_request_id;
  
  -- Notify renter of refund
  PERFORM create_notification(
    v_renter_id,
    'refund_issued'::notification_type,
    'Refund Issued',
    format('A refund of $%s has been issued for %s', NEW.total_amount, v_equipment_title),
    'payment',
    NEW.id,
    NULL,
    NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_refund_notify
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_refund();

-- ============================================================================
-- TRIGGER: ON NEW REVIEW
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_new_review()
RETURNS TRIGGER AS $$
DECLARE
  v_reviewer_name TEXT;
BEGIN
  -- Get reviewer display name (avoid exposing email for privacy)
  SELECT COALESCE(full_name, username, 'someone') INTO v_reviewer_name
  FROM profiles
  WHERE id = NEW.reviewer_id;

  -- Notify the reviewee
  PERFORM create_notification(
    NEW.reviewee_id,
    'review_received'::notification_type,
    'New Review',
    format('You received a %s-star review from %s', NEW.rating, v_reviewer_name),
    'review',
    NEW.id,
    NEW.reviewer_id,
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_review_notify
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_review();

-- ============================================================================
-- TRIGGER: ON EQUIPMENT FAVORITED
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_equipment_favorited()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_equipment_title TEXT;
BEGIN
  -- Get equipment owner and title
  SELECT e.owner_id, e.title
  INTO v_owner_id, v_equipment_title
  FROM equipment e
  WHERE e.id = NEW.equipment_id;

  -- Don't notify if owner favorited their own equipment
  IF v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Notify owner (using "Someone" for privacy)
  PERFORM create_notification(
    v_owner_id,
    'equipment_favorited'::notification_type,
    'Equipment Favorited',
    format('Someone saved %s to their favorites', v_equipment_title),
    'equipment',
    NEW.equipment_id,
    NEW.user_id,
    format('favorites:%s', NEW.equipment_id)  -- Group favorites by equipment
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_equipment_favorited_notify
  AFTER INSERT ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_equipment_favorited();
