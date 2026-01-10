-- Migration: 048_fix_notification_triggers_column_names.sql
-- Description: Fix trigger functions to use correct profile column names (full_name, username instead of display_name, first_name)
-- Created: 2026-01-10

-- ============================================================================
-- FIX: NOTIFY ON NEW MESSAGE TRIGGER
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
  -- Use full_name or username instead of display_name/first_name
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

-- ============================================================================
-- FIX: NOTIFY ON NEW REVIEW TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_new_review()
RETURNS TRIGGER AS $$
DECLARE
  v_reviewer_name TEXT;
BEGIN
  -- Get reviewer display name (avoid exposing email for privacy)
  -- Use full_name or username instead of display_name/first_name
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
