# Unified Rental State System - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace fragmented rental state tracking with a unified system - granular status enum, validated transitions via Edge Function, and React Context for frontend coordination.

**Architecture:** Database-first approach. Add new status enum values, create validation trigger, then Edge Function for transition API, finally React Context that consumes the API. Migrate existing data last.

**Tech Stack:** Supabase (PostgreSQL, Edge Functions, Realtime), React Context, TypeScript

**Design Document:** `docs/plans/2026-01-18-unified-rental-state-design.md`

---

## Phase 1: Database Foundation

### Task 1.1: Add New Status Enum Values

**Files:**
- Create: `supabase/migrations/20260118000001_add_rental_status_values.sql`

**Step 1: Create the migration file**

```sql
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
```

**Step 2: Apply migration via Supabase MCP**

Run: `mcp__supabase__apply_migration` with name `add_rental_status_values`

**Step 3: Verify enum values exist**

```sql
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'booking_status')
ORDER BY enumsortorder;
```

Expected: Should include `paid`, `awaiting_pickup_inspection`, `awaiting_start_date`, `awaiting_return_inspection`, `pending_owner_review`, `disputed`

**Step 4: Commit**

```bash
git add supabase/migrations/20260118000001_add_rental_status_values.sql
git commit -m "feat(db): add granular rental status enum values

Add new booking_status values for detailed lifecycle tracking:
- paid, awaiting_pickup_inspection, awaiting_start_date
- awaiting_return_inspection, pending_owner_review, disputed

Add status_updated_at and disputed_at tracking columns."
```

---

### Task 1.2: Create Status Transition Validation Trigger

**Files:**
- Create: `supabase/migrations/20260118000002_rental_status_transition_trigger.sql`

**Step 1: Create the migration with trigger function**

```sql
-- Create function to validate booking status transitions
CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions TEXT[][] := ARRAY[
    -- From pending
    ARRAY['pending', 'paid'],
    ARRAY['pending', 'declined'],
    ARRAY['pending', 'cancelled'],
    -- From paid (transitional, usually skipped)
    ARRAY['paid', 'awaiting_pickup_inspection'],
    ARRAY['paid', 'cancelled'],
    -- From awaiting_pickup_inspection
    ARRAY['awaiting_pickup_inspection', 'awaiting_start_date'],
    ARRAY['awaiting_pickup_inspection', 'cancelled'],
    -- From awaiting_start_date
    ARRAY['awaiting_start_date', 'active'],
    ARRAY['awaiting_start_date', 'cancelled'],
    -- From active
    ARRAY['active', 'awaiting_return_inspection'],
    -- From awaiting_return_inspection
    ARRAY['awaiting_return_inspection', 'pending_owner_review'],
    -- From pending_owner_review
    ARRAY['pending_owner_review', 'completed'],
    ARRAY['pending_owner_review', 'disputed'],
    -- From disputed
    ARRAY['disputed', 'completed'],
    -- Legacy support: approved -> new states (for migration)
    ARRAY['approved', 'awaiting_pickup_inspection'],
    ARRAY['approved', 'awaiting_start_date'],
    ARRAY['approved', 'active'],
    ARRAY['approved', 'cancelled']
  ];
  transition TEXT[];
  is_valid BOOLEAN := FALSE;
BEGIN
  -- Allow if status unchanged
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Check if transition is valid
  FOREACH transition SLICE 1 IN ARRAY valid_transitions
  LOOP
    IF OLD.status::TEXT = transition[1] AND NEW.status::TEXT = transition[2] THEN
      is_valid := TRUE;
      EXIT;
    END IF;
  END LOOP;

  IF NOT is_valid THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status
      USING HINT = 'Check valid transitions in validate_booking_status_transition()';
  END IF;

  -- Update timestamp on status change
  NEW.status_updated_at := now();

  -- Set disputed_at when entering disputed state
  IF NEW.status = 'disputed' AND OLD.status != 'disputed' THEN
    NEW.disputed_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS booking_status_transition_check ON booking_requests;
CREATE TRIGGER booking_status_transition_check
  BEFORE UPDATE OF status ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_status_transition();

-- Add comment
COMMENT ON FUNCTION validate_booking_status_transition() IS
  'Validates booking status transitions follow the defined state machine. Prevents invalid state changes.';
```

**Step 2: Apply migration**

Run: `mcp__supabase__apply_migration` with name `rental_status_transition_trigger`

**Step 3: Test valid transition**

```sql
-- Create test booking and verify valid transition works
-- (Use existing test data or create temporary)
UPDATE booking_requests
SET status = 'declined'
WHERE status = 'pending'
LIMIT 1;
```

**Step 4: Test invalid transition (should fail)**

```sql
-- This should raise an exception
UPDATE booking_requests
SET status = 'completed'
WHERE status = 'pending'
LIMIT 1;
```

Expected: Error "Invalid status transition from pending to completed"

**Step 5: Commit**

```bash
git add supabase/migrations/20260118000002_rental_status_transition_trigger.sql
git commit -m "feat(db): add status transition validation trigger

Prevents invalid booking status transitions at database level.
Acts as safety net for the Edge Function transition API."
```

---

### Task 1.3: Create Auto-Activation Function and Cron Job

