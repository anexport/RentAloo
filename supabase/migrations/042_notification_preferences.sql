-- Migration: 042_notification_preferences.sql
-- Description: User notification preferences table
-- Created: 2025-12-18

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================================

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Per-category in-app notification toggles (all default to true)
  booking_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  message_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  payment_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  review_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  verification_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  equipment_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  system_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  promotion_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Toast popup preferences (which priority levels show toasts)
  toast_critical BOOLEAN NOT NULL DEFAULT TRUE,   -- Always show critical (payments)
  toast_high BOOLEAN NOT NULL DEFAULT TRUE,       -- Show high priority (confirmations)
  toast_medium BOOLEAN NOT NULL DEFAULT FALSE,    -- Don't show medium by default (messages)
  toast_low BOOLEAN NOT NULL DEFAULT FALSE,       -- Don't show low by default (favorites)
  
  -- Quiet hours (optional - suppress toasts during these hours)
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One preferences record per user
  CONSTRAINT notification_preferences_user_unique UNIQUE (user_id)
);

-- Comments for documentation
COMMENT ON TABLE notification_preferences IS 'User preferences for in-app notification behavior';
COMMENT ON COLUMN notification_preferences.toast_critical IS 'Show toast popups for critical notifications (payments, refunds)';
COMMENT ON COLUMN notification_preferences.quiet_hours_enabled IS 'When enabled, suppress toast notifications during quiet hours';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup by user_id (already covered by unique constraint, but explicit for clarity)
CREATE INDEX idx_notification_preferences_user 
  ON notification_preferences(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences (first time setup)
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- AUTO-UPDATE TRIGGER
-- ============================================================================

-- Update the updated_at timestamp on changes
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DEFAULT PREFERENCES ON USER CREATION
-- ============================================================================

-- Create default notification preferences when a new profile is created
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_create_notification_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();
