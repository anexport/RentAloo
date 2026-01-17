# Unified Rental State System Design

**Date:** 2026-01-18
**Status:** Approved for implementation

## Overview

Redesign the rental lifecycle tracking to provide a single source of truth for rental state across frontend and backend. Currently, state is fragmented across multiple tables (`booking_requests.status`, `bookings.return_status`, `payments.escrow_status`, `equipment_inspections.verified_by_*`) with no centralized coordination.

## Goals

1. **Single source of truth** - One status field that accurately reflects rental stage
2. **Backend validation** - Enforced state transitions with proper guards
3. **Frontend coordination** - React Context that components share instead of fetching independently
4. **Clear lifecycle** - Granular states that answer "what step is this rental at?"

## Rental Lifecycle Flow

```
Payment → Pickup Inspection → (wait for start_date) → Active → Return Inspection → Owner Review → Completed
```

### Key Rules

- **Pickup inspection**: Renter completes, no owner confirmation needed
- **Active transition**: Requires pickup inspection complete AND `start_date` reached
- **Return inspection**: Renter completes, owner MUST confirm before completion
- **Damage handling**: Owner can reject and file damage claim → rental goes to `disputed`

---

## Database Schema

### New Status Enum

```sql
-- booking_status enum values (in order)
pending                      -- Initial state, awaiting payment
paid                         -- Payment succeeded (transitional)
awaiting_pickup_inspection   -- Renter needs to complete pickup inspection
awaiting_start_date          -- Pickup done, waiting for rental start date
active                       -- Rental in progress
awaiting_return_inspection   -- Renter needs to complete return inspection
pending_owner_review         -- Return inspection done, owner must confirm
completed                    -- Rental finished successfully
cancelled                    -- Cancelled by renter or owner
declined                     -- Owner declined the request
disputed                     -- Damage claim filed, awaiting resolution
```

### Valid State Transitions

```
pending → paid                        (payment succeeded)
pending → declined                    (owner declines)
pending → cancelled                   (renter cancels)

paid → awaiting_pickup_inspection     (immediate after payment)
paid → cancelled                      (refund requested)

awaiting_pickup_inspection → awaiting_start_date    (renter completes inspection)
awaiting_pickup_inspection → cancelled              (cancellation with refund)

awaiting_start_date → active          (start_date reached, automatic via cron)
awaiting_start_date → cancelled       (late cancellation)

active → awaiting_return_inspection   (renter initiates return)

awaiting_return_inspection → pending_owner_review   (renter completes return inspection)

pending_owner_review → completed      (owner confirms, no issues)
pending_owner_review → disputed       (owner reports damage)

disputed → completed                  (claim resolved)
```

### Schema Changes

```sql
-- 1. Add new enum values
ALTER TYPE booking_status ADD VALUE 'paid' AFTER 'pending';
ALTER TYPE booking_status ADD VALUE 'awaiting_pickup_inspection' AFTER 'paid';
ALTER TYPE booking_status ADD VALUE 'awaiting_start_date' AFTER 'awaiting_pickup_inspection';
ALTER TYPE booking_status ADD VALUE 'awaiting_return_inspection' AFTER 'active';
ALTER TYPE booking_status ADD VALUE 'pending_owner_review' AFTER 'awaiting_return_inspection';
ALTER TYPE booking_status ADD VALUE 'disputed' AFTER 'completed';

-- 2. Add tracking columns
ALTER TABLE booking_requests ADD COLUMN status_updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE booking_requests ADD COLUMN disputed_at TIMESTAMPTZ;

-- 3. Remove redundant column (after migration)
ALTER TABLE bookings DROP COLUMN return_status;
```

### Validation Trigger

```sql
CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions TEXT[][] := ARRAY[
    ['pending', 'paid'],
    ['pending', 'declined'],
    ['pending', 'cancelled'],
    ['paid', 'awaiting_pickup_inspection'],
    ['paid', 'cancelled'],
    ['awaiting_pickup_inspection', 'awaiting_start_date'],
    ['awaiting_pickup_inspection', 'cancelled'],
    ['awaiting_start_date', 'active'],
    ['awaiting_start_date', 'cancelled'],
    ['active', 'awaiting_return_inspection'],
    ['awaiting_return_inspection', 'pending_owner_review'],
    ['pending_owner_review', 'completed'],
    ['pending_owner_review', 'disputed'],
    ['disputed', 'completed']
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
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;

  -- Update timestamp
  NEW.status_updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_status_transition_check
  BEFORE UPDATE OF status ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_status_transition();
```

