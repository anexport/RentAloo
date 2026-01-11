-- Migration: 044_notification_functions.sql
-- Description: RPC functions for notification operations
-- Created: 2025-12-18

-- ============================================================================
-- GET UNREAD NOTIFICATION COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION get_notification_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE user_id = auth.uid()
    AND NOT is_read
    AND NOT is_archived;
$$ LANGUAGE SQL STABLE SECURITY INVOKER;

COMMENT ON FUNCTION get_notification_count IS 'Returns the count of unread, non-archived notifications for the authenticated user';

-- ============================================================================
-- MARK SINGLE NOTIFICATION AS READ
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE notifications 
  SET is_read = TRUE, read_at = NOW()
  WHERE id = p_notification_id 
    AND user_id = auth.uid()
    AND NOT is_read
  RETURNING TRUE INTO v_updated;
  
  RETURN COALESCE(v_updated, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_notification_read IS 'Mark a single notification as read for the authenticated user';

-- ============================================================================
-- MARK ALL NOTIFICATIONS AS READ
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications 
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = auth.uid()
    AND NOT is_read 
    AND NOT is_archived;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_all_notifications_read IS 'Mark all unread notifications as read for the authenticated user';

-- ============================================================================
-- DELETE NOTIFICATION
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_notification(p_notification_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM notifications 
  WHERE id = p_notification_id 
    AND user_id = auth.uid()
  RETURNING TRUE INTO v_deleted;
  
  RETURN COALESCE(v_deleted, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_notification IS 'Delete a notification for the authenticated user';

-- ============================================================================
-- ARCHIVE NOTIFICATION
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_notification(p_notification_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE notifications 
  SET is_archived = TRUE, archived_at = NOW()
  WHERE id = p_notification_id 
    AND user_id = auth.uid()
    AND NOT is_archived
  RETURNING TRUE INTO v_updated;
  
  RETURN COALESCE(v_updated, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION archive_notification IS 'Archive a notification for the authenticated user';

-- ============================================================================
-- GET NOTIFICATIONS WITH PAGINATION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_notifications(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_include_archived BOOLEAN DEFAULT FALSE,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type notification_type,
  priority notification_priority,
  title TEXT,
  message TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  actor_id UUID,
  is_read BOOLEAN,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN,
  archived_at TIMESTAMPTZ,
  group_key TEXT,
  created_at TIMESTAMPTZ,
  actor_email TEXT,
  actor_avatar_url TEXT
) AS $$
BEGIN
  -- Validate pagination parameters
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  IF p_offset < 0 THEN
    RAISE EXCEPTION 'Offset must be non-negative';
  END IF;

  RETURN QUERY
  SELECT 
    n.id,
    n.user_id,
    n.type,
    n.priority,
    n.title,
    n.message,
    n.related_entity_type,
    n.related_entity_id,
    n.actor_id,
    n.is_read,
    n.read_at,
    n.is_archived,
    n.archived_at,
    n.group_key,
    n.created_at,
    p.email AS actor_email,
    p.avatar_url AS actor_avatar_url
  FROM notifications n
  LEFT JOIN profiles p ON p.id = n.actor_id
  WHERE n.user_id = auth.uid()
    AND (p_include_archived OR NOT n.is_archived)
    AND (p_category IS NULL OR 
         (p_category = 'booking' AND n.type IN ('booking_confirmed', 'booking_cancelled', 'booking_completed', 'booking_reminder')) OR
         (p_category = 'message' AND n.type = 'new_message') OR
         (p_category = 'payment' AND n.type IN ('payment_received', 'payment_processed', 'payout_sent', 'refund_issued')) OR
         (p_category = 'review' AND n.type = 'review_received') OR
         (p_category = 'verification' AND n.type IN ('verification_approved', 'verification_rejected', 'verification_reminder')) OR
         (p_category = 'equipment' AND n.type IN ('equipment_favorited', 'equipment_views_milestone')) OR
         (p_category = 'system' AND n.type IN ('system_announcement', 'promotion'))
    )
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_notifications IS 'Get paginated notifications with optional category filter and actor info';

-- ============================================================================
-- ARCHIVE OLD NOTIFICATIONS (for cron job)
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_archived INTEGER;
  v_deleted INTEGER;
  v_role TEXT;
BEGIN
  -- Only allow service_role to call this function (for cron jobs)
  v_role := current_setting('request.jwt.claims', true)::json->>'role';
  IF v_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only service_role can call this function';
  END IF;

  -- Archive notifications older than 30 days
  UPDATE notifications
  SET is_archived = TRUE, archived_at = NOW()
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND NOT is_archived;

  GET DIAGNOSTICS v_archived = ROW_COUNT;

  -- Delete notifications archived more than 60 days ago
  DELETE FROM notifications
  WHERE archived_at < NOW() - INTERVAL '60 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RAISE NOTICE 'Archived % notifications, deleted % old archived notifications', v_archived, v_deleted;

  RETURN v_archived + v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION archive_old_notifications IS 'Archive notifications older than 30 days and delete those archived more than 60 days ago';

-- ============================================================================
-- SCHEDULE ARCHIVE CLEANUP (using pg_cron if available)
-- ============================================================================

-- Note: This requires pg_cron extension. Run this manually or via Supabase Dashboard:
-- SELECT cron.schedule('archive-old-notifications', '0 3 * * *', 'SELECT archive_old_notifications()');
