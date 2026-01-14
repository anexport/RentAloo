-- Migration: Add rejection_reason column to user_verifications
-- This enables admins to provide feedback when rejecting verification documents

ALTER TABLE user_verifications
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN user_verifications.rejection_reason IS 'Reason provided by admin when rejecting a verification document';
