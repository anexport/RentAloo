-- Migration: Add 'rejected' value to verification_status enum
-- This enables the admin rejection workflow for user verifications

-- Add 'rejected' to the verification_status enum
ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'rejected';

COMMENT ON TYPE verification_status IS 'Status of a user verification: unverified, pending, verified, or rejected';