### Automatic Activation (pg_cron)

```sql
-- Function to activate rentals
CREATE OR REPLACE FUNCTION transition_rental_to_active(p_booking_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE booking_requests
  SET
    status = 'active',
    activated_at = now(),
    status_updated_at = now()
  WHERE id = p_booking_id
  AND status = 'awaiting_start_date'
  AND start_date <= CURRENT_DATE;

  -- Log event
  INSERT INTO rental_events (booking_id, event_type, created_at)
  VALUES (p_booking_id, 'rental_started', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron job - runs every hour
SELECT cron.schedule(
  'activate-rentals',
  '0 * * * *',
  $$
    SELECT transition_rental_to_active(id)
    FROM booking_requests
    WHERE status = 'awaiting_start_date'
    AND start_date <= CURRENT_DATE;
  $$
);
```

---

## Edge Function: transition-rental-state

Single endpoint for all state transitions with validation and side effects.

### Request Format

```typescript
// POST /functions/v1/transition-rental-state
interface TransitionRequest {
  booking_id: string
  action:
    | 'complete_payment'
    | 'complete_pickup_inspection'
    | 'start_rental'
    | 'initiate_return'
    | 'complete_return_inspection'
    | 'owner_confirm'
    | 'owner_report_damage'
    | 'resolve_dispute'
    | 'cancel'
  data?: Record<string, unknown>  // Action-specific data
}

interface TransitionResponse {
  success: boolean
  new_status: string
  error?: string
}
```

### Action Handlers

| Action | Validates | Updates Status | Side Effects |
|--------|-----------|----------------|--------------|
| `complete_payment` | Payment succeeded in Stripe | `pending` → `awaiting_pickup_inspection` | Create `bookings` row, notify owner |
| `complete_pickup_inspection` | Inspection exists with renter signature | `awaiting_pickup_inspection` → `awaiting_start_date` | Notify owner |
| `start_rental` | `start_date <= now()` | `awaiting_start_date` → `active` | Set `activated_at`, notify both parties |
| `initiate_return` | Status is `active` | `active` → `awaiting_return_inspection` | Notify renter |
| `complete_return_inspection` | Return inspection exists with renter signature | `awaiting_return_inspection` → `pending_owner_review` | Notify owner to review |
| `owner_confirm` | User is owner, status is `pending_owner_review` | `pending_owner_review` → `completed` | Set `completed_at`, release escrow, notify renter |
| `owner_report_damage` | User is owner, status is `pending_owner_review` | `pending_owner_review` → `disputed` | Create `damage_claims` row, set `disputed_at`, hold escrow |
| `resolve_dispute` | Claim resolved in `damage_claims` | `disputed` → `completed` | Process deposit, release escrow |
| `cancel` | Valid cancellation window | Various → `cancelled` | Process refund |

---

## Frontend: RentalContext

### Context Type

```typescript
// src/contexts/RentalContext.tsx

interface RentalState {
  // Current rental being viewed/managed
  currentRental: BookingRequestWithDetails | null

  // Related data (fetched together)
  pickupInspection: EquipmentInspection | null
  returnInspection: EquipmentInspection | null
  payment: Payment | null
  damageClaim: DamageClaim | null

  // Computed helpers
  canCompletePickupInspection: boolean
  canStartRental: boolean
  canCompleteReturnInspection: boolean
  canOwnerConfirm: boolean
  isOwner: boolean
  isRenter: boolean

  // Loading/error state
  isLoading: boolean
  error: string | null
}

interface RentalActions {
  // Load a rental into context
  loadRental: (bookingId: string) => Promise<void>

  // State transitions (call edge function)
  completePickupInspection: (data: InspectionData) => Promise<void>
  completeReturnInspection: (data: InspectionData) => Promise<void>
  ownerConfirm: () => Promise<void>
  ownerReportDamage: (description: string) => Promise<void>
  cancelRental: (reason?: string) => Promise<void>

  // Clear context
  clearRental: () => void

  // Force refresh
  refreshRental: () => Promise<void>
}

type RentalContextType = RentalState & RentalActions
```

### Provider Features

1. **Real-time subscriptions** - Listens to changes on `booking_requests`, `equipment_inspections`, `payments` for current rental
2. **Auto-refresh** - Refetches when subscription detects changes
3. **Computed flags** - Derived from state (e.g., `canStartRental = status === 'awaiting_start_date' && start_date <= today`)
4. **Single source of truth** - All rental pages use this instead of independent fetches

### Hook Usage

