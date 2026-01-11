-- Migration: 041_notifications_schema.sql
-- Description: Create notifications table with RLS policies
-- Created: 2025-12-18

-- ============================================================================
-- NOTIFICATION TYPES ENUM
-- ============================================================================

CREATE TYPE notification_type AS ENUM (
  -- Booking lifecycle
  'booking_confirmed',
  'booking_cancelled',
  'booking_completed',
  'booking_reminder',
  -- Messages
  'new_message',
  -- Payments
  'payment_received',
  'payment_processed',
  'payout_sent',
  'refund_issued',
  -- Reviews
  'review_received',
  -- Verification
  'verification_approved',
  'verification_rejected',
  'verification_reminder',
  -- Equipment activity
  'equipment_favorited',
  'equipment_views_milestone',
  -- System
  'system_announcement',
  'promotion'
);

-- ============================================================================
-- NOTIFICATION PRIORITY ENUM
-- ============================================================================

CREATE TYPE notification_priority AS ENUM (
  'low',      -- Equipment favorited, views milestone
  'medium',   -- New message
  'high',     -- Booking confirmed, review received
  'critical'  -- Payment received, payout sent
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Link to related entity for navigation
  related_entity_type TEXT, -- 'booking', 'equipment', 'conversation', 'review', 'payment'
  related_entity_id UUID,
  
  -- Actor who triggered the notification (for avatar display)
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- State management
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  
  -- Grouping key for similar notifications (e.g., 'messages:conv-123')
  group_key TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON COLUMN notifications.related_entity_type IS 'Type of entity this notification links to: booking, equipment, conversation, review, payment';
COMMENT ON COLUMN notifications.group_key IS 'Key for grouping similar notifications, e.g., messages:conversation_id';
COMMENT ON COLUMN notifications.priority IS 'Used to determine if a toast popup should be shown';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary query: unread notifications for a user (most common)
CREATE INDEX idx_notifications_user_unread 
  ON notifications(user_id, created_at DESC) 
  WHERE NOT is_archived AND NOT is_read;

-- All notifications for a user (notification panel)
CREATE INDEX idx_notifications_user_all 
  ON notifications(user_id, created_at DESC) 
  WHERE NOT is_archived;

-- Grouping query
CREATE INDEX idx_notifications_group_key 
  ON notifications(user_id, group_key, created_at DESC) 
  WHERE group_key IS NOT NULL AND NOT is_archived;

-- Archive cleanup cron job
CREATE INDEX idx_notifications_archive_cleanup 
  ON notifications(created_at) 
  WHERE is_archived = TRUE;

-- Actor lookup for avatar
CREATE INDEX idx_notifications_actor 
  ON notifications(actor_id) 
  WHERE actor_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark read, archive)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Only service role can insert (via triggers/functions)
-- No INSERT policy for regular users - notifications created by system only

-- ============================================================================
-- REALTIME
-- ============================================================================

-- Enable realtime for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