**Files:**
- Create: `supabase/migrations/20260118000003_rental_auto_activation.sql`

**Step 1: Create the migration**

```sql
-- Function to automatically activate rentals when start_date is reached
CREATE OR REPLACE FUNCTION transition_rentals_to_active()
RETURNS INTEGER AS $$
DECLARE
  activated_count INTEGER := 0;
  booking_record RECORD;
BEGIN
  -- Find all rentals ready to activate
  FOR booking_record IN
    SELECT br.id
    FROM booking_requests br
    WHERE br.status = 'awaiting_start_date'
    AND br.start_date <= CURRENT_DATE
  LOOP
    -- Update status
    UPDATE booking_requests
    SET
      status = 'active',
      activated_at = COALESCE(activated_at, now()),
      status_updated_at = now()
    WHERE id = booking_record.id;

    -- Log rental event
    INSERT INTO rental_events (booking_id, event_type, event_data, created_at)
    VALUES (
      booking_record.id,
      'rental_started',
      jsonb_build_object('auto_activated', true, 'activation_date', CURRENT_DATE),
      now()
    );

    -- Create notification for both parties
    INSERT INTO notifications (user_id, type, priority, title, message, related_entity_type, related_entity_id, created_at)
    SELECT
      unnest(ARRAY[br.renter_id, e.owner_id]),
      'booking_confirmed',
      'high',
      'Rental Started',
      'Your rental for ' || e.title || ' has started.',
      'booking',
      br.id,
      now()
    FROM booking_requests br
    JOIN equipment e ON e.id = br.equipment_id
    WHERE br.id = booking_record.id;

    activated_count := activated_count + 1;
  END LOOP;

  RETURN activated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION transition_rentals_to_active() TO service_role;

-- Add comment
COMMENT ON FUNCTION transition_rentals_to_active() IS
  'Automatically activates rentals when start_date is reached. Called by pg_cron every hour.';

-- Schedule cron job (runs every hour at minute 0)
-- Note: pg_cron must be enabled in Supabase dashboard
SELECT cron.schedule(
  'activate-rentals-hourly',
  '0 * * * *',
  $$SELECT transition_rentals_to_active()$$
);
```

**Step 2: Apply migration**

Run: `mcp__supabase__apply_migration` with name `rental_auto_activation`

**Step 3: Verify function exists**

```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'transition_rentals_to_active';
```

**Step 4: Test function manually**

```sql
SELECT transition_rentals_to_active();
```

Expected: Returns count of activated rentals (may be 0 if none ready)

**Step 5: Commit**

```bash
git add supabase/migrations/20260118000003_rental_auto_activation.sql
git commit -m "feat(db): add rental auto-activation function and cron job

Automatically transitions rentals from awaiting_start_date to active
when start_date is reached. Runs hourly via pg_cron."
```

---

### Task 1.4: Migrate Existing Data to New Statuses

**Files:**
- Create: `supabase/migrations/20260118000004_migrate_existing_bookings.sql`

**Step 1: Create the data migration**

```sql
-- Migrate existing 'approved' bookings to appropriate new statuses
-- Based on their actual state (inspections, dates)

-- 1. approved + payment + no pickup inspection → awaiting_pickup_inspection
UPDATE booking_requests br
SET
  status = 'awaiting_pickup_inspection',
  status_updated_at = now()
WHERE br.status = 'approved'
AND EXISTS (
  SELECT 1 FROM payments p
  WHERE p.booking_request_id = br.id
  AND p.payment_status = 'succeeded'
)
AND NOT EXISTS (
  SELECT 1 FROM equipment_inspections ei
  WHERE ei.booking_id = br.id
  AND ei.inspection_type = 'pickup'
  AND ei.verified_by_renter = true
);

-- 2. approved + pickup inspection + start_date NOT reached → awaiting_start_date
UPDATE booking_requests br
SET
  status = 'awaiting_start_date',
  status_updated_at = now()
WHERE br.status = 'approved'
AND EXISTS (
  SELECT 1 FROM equipment_inspections ei
  WHERE ei.booking_id = br.id
  AND ei.inspection_type = 'pickup'
  AND ei.verified_by_renter = true
)
AND br.start_date > CURRENT_DATE;

-- 3. approved + pickup inspection + start_date reached → active
UPDATE booking_requests br
SET
  status = 'active',
  activated_at = COALESCE(br.activated_at, now()),
  status_updated_at = now()
WHERE br.status = 'approved'
AND EXISTS (
  SELECT 1 FROM equipment_inspections ei
  WHERE ei.booking_id = br.id
  AND ei.inspection_type = 'pickup'
  AND ei.verified_by_renter = true
)
AND br.start_date <= CURRENT_DATE;

-- 4. active + return inspection (renter done, owner not) → pending_owner_review
UPDATE booking_requests br
SET
  status = 'pending_owner_review',
  status_updated_at = now()
WHERE br.status = 'active'
AND EXISTS (
  SELECT 1 FROM equipment_inspections ei
  WHERE ei.booking_id = br.id
  AND ei.inspection_type = 'return'
  AND ei.verified_by_renter = true
  AND ei.verified_by_owner = false
);

-- Log migration in rental_events
INSERT INTO rental_events (booking_id, event_type, event_data, created_at)
SELECT
  id,
  'rental_started',
  jsonb_build_object('migrated', true, 'migration_date', CURRENT_TIMESTAMP),
  now()
FROM booking_requests
WHERE status IN ('awaiting_pickup_inspection', 'awaiting_start_date', 'pending_owner_review')
AND NOT EXISTS (
  SELECT 1 FROM rental_events re
  WHERE re.booking_id = booking_requests.id
  AND re.event_data->>'migrated' = 'true'
);
```

