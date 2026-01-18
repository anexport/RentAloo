# Mobile-First Inspection Flow Redesign

## Overview
Full mobile redesign of the equipment inspection flow (pickup/return) with focus on:
- Checklist buttons layout
- Photo capture UX
- Overall readability and touch-friendly interactions

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/inspection/steps/InspectionChecklistStep.tsx` | Vertical button stack, 56px touch targets, animated notes |
| `src/components/inspection/PhotoCapture.tsx` | Larger thumbnails, better delete UX, progress indicator |
| `src/components/inspection/steps/InspectionStepIndicator.tsx` | Mobile progress bar replacing horizontal stepper |
| `src/components/inspection/steps/InspectionReviewStep.tsx` | Expandable photo gallery, compact info rows |
| `src/components/inspection/steps/PickupConfirmationStep.tsx` | Responsive grid, larger text |
| `src/components/inspection/steps/ReturnConfirmationStep.tsx` | Mobile-optimized condition comparison |

---

## Key Changes

### 1. Checklist Step (High Priority)
**Current:** 3 horizontal buttons cramped on mobile
**New:**
- Stack buttons vertically on mobile: `grid-cols-1 sm:grid-cols-3`
- Increase button height to 56px (min touch target)
- Add `active:scale-[0.98]` for tactile feedback
- Smooth animated notes expansion

```tsx
// Button layout change
<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
  {["good", "fair", "damaged"].map(status => (
    <StatusButton key={status} ... />
  ))}
</div>
```

### 2. Photo Capture (High Priority)
**Current:** Small 64px thumbnails, tiny delete buttons
**New:**
- Larger aspect-ratio thumbnails: `aspect-[4/3]`
- 44px delete buttons (touch-friendly)
- Progress pill showing `{count}/{required}`
- Clear "Add Photo" button with camera icon


### 4. Step Indicator (Medium Priority)
**Current:** Horizontal stepper with hidden titles on mobile
**New mobile layout:**
- Progress bar at top
- Current step name displayed below
- Mini dots showing all steps

### 5. Review/Confirmation Steps (Lower Priority)
- Expandable photo gallery (show 4, "+N more")
- Compact info rows with icons
- Larger confirmation checkbox (24px)
- Human-readable timestamps

---

## Layout Philosophy

All steps already render a fixed bottom nav in each component—reuse that bar instead of adding another layout wrapper. Keep scrollable content padded so it clears the existing `safe-area-bottom` footer.

Consistent wrapper:
```tsx
<div className="flex flex-col min-h-[100dvh]">
  {/* Scrollable content */}
  <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+96px)]">
    <div className="max-w-lg mx-auto py-6 space-y-6">
      {/* Content */}
    </div>
  </div>

  {/* Fixed bottom nav */}
  <div className="fixed inset-x-0 bottom-0 bg-background/95 backdrop-blur-md border-t pb-[env(safe-area-inset-bottom)]">
    {/* Navigation buttons */}
  </div>
</div>
```

---

## Spacing & Typography

- Section gaps: `space-y-6` (24px)
- Card padding: `p-4` (16px)
- Touch targets: minimum 44px, prefer 48-56px
- Inputs: `text-[16px]` to prevent iOS zoom
- Responsive text: `text-sm sm:text-base` patterns

---

## Implementation Order

1. **InspectionChecklistStep** - Vertical buttons, touch targets
2. **PhotoCapture** - Larger thumbnails, better UX
4. **InspectionStepIndicator** - Mobile progress bar
5. **Review/Confirmation steps** - Polish and readability

---

## Verification

1. Test on actual mobile device (or Chrome DevTools mobile simulation)
2. Verify touch targets are at least 44px
4. Confirm checklist buttons don't overflow on 320px width screens
5. Test photo capture with phone camera
6. Verify fixed bottom nav doesn't overlap content
