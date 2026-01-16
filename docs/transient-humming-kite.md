# Rental Detail Page Refactor Plan

## Problem Summary
The `/rental/:bookingId` page (ActiveRentalPage) has several issues:
1. **Only works for "active" bookings** - doesn't handle "approved" status (pickup inspection flow)
2. **Messy card-based layout** - too many cards, cluttered visual hierarchy
3. **Not mobile-first** - needs Airbnb-style mobile optimization
4. **Missing pickup inspection flow** - users can't start pickup inspection from this page

## Goal
Create a clean, mobile-first "Rental Detail Page" that handles the complete rental lifecycle:
- **Approved** → Show pickup inspection CTA
- **Active** → Show rental progress + return inspection CTA

---

## Implementation Plan

### Phase 1: Expand Page to Handle Both Statuses

**File:** `src/pages/rental/ActiveRentalPage.tsx`

1. Update `useActiveRental` hook to accept both "approved" and "active" statuses
2. Add pickup inspection state tracking (already fetched in hook)
3. Determine booking phase: `awaiting_pickup` | `rental_active` | `awaiting_return`

### Phase 2: Mobile-First Airbnb-Style Layout

Replace current card-heavy layout with cleaner structure:

```
┌─────────────────────────────────────┐
│ ← Back                    [Status]  │  ← Minimal header
├─────────────────────────────────────┤
│ [Full-width photo]                  │  ← Edge-to-edge, no card
│                                     │
│  Equipment Title                    │  ← Overlay text
│  with Owner/Renter                  │
├─────────────────────────────────────┤
│ [Progress Timeline]                 │  ← Horizontal lifecycle stepper
│  ● Booked → ○ Pickup → ○ Active...  │
├─────────────────────────────────────┤
│ 📅 Mar 15 - Mar 20, 2025           │  ← Clean detail rows (no cards)
│ 💰 $125.00 total                   │
│ 📍 123 Main St → [Directions]       │
├─────────────────────────────────────┤
│ ⏱️ 2 days, 5 hours remaining       │  ← Inline countdown (simplified)
├─────────────────────────────────────┤
│ [Message] [Help]                    │  ← Inline secondary actions
├─────────────────────────────────────┤
│         (spacer for bottom bar)     │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ [═══ Start Pickup Inspection ═══]   │  ← STICKY BOTTOM BAR (always visible)
└─────────────────────────────────────┘
```

### Phase 3: Component Changes

#### 3.1 Photo Section (Simplified)
- Remove Card wrapper - full-width edge-to-edge
- Keep gradient overlay for title
- Maintain current photo display logic

#### 3.2 Progress Timeline
- Reuse `BookingLifecycleStepper` from `src/components/booking/inspection-flow/`
- Horizontal stepper: Booked → Pickup → Active → Return → Complete
- Highlights current phase based on status + inspection state

#### 3.3 Details Section (No Cards)
- Replace Card grid with clean stacked rows
- Icon + label + value format
- Dates, amount, location with directions link

#### 3.4 Inline Countdown (Simplified)
- Replace `RentalCountdown` card with simple inline text
- Format: "⏱️ X days, Y hours remaining" or "⚠️ Rental overdue"
- Context-aware coloring (green → amber → red)

#### 3.5 Sticky Bottom Action Bar
- **Always visible** on mobile (user preference)
- Fixed position at bottom with safe area padding
- Primary CTA based on phase:
  - **Approved (no pickup inspection):** "Start Pickup Inspection"
  - **Active (rental active):** "View Rental Details" or "Message Owner"
  - **Active (ending soon):** "Start Return Inspection" (emphasized)
  - **Owner view:** "Message Renter" / informational text

### Phase 4: Inspection Flow Integration

1. **Pickup inspection:**
   - If `status === "approved"` && no pickup inspection → Primary CTA: "Start Pickup Inspection"
   - Links to `/inspection/:bookingId/pickup`

2. **Return inspection:**
   - If `status === "active"` && rental ending soon → Primary CTA: "Start Return Inspection"
   - Links to `/inspection/:bookingId/return`

3. **View inspection links:**
   - Small "View" buttons next to completed inspection steps in timeline

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/rental/ActiveRentalPage.tsx` | **Major refactor** - new layout, both statuses, sticky action bar |
| `src/hooks/useActiveRental.ts` | Update query to include "approved" status |

## Existing Components to Reuse

| Component | Location | Usage |
|-----------|----------|-------|
| `BookingLifecycleStepper` | `src/components/booking/inspection-flow/` | Progress timeline |
| `useMediaQuery` | `src/hooks/useMediaQuery.ts` | Mobile detection |

---

## Key Changes Summary

| Current | New |
|---------|-----|
| Card-based layout | Flat sections with dividers |
| Equipment hero in Card | Full-width edge-to-edge photo |
| RentalCountdown card with progress bar | Inline countdown text |
| Separate inspection status card | Integrated progress timeline |
| Return CTA card at bottom | **Sticky action bar (always visible)** |
| Quick actions in Card | Inline secondary buttons |
| Only "active" status | Both "approved" and "active" |
| No pickup inspection | Full lifecycle with pickup CTA |

---

## Verification Plan

1. **Test approved booking flow:**
   - Navigate to `/rental/:bookingId` with an "approved" booking
   - Verify "Start Pickup Inspection" CTA appears in sticky bar
   - Click CTA → navigates to pickup inspection wizard

2. **Test active booking flow:**
   - Verify inline countdown displays correctly
   - Test sticky bar shows appropriate CTA
   - Verify overdue state styling changes

3. **Test mobile responsiveness:**
   - Verify sticky bottom bar is always visible
   - Check padding for safe area on iOS
   - Verify photo is edge-to-edge

4. **Test owner vs renter views:**
   - **Renter:** Can see and start inspections
   - **Owner:** Sees status messages, cannot start inspections (renter-only)