**Step 2: Check current status distribution before migration**

```sql
SELECT status, COUNT(*) FROM booking_requests GROUP BY status ORDER BY status;
```

**Step 3: Apply migration**

Run: `mcp__supabase__apply_migration` with name `migrate_existing_bookings`

**Step 4: Verify migration results**

```sql
SELECT status, COUNT(*) FROM booking_requests GROUP BY status ORDER BY status;
```

Expected: No more `approved` status (unless some edge cases), new statuses populated

**Step 5: Commit**

```bash
git add supabase/migrations/20260118000004_migrate_existing_bookings.sql
git commit -m "feat(db): migrate existing bookings to new status values

Maps 'approved' bookings to appropriate new statuses based on:
- Payment status
- Pickup inspection completion
- Start date comparison"
```

---

## Phase 2: Edge Function

### Task 2.1: Create transition-rental-state Edge Function

**Files:**
- Create: `supabase/functions/transition-rental-state/index.ts`

**Step 1: Create the Edge Function**

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TransitionAction =
  | "complete_payment"
  | "complete_pickup_inspection"
  | "start_rental"
  | "initiate_return"
  | "complete_return_inspection"
  | "owner_confirm"
  | "owner_report_damage"
  | "resolve_dispute"
  | "cancel";

interface TransitionRequest {
  booking_id: string;
  action: TransitionAction;
  data?: Record<string, unknown>;
}

interface TransitionResponse {
  success: boolean;
  new_status?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Missing authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ success: false, error: "Invalid token" }, 401);
    }

    const { booking_id, action, data } = await req.json() as TransitionRequest;

    if (!booking_id || !action) {
      return jsonResponse({ success: false, error: "Missing booking_id or action" }, 400);
    }

    // Fetch booking with related data
    const { data: booking, error: fetchError } = await supabaseClient
      .from("booking_requests")
      .select(`
        *,
        equipment:equipment_id (id, owner_id, title),
        renter:renter_id (id, email, full_name),
        pickup_inspection:equipment_inspections!inner (id, inspection_type, verified_by_renter, verified_by_owner),
        return_inspection:equipment_inspections (id, inspection_type, verified_by_renter, verified_by_owner)
      `)
      .eq("id", booking_id)
      .single();

    if (fetchError || !booking) {
      return jsonResponse({ success: false, error: "Booking not found" }, 404);
    }

    const isOwner = user.id === booking.equipment.owner_id;
    const isRenter = user.id === booking.renter_id;

    if (!isOwner && !isRenter) {
      return jsonResponse({ success: false, error: "Not authorized for this booking" }, 403);
    }

    // Process action
    const result = await processAction(supabaseClient, booking, action, data, user.id, isOwner, isRenter);

    return jsonResponse(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Transition error:", error);
    return jsonResponse({ success: false, error: "Internal server error" }, 500);
  }
});

