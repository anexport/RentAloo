-- Add new granular status values to booking_status enum
-- Note: PostgreSQL doesn't allow reordering, but we add them logically

-- Add new transitional states
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'paid' AFTER 'pending';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'awaiting_pickup_inspection' AFTER 'paid';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'awaiting_start_date' AFTER 'awaiting_pickup_inspection';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'awaiting_return_inspection' AFTER 'active';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_owner_review' AFTER 'awaiting_return_inspection';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'disputed' AFTER 'completed';

-- Add tracking columns
ALTER TABLE booking_requests
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE booking_requests
ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN booking_requests.status_updated_at IS 'Timestamp of last status change';
COMMENT ON COLUMN booking_requests.disputed_at IS 'Timestamp when rental entered disputed state';
