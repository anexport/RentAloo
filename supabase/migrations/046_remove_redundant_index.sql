-- ============================================================================
-- Migration: Remove redundant index
-- Description: The UNIQUE constraint on user_id already creates an index.
--              This explicit index is redundant and wastes storage.
-- ============================================================================

DROP INDEX IF EXISTS idx_notification_preferences_user;