async function processAction(
  supabase: any,
  booking: any,
  action: TransitionAction,
  data: Record<string, unknown> | undefined,
  userId: string,
  isOwner: boolean,
  isRenter: boolean
): Promise<TransitionResponse> {
  const currentStatus = booking.status;

  switch (action) {
    case "complete_payment":
      return await handleCompletePayment(supabase, booking);

    case "complete_pickup_inspection":
      return await handleCompletePickupInspection(supabase, booking, isRenter);

    case "start_rental":
      return await handleStartRental(supabase, booking);

    case "initiate_return":
      return await handleInitiateReturn(supabase, booking, isRenter);

    case "complete_return_inspection":
      return await handleCompleteReturnInspection(supabase, booking, isRenter);

    case "owner_confirm":
      return await handleOwnerConfirm(supabase, booking, isOwner);

    case "owner_report_damage":
      return await handleOwnerReportDamage(supabase, booking, isOwner, data);

    case "resolve_dispute":
      return await handleResolveDispute(supabase, booking, data);

    case "cancel":
      return await handleCancel(supabase, booking, userId, isOwner, isRenter, data);

    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}

async function handleCompletePayment(supabase: any, booking: any): Promise<TransitionResponse> {
  if (booking.status !== "pending") {
    return { success: false, error: `Cannot complete payment from status: ${booking.status}` };
  }

  // Check payment exists and succeeded
  const { data: payment } = await supabase
    .from("payments")
    .select("payment_status")
    .eq("booking_request_id", booking.id)
    .single();

  if (!payment || payment.payment_status !== "succeeded") {
    return { success: false, error: "Payment not completed" };
  }

  // Transition to awaiting_pickup_inspection
  const { error } = await supabase
    .from("booking_requests")
    .update({ status: "awaiting_pickup_inspection" })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Create notification for owner
  await createNotification(supabase, booking.equipment.owner_id, {
    type: "booking_confirmed",
    title: "New Booking Confirmed",
    message: `Payment received for ${booking.equipment.title}. Awaiting pickup inspection.`,
    related_entity_type: "booking",
    related_entity_id: booking.id,
  });

  return { success: true, new_status: "awaiting_pickup_inspection" };
}

async function handleCompletePickupInspection(supabase: any, booking: any, isRenter: boolean): Promise<TransitionResponse> {
  if (booking.status !== "awaiting_pickup_inspection") {
    return { success: false, error: `Cannot complete pickup inspection from status: ${booking.status}` };
  }

  if (!isRenter) {
    return { success: false, error: "Only renter can complete pickup inspection" };
  }

  // Check pickup inspection exists and is verified by renter
  const { data: inspection } = await supabase
    .from("equipment_inspections")
    .select("verified_by_renter")
    .eq("booking_id", booking.id)
    .eq("inspection_type", "pickup")
    .single();

  if (!inspection || !inspection.verified_by_renter) {
    return { success: false, error: "Pickup inspection not completed" };
  }

  // Transition to awaiting_start_date
  const { error } = await supabase
    .from("booking_requests")
    .update({ status: "awaiting_start_date" })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Create notification for owner
  await createNotification(supabase, booking.equipment.owner_id, {
    type: "booking_confirmed",
    title: "Pickup Inspection Complete",
    message: `${booking.renter.full_name || 'Renter'} completed the pickup inspection for ${booking.equipment.title}.`,
    related_entity_type: "booking",
    related_entity_id: booking.id,
  });

  return { success: true, new_status: "awaiting_start_date" };
}

async function handleStartRental(supabase: any, booking: any): Promise<TransitionResponse> {
  if (booking.status !== "awaiting_start_date") {
    return { success: false, error: `Cannot start rental from status: ${booking.status}` };
  }

  const today = new Date().toISOString().split("T")[0];
  if (booking.start_date > today) {
    return { success: false, error: `Start date (${booking.start_date}) not reached yet` };
  }

  // Transition to active
  const { error } = await supabase
    .from("booking_requests")
    .update({
      status: "active",
      activated_at: new Date().toISOString()
    })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log event
  await supabase.from("rental_events").insert({
    booking_id: booking.id,
    event_type: "rental_started",
    event_data: { manual_activation: true },
  });

  return { success: true, new_status: "active" };
}

async function handleInitiateReturn(supabase: any, booking: any, isRenter: boolean): Promise<TransitionResponse> {
  if (booking.status !== "active") {
    return { success: false, error: `Cannot initiate return from status: ${booking.status}` };
  }

  if (!isRenter) {
    return { success: false, error: "Only renter can initiate return" };
  }

  // Transition to awaiting_return_inspection
  const { error } = await supabase
    .from("booking_requests")
    .update({ status: "awaiting_return_inspection" })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, new_status: "awaiting_return_inspection" };
}

async function handleCompleteReturnInspection(supabase: any, booking: any, isRenter: boolean): Promise<TransitionResponse> {
  if (booking.status !== "awaiting_return_inspection") {
    return { success: false, error: `Cannot complete return inspection from status: ${booking.status}` };
  }

  if (!isRenter) {
    return { success: false, error: "Only renter can complete return inspection" };
  }

  // Check return inspection exists and is verified by renter
  const { data: inspection } = await supabase
    .from("equipment_inspections")
    .select("verified_by_renter")
    .eq("booking_id", booking.id)
    .eq("inspection_type", "return")
    .single();

  if (!inspection || !inspection.verified_by_renter) {
    return { success: false, error: "Return inspection not completed" };
  }

  // Transition to pending_owner_review
  const { error } = await supabase
    .from("booking_requests")
    .update({ status: "pending_owner_review" })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Create notification for owner to review
  await createNotification(supabase, booking.equipment.owner_id, {
    type: "booking_confirmed",
    priority: "high",
    title: "Return Inspection Ready for Review",
    message: `${booking.renter.full_name || 'Renter'} completed the return inspection for ${booking.equipment.title}. Please review and confirm.`,
    related_entity_type: "booking",
    related_entity_id: booking.id,
  });

  return { success: true, new_status: "pending_owner_review" };
}

async function handleOwnerConfirm(supabase: any, booking: any, isOwner: boolean): Promise<TransitionResponse> {
  if (booking.status !== "pending_owner_review") {
    return { success: false, error: `Cannot confirm from status: ${booking.status}` };
  }

  if (!isOwner) {
    return { success: false, error: "Only owner can confirm return" };
  }

  // Mark inspection as verified by owner
  await supabase
    .from("equipment_inspections")
    .update({ verified_by_owner: true })
    .eq("booking_id", booking.id)
    .eq("inspection_type", "return");

  // Transition to completed
  const { error } = await supabase
    .from("booking_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString()
    })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log event
  await supabase.from("rental_events").insert({
    booking_id: booking.id,
    event_type: "rental_completed",
    event_data: { confirmed_by_owner: true },
  });

  // Release escrow (update payment)
  await supabase
    .from("payments")
    .update({
      escrow_status: "released",
      escrow_released_at: new Date().toISOString(),
      deposit_status: "released",
      deposit_released_at: new Date().toISOString()
    })
    .eq("booking_request_id", booking.id);

  // Notify renter
  await createNotification(supabase, booking.renter_id, {
    type: "booking_completed",
    title: "Rental Completed",
    message: `Your rental for ${booking.equipment.title} is complete. Your deposit has been released.`,
    related_entity_type: "booking",
    related_entity_id: booking.id,
  });

  return { success: true, new_status: "completed" };
}