```typescript
// src/hooks/useRental.ts
export function useRental() {
  const context = useContext(RentalContext)
  if (!context) {
    throw new Error('useRental must be used within RentalProvider')
  }
  return context
}
```

### Provider Placement

```tsx
// src/App.tsx
<RentalProvider>
  <Route path="/rental/:id" element={<ActiveRentalPage />} />
  <Route path="/rental/:id/inspection/:type" element={<EquipmentInspectionPage />} />
  <Route path="/owner/rental/:id" element={<OwnerRentalPage />} />
  <Route path="/renter/rental/:id" element={<RenterRentalPage />} />
</RentalProvider>
```

---

## Data Migration

Migrate existing bookings to new status values:

```sql
-- 'approved' with payment + no pickup inspection → 'awaiting_pickup_inspection'
UPDATE booking_requests br
SET status = 'awaiting_pickup_inspection'
WHERE status = 'approved'
AND EXISTS (
  SELECT 1 FROM payments p
  WHERE p.booking_request_id = br.id
  AND p.payment_status = 'succeeded'
)
AND NOT EXISTS (
  SELECT 1 FROM equipment_inspections ei
  WHERE ei.booking_id = br.id
  AND ei.inspection_type = 'pickup'
);

-- 'approved' with pickup inspection + start_date not reached → 'awaiting_start_date'
UPDATE booking_requests br
SET status = 'awaiting_start_date'
WHERE status = 'approved'
AND EXISTS (
  SELECT 1 FROM equipment_inspections ei
  WHERE ei.booking_id = br.id
  AND ei.inspection_type = 'pickup'
)
AND start_date > CURRENT_DATE;

-- 'approved' with pickup inspection + start_date passed → 'active'
UPDATE booking_requests br
SET status = 'active'
WHERE status = 'approved'
AND EXISTS (
  SELECT 1 FROM equipment_inspections ei
  WHERE ei.booking_id = br.id
  AND ei.inspection_type = 'pickup'
)
AND start_date <= CURRENT_DATE;

-- 'active' with return inspection (renter done, owner not confirmed) → 'pending_owner_review'
UPDATE booking_requests br
SET status = 'pending_owner_review'
WHERE status = 'active'
AND EXISTS (
  SELECT 1 FROM equipment_inspections ei
  WHERE ei.booking_id = br.id
  AND ei.inspection_type = 'return'
  AND ei.verified_by_renter = true
  AND ei.verified_by_owner = false
);
```

---

## Implementation Phases

### Phase 1: Database Foundation
1. Add new enum values to `booking_status`
2. Add `status_updated_at`, `disputed_at` columns
3. Create validation trigger function
4. Run data migration for existing bookings
5. Set up pg_cron job for auto-activation

### Phase 2: Edge Function
1. Create `transition-rental-state` edge function
2. Implement all transition actions with validation
3. Add notification triggers for each transition
4. Test all transition paths

### Phase 3: Frontend Context
1. Create `RentalContext` and `RentalProvider`
2. Create `useRental()` hook
3. Add real-time subscriptions inside provider
4. Implement all action methods (calling edge function)

### Phase 4: Component Integration
1. Update `ActiveRentalPage` to use `useRental()`
2. Update `EquipmentInspectionPage` to use context actions
3. Create/update `OwnerRentalPage` with review + confirm UI
4. Update `RenterRentalPage` with new status display
5. Remove old hooks where replaced

### Phase 5: Cleanup
1. Remove `bookings.return_status` column
2. Regenerate types (`database.types.ts`)
3. Remove deprecated code paths
4. Update tests

---

## Files to Create/Modify

### New Files
- `supabase/functions/transition-rental-state/index.ts`
- `src/contexts/RentalContext.tsx`
- `src/hooks/useRental.ts`
- `supabase/migrations/XXXXXX_unified_rental_state.sql`

### Modified Files
- `src/App.tsx` - Add RentalProvider
- `src/pages/rental/ActiveRentalPage.tsx` - Use useRental()
- `src/pages/inspection/EquipmentInspectionPage.tsx` - Use context actions
- `src/pages/owner/OwnerRentalPage.tsx` - Add review/confirm UI
- `src/pages/renter/RenterRentalPage.tsx` - Update status display
- `src/types/booking.ts` - Update BookingStatus type
- `src/lib/database.types.ts` - Regenerate

### Deprecated (to remove after migration)
- `src/hooks/useActiveRental.ts` - Replaced by useRental()
- `src/hooks/useBookingSubscriptions.ts` - Moved into RentalContext