async function handleOwnerReportDamage(
  supabase: any,
  booking: any,
  isOwner: boolean,
  data?: Record<string, unknown>
): Promise<TransitionResponse> {
  if (booking.status !== "pending_owner_review") {
    return { success: false, error: `Cannot report damage from status: ${booking.status}` };
  }

  if (!isOwner) {
    return { success: false, error: "Only owner can report damage" };
  }

  const description = data?.description as string;
  if (!description) {
    return { success: false, error: "Damage description required" };
  }

  // Create damage claim
  const { error: claimError } = await supabase.from("damage_claims").insert({
    booking_id: booking.id,
    filed_by: booking.equipment.owner_id,
    damage_description: description,
    estimated_cost: data?.estimated_cost || 0,
    status: "pending",
  });

  if (claimError) {
    return { success: false, error: claimError.message };
  }

  // Transition to disputed
  const { error } = await supabase
    .from("booking_requests")
    .update({ status: "disputed" })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Notify renter
  await createNotification(supabase, booking.renter_id, {
    type: "booking_cancelled", // Using existing type for damage notification
    priority: "critical",
    title: "Damage Claim Filed",
    message: `The owner has filed a damage claim for ${booking.equipment.title}. Please review and respond.`,
    related_entity_type: "booking",
    related_entity_id: booking.id,
  });

  return { success: true, new_status: "disputed" };
}

async function handleResolveDispute(
  supabase: any,
  booking: any,
  data?: Record<string, unknown>
): Promise<TransitionResponse> {
  if (booking.status !== "disputed") {
    return { success: false, error: `Cannot resolve dispute from status: ${booking.status}` };
  }

  // Update damage claim to resolved
  await supabase
    .from("damage_claims")
    .update({
      status: "resolved",
      resolution: data?.resolution || {},
      updated_at: new Date().toISOString()
    })
    .eq("booking_id", booking.id);

  // Transition to completed
  const { error } = await supabase
    .from("booking_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString()
    })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Handle escrow based on resolution
  const deductionAmount = data?.deduction_amount as number || 0;
  await supabase
    .from("payments")
    .update({
      escrow_status: "released",
      escrow_released_at: new Date().toISOString(),
      deposit_status: deductionAmount > 0 ? "claimed" : "released",
      deposit_released_at: new Date().toISOString()
    })
    .eq("booking_request_id", booking.id);

  return { success: true, new_status: "completed" };
}

async function handleCancel(
  supabase: any,
  booking: any,
  userId: string,
  isOwner: boolean,
  isRenter: boolean,
  data?: Record<string, unknown>
): Promise<TransitionResponse> {
  const cancellableStatuses = [
    "pending", "paid", "awaiting_pickup_inspection", "awaiting_start_date"
  ];

  if (!cancellableStatuses.includes(booking.status)) {
    return { success: false, error: `Cannot cancel from status: ${booking.status}` };
  }

  // Transition to cancelled
  const { error } = await supabase
    .from("booking_requests")
    .update({ status: "cancelled" })
    .eq("id", booking.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Handle refund if payment exists
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_request_id", booking.id)
    .single();

  if (payment && payment.payment_status === "succeeded") {
    await supabase
      .from("payments")
      .update({
        escrow_status: "refunded",
        deposit_status: "refunded",
        refund_amount: payment.total_amount,
        refund_reason: data?.reason || "Booking cancelled"
      })
      .eq("booking_request_id", booking.id);
  }

  // Notify other party
  const notifyUserId = isRenter ? booking.equipment.owner_id : booking.renter_id;
  await createNotification(supabase, notifyUserId, {
    type: "booking_cancelled",
    title: "Booking Cancelled",
    message: `The booking for ${booking.equipment.title} has been cancelled.`,
    related_entity_type: "booking",
    related_entity_id: booking.id,
  });

  return { success: true, new_status: "cancelled" };
}

async function createNotification(supabase: any, userId: string, notification: {
  type: string;
  priority?: string;
  title: string;
  message: string;
  related_entity_type: string;
  related_entity_id: string;
}) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type: notification.type,
    priority: notification.priority || "medium",
    title: notification.title,
    message: notification.message,
    related_entity_type: notification.related_entity_type,
    related_entity_id: notification.related_entity_id,
  });
}

function jsonResponse(data: TransitionResponse, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

**Step 2: Deploy Edge Function**

Run: `mcp__supabase__deploy_edge_function` with:
- name: `transition-rental-state`
- entrypoint_path: `index.ts`
- verify_jwt: `true`
- files: the above content

**Step 3: Test the function**

```bash
curl -X POST https://<project>.supabase.co/functions/v1/transition-rental-state \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{"booking_id": "<test_id>", "action": "start_rental"}'
```

**Step 4: Commit**

```bash
git add supabase/functions/transition-rental-state/
git commit -m "feat: add transition-rental-state edge function

Single API for all rental state transitions with:
- Validation of current status
- Authorization checks (owner vs renter)
- Side effects (notifications, escrow updates)
- All 9 transition actions supported"
```

---

## Phase 3: Frontend Context

### Task 3.1: Create RentalContext and Provider

**Files:**
- Create: `src/contexts/RentalContext.tsx`

**Step 1: Create the context file**

```typescript
import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import type { Database } from "@/lib/database.types"

type BookingRequest = Database["public"]["Tables"]["booking_requests"]["Row"]
type EquipmentInspection = Database["public"]["Tables"]["equipment_inspections"]["Row"]
type Payment = Database["public"]["Tables"]["payments"]["Row"]
type DamageClaim = Database["public"]["Tables"]["damage_claims"]["Row"]
type Equipment = Database["public"]["Tables"]["equipment"]["Row"]

export type RentalStatus = BookingRequest["status"]

export interface BookingWithDetails extends BookingRequest {
  equipment: Equipment & {
    owner_id: string
  }
  renter: {
    id: string
    full_name: string | null
    email: string
  }
}

interface RentalState {
  // Current rental being viewed/managed
  currentRental: BookingWithDetails | null

  // Related data
  pickupInspection: EquipmentInspection | null
  returnInspection: EquipmentInspection | null
  payment: Payment | null
  damageClaim: DamageClaim | null

  // Computed helpers
  canCompletePickupInspection: boolean
  canStartRental: boolean
  canInitiateReturn: boolean
  canCompleteReturnInspection: boolean
  canOwnerConfirm: boolean
  canCancel: boolean
  isOwner: boolean
  isRenter: boolean

  // Loading/error state
  isLoading: boolean
  error: string | null
}

interface RentalActions {
  loadRental: (bookingId: string) => Promise<void>
  completePickupInspection: () => Promise<void>
  initiateReturn: () => Promise<void>
  completeReturnInspection: () => Promise<void>
  ownerConfirm: () => Promise<void>
  ownerReportDamage: (description: string, estimatedCost?: number) => Promise<void>
  cancelRental: (reason?: string) => Promise<void>
  clearRental: () => void
  refreshRental: () => Promise<void>
}

type RentalContextType = RentalState & RentalActions

const RentalContext = createContext<RentalContextType | null>(null)

const CANCELLABLE_STATUSES: RentalStatus[] = [
  "pending", "paid", "awaiting_pickup_inspection", "awaiting_start_date"
]

export function RentalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currentRental, setCurrentRental] = useState<BookingWithDetails | null>(null)
  const [pickupInspection, setPickupInspection] = useState<EquipmentInspection | null>(null)
  const [returnInspection, setReturnInspection] = useState<EquipmentInspection | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [damageClaim, setDamageClaim] = useState<DamageClaim | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Computed values
  const isOwner = Boolean(user && currentRental && user.id === currentRental.equipment.owner_id)
  const isRenter = Boolean(user && currentRental && user.id === currentRental.renter_id)

  const canCompletePickupInspection =
    currentRental?.status === "awaiting_pickup_inspection" &&
    isRenter &&
    Boolean(pickupInspection?.verified_by_renter)

  const canStartRental =
    currentRental?.status === "awaiting_start_date" &&
    new Date(currentRental.start_date) <= new Date()

  const canInitiateReturn =
    currentRental?.status === "active" &&
    isRenter

  const canCompleteReturnInspection =
    currentRental?.status === "awaiting_return_inspection" &&
    isRenter &&
    Boolean(returnInspection?.verified_by_renter)

  const canOwnerConfirm =
    currentRental?.status === "pending_owner_review" &&
    isOwner

  const canCancel =
    Boolean(currentRental && CANCELLABLE_STATUSES.includes(currentRental.status as RentalStatus))

  // Load rental data
  const loadRental = useCallback(async (bookingId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch booking with equipment and renter
      const { data: booking, error: bookingError } = await supabase
        .from("booking_requests")
        .select(`
          *,
          equipment:equipment_id (*),
          renter:renter_id (id, full_name, email)
        `)
        .eq("id", bookingId)
        .single()

      if (bookingError) throw bookingError
      setCurrentRental(booking as BookingWithDetails)

      // Fetch inspections
      const { data: inspections } = await supabase
        .from("equipment_inspections")
        .select("*")
        .eq("booking_id", bookingId)

      if (inspections) {
        setPickupInspection(inspections.find(i => i.inspection_type === "pickup") || null)
        setReturnInspection(inspections.find(i => i.inspection_type === "return") || null)
      }

      // Fetch payment
      const { data: paymentData } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_request_id", bookingId)
        .single()

      setPayment(paymentData)

      // Fetch damage claim if disputed
      if (booking.status === "disputed") {
        const { data: claim } = await supabase
          .from("damage_claims")
          .select("*")
          .eq("booking_id", bookingId)
          .single()

        setDamageClaim(claim)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rental")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Transition helper
  const transitionRental = useCallback(async (
    action: string,
    data?: Record<string, unknown>
  ) => {
    if (!currentRental) {
      throw new Error("No rental loaded")
    }

    const { data: result, error } = await supabase.functions.invoke(
      "transition-rental-state",
      {
        body: {
          booking_id: currentRental.id,
          action,
          data,
        },
      }
    )

    if (error) throw error
    if (!result.success) throw new Error(result.error)

    // Refresh data after successful transition
    await loadRental(currentRental.id)

    return result
  }, [currentRental, loadRental])

  // Action methods
  const completePickupInspection = useCallback(async () => {
    await transitionRental("complete_pickup_inspection")
  }, [transitionRental])

  const initiateReturn = useCallback(async () => {
    await transitionRental("initiate_return")
  }, [transitionRental])

  const completeReturnInspection = useCallback(async () => {
    await transitionRental("complete_return_inspection")
  }, [transitionRental])

  const ownerConfirm = useCallback(async () => {
    await transitionRental("owner_confirm")
  }, [transitionRental])

  const ownerReportDamage = useCallback(async (description: string, estimatedCost?: number) => {
    await transitionRental("owner_report_damage", { description, estimated_cost: estimatedCost })
  }, [transitionRental])

  const cancelRental = useCallback(async (reason?: string) => {
    await transitionRental("cancel", { reason })
  }, [transitionRental])

  const clearRental = useCallback(() => {
    setCurrentRental(null)
    setPickupInspection(null)
    setReturnInspection(null)
    setPayment(null)
    setDamageClaim(null)
    setError(null)
  }, [])

  const refreshRental = useCallback(async () => {
    if (currentRental) {
      await loadRental(currentRental.id)
    }
  }, [currentRental, loadRental])

  // Real-time subscription
  useEffect(() => {
    if (!currentRental) return

    const channel = supabase
      .channel(`rental-${currentRental.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_requests",
          filter: `id=eq.${currentRental.id}`,
        },
        () => refreshRental()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "equipment_inspections",
          filter: `booking_id=eq.${currentRental.id}`,
        },
        () => refreshRental()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `booking_request_id=eq.${currentRental.id}`,
        },
        () => refreshRental()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentRental?.id, refreshRental])

  const value: RentalContextType = {
    currentRental,
    pickupInspection,
    returnInspection,
    payment,
    damageClaim,
    canCompletePickupInspection,
    canStartRental,
    canInitiateReturn,
    canCompleteReturnInspection,
    canOwnerConfirm,
    canCancel,
    isOwner,
    isRenter,
    isLoading,
    error,
    loadRental,
    completePickupInspection,
    initiateReturn,
    completeReturnInspection,
    ownerConfirm,
    ownerReportDamage,
    cancelRental,
    clearRental,
    refreshRental,
  }

  return (
    <RentalContext.Provider value={value}>
      {children}
    </RentalContext.Provider>
  )
}

export function useRental() {
  const context = useContext(RentalContext)
  if (!context) {
    throw new Error("useRental must be used within a RentalProvider")
  }
  return context
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/mykolborghese/RentAloo-ai/rentaloo-ai/.worktrees/unified-rental-state
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/contexts/RentalContext.tsx
git commit -m "feat: add RentalContext for unified rental state management

- Single source of truth for rental data
- Real-time subscriptions for auto-updates
- Computed flags (canCompletePickupInspection, canOwnerConfirm, etc.)
- Action methods that call transition-rental-state edge function"
```

---

### Task 3.2: Add RentalProvider to App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import and wrap rental routes**

Add import at top:
```typescript
import { RentalProvider } from "@/contexts/RentalContext"
```

Wrap rental-related routes with RentalProvider:
```tsx
<RentalProvider>
  <Route path="/rental/:id" element={<ActiveRentalPage />} />
  <Route path="/rental/:id/inspection/:type" element={<EquipmentInspectionPage />} />
  <Route path="/owner/rental/:id" element={<OwnerRentalPage />} />
  <Route path="/renter/rental/:id" element={<RenterRentalPage />} />
</RentalProvider>
```

**Step 2: Verify app builds**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wrap rental routes with RentalProvider"
```

---

## Phase 4: Component Integration

### Task 4.1: Update ActiveRentalPage to Use useRental

**Files:**
- Modify: `src/pages/rental/ActiveRentalPage.tsx`

**Step 1: Replace existing hooks with useRental**

Replace:
```typescript
const { data: rental, isLoading } = useActiveRental(bookingId)
```

With:
```typescript
const {
  currentRental,
  isLoading,
  error,
  loadRental,
  canInitiateReturn,
  initiateReturn
} = useRental()

useEffect(() => {
  if (bookingId) {
    loadRental(bookingId)
  }
}, [bookingId, loadRental])
```

**Step 2: Update component to use context state**

Replace references to `rental` with `currentRental`.

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/pages/rental/ActiveRentalPage.tsx
git commit -m "refactor: update ActiveRentalPage to use RentalContext"
```

---

### Task 4.2: Update EquipmentInspectionPage to Use useRental

**Files:**
- Modify: `src/pages/inspection/EquipmentInspectionPage.tsx`

**Step 1: Import and use the hook**

```typescript
import { useRental } from "@/contexts/RentalContext"

// Inside component
const {
  currentRental,
  pickupInspection,
  returnInspection,
  loadRental,
  completePickupInspection,
  completeReturnInspection,
  isLoading
} = useRental()
```

**Step 2: Update inspection completion handlers**

Replace direct Supabase calls with context methods.

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/pages/inspection/EquipmentInspectionPage.tsx
git commit -m "refactor: update EquipmentInspectionPage to use RentalContext"
```

---

### Task 4.3: Update OwnerRentalPage with Confirm/Damage UI

**Files:**
- Modify: `src/pages/owner/OwnerRentalPage.tsx`

**Step 1: Add owner review UI**

```typescript
import { useRental } from "@/contexts/RentalContext"

// Inside component
const {
  currentRental,
  returnInspection,
  canOwnerConfirm,
  ownerConfirm,
  ownerReportDamage,
  loadRental,
  isLoading
} = useRental()

// Add confirm/report damage buttons when canOwnerConfirm is true
{canOwnerConfirm && (
  <div className="space-y-4">
    <h3>Review Return Inspection</h3>
    {/* Show return inspection details */}
    <div className="flex gap-4">
      <Button onClick={ownerConfirm}>
        Confirm - No Issues
      </Button>
      <Button variant="destructive" onClick={() => setShowDamageDialog(true)}>
        Report Damage
      </Button>
    </div>
  </div>
)}
```

**Step 2: Add damage report dialog**

Create dialog for damage description and estimated cost.

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/pages/owner/OwnerRentalPage.tsx
git commit -m "feat: add owner confirm/report damage UI to OwnerRentalPage"
```

---

### Task 4.4: Update Status Display Components

**Files:**
- Modify: `src/components/booking/InspectionStatusBadge.tsx`
- Modify: `src/lib/booking.ts` (status color/text helpers)

**Step 1: Add new status values to helpers**

In `src/lib/booking.ts`:
```typescript
export function getBookingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-blue-100 text-blue-800",
    awaiting_pickup_inspection: "bg-orange-100 text-orange-800",
    awaiting_start_date: "bg-purple-100 text-purple-800",
    active: "bg-green-100 text-green-800",
    awaiting_return_inspection: "bg-orange-100 text-orange-800",
    pending_owner_review: "bg-blue-100 text-blue-800",
    completed: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
    declined: "bg-red-100 text-red-800",
    disputed: "bg-red-100 text-red-800",
    // Legacy
    approved: "bg-green-100 text-green-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

export function getBookingStatusText(status: string): string {
  const texts: Record<string, string> = {
    pending: "Pending Payment",
    paid: "Payment Received",
    awaiting_pickup_inspection: "Awaiting Pickup Inspection",
    awaiting_start_date: "Ready to Start",
    active: "Active Rental",
    awaiting_return_inspection: "Awaiting Return Inspection",
    pending_owner_review: "Pending Owner Review",
    completed: "Completed",
    cancelled: "Cancelled",
    declined: "Declined",
    disputed: "Disputed",
    // Legacy
    approved: "Approved",
  }
  return texts[status] || status
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/lib/booking.ts src/components/booking/InspectionStatusBadge.tsx
git commit -m "feat: add new rental statuses to display helpers"
```

---

## Phase 5: Cleanup & Types

### Task 5.1: Regenerate Database Types

**Step 1: Generate types**

Run: `mcp__supabase__generate_typescript_types`

**Step 2: Update local types file**

Save output to `src/lib/database.types.ts`

**Step 3: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "chore: regenerate database types with new status values"
```

---

### Task 5.2: Update TypeScript Types

**Files:**
- Modify: `src/types/booking.ts`

**Step 1: Update BookingStatus type**

```typescript
export type BookingStatus =
  | "pending"
  | "paid"
  | "awaiting_pickup_inspection"
  | "awaiting_start_date"
  | "active"
  | "awaiting_return_inspection"
  | "pending_owner_review"
  | "completed"
  | "cancelled"
  | "declined"
  | "disputed"
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/types/booking.ts
git commit -m "chore: update BookingStatus type with new values"
```

---

### Task 5.3: Remove Deprecated Code

**Files:**
- Potentially remove: `src/hooks/useActiveRental.ts` (if fully replaced)
- Potentially remove: `src/hooks/useBookingSubscriptions.ts` (if fully replaced)

**Step 1: Search for usages**

```bash
grep -r "useActiveRental" src/
grep -r "useBookingSubscriptions" src/
```

**Step 2: If no usages, remove files**

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated rental hooks replaced by RentalContext"
```

---

### Task 5.4: Final Build Verification

**Step 1: Full build**

```bash
npm run build
```

**Step 2: Type check**

```bash
npx tsc --noEmit
```

**Step 3: Create final commit if any fixes needed**

---

## Summary Checklist

- [ ] Task 1.1: Add new status enum values
- [ ] Task 1.2: Create transition validation trigger
- [ ] Task 1.3: Create auto-activation function and cron
- [ ] Task 1.4: Migrate existing data
- [ ] Task 2.1: Create transition-rental-state Edge Function
- [ ] Task 3.1: Create RentalContext and Provider
- [ ] Task 3.2: Add RentalProvider to App.tsx
- [ ] Task 4.1: Update ActiveRentalPage
- [ ] Task 4.2: Update EquipmentInspectionPage
- [ ] Task 4.3: Update OwnerRentalPage with confirm UI
- [ ] Task 4.4: Update status display components
- [ ] Task 5.1: Regenerate database types
- [ ] Task 5.2: Update TypeScript types
- [ ] Task 5.3: Remove deprecated code
- [ ] Task 5.4: Final build verification
