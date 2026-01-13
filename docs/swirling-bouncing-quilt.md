# Airbnb-Style Mobile Equipment Detail View Enhancement

## Problem Summary

The current mobile equipment detail view feels clunky due to:
1. **Cramped photo gallery** - 300px height static grid, not immersive
2. **Visual clutter** - Many `<Separator>` components create choppy feel
3. **Double-sheet UX** - Detail sheet (90dvh) + booking drawer (85dvh) is clunky
4. **No sticky header** - Context lost when scrolling past photos
5. **Basic animations** - Not smooth/spring-based like modern apps
6. **Delayed CTA** - Booking button only appears after 200px scroll

## Solution Overview

Transform the mobile experience to match Airbnb's patterns:
- Full-width swipeable hero carousel (55vh)
- Sticky header appearing on scroll
- Persistent bottom booking bar (always visible)
- Cleaner section layout with more breathing room
- Spring-based animations

---

## Implementation Plan

### Phase 1: Create Mobile Hero Carousel

**New file:** `src/components/equipment/detail/MobileHeroCarousel.tsx`

- Full-width swipeable photo carousel at 55dvh height
- Use `embla-carousel-react` (already in project via ListingCard)
- Dot indicators instead of counter for cleaner look
- Tap to open existing `PhotoLightbox`
- Progressive image loading (reuse pattern from EquipmentPhotoGallery)
- Spring transition: `cubic-bezier(0.32, 0.72, 0, 1)` from MobileListingsBottomSheet

Key props:
```typescript
interface MobileHeroCarouselProps {
  photos: Photo[];
  equipmentTitle: string;
  onPhotoCountClick?: () => void; // Opens lightbox
}
```

### Phase 2: Create Persistent Bottom Booking Bar

**New file:** `src/components/booking/MobileBookingBar.tsx`

Replace FloatingBookingCTA + MobileSidebarDrawer with single component:
- Always visible at bottom (not scroll-triggered)
- Two states: **collapsed** (72px bar) and **expanded** (85dvh full form)
- Collapsed shows: price/day + "Check availability" button
- When dates selected: shows total + "Reserve" button
- Expands upward with spring animation to show full booking form
- Reuse existing booking components: DateSelector, PricingBreakdown, InsuranceSelector

Key props:
```typescript
interface MobileBookingBarProps {
  listing: Listing;
  dailyRate: number;
  calculation: BookingCalculation | null;
  dateRange?: DateRange;
  isExpanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  // ... existing booking props from MobileSidebarDrawer
}
```

### Phase 3: Create Sticky Header

**New file:** `src/components/equipment/detail/MobileDetailStickyHeader.tsx`

- Fixed header appearing when scrolling past hero section
- Shows: back/close button, truncated title, price, favorite button
- Fade + slide-down animation on appear
- Backdrop blur: `bg-background/95 backdrop-blur`
- Uses IntersectionObserver for performance (not scroll events)
- Safe area padding for notch devices

Key props:
```typescript
interface MobileDetailStickyHeaderProps {
  title: string;
  dailyRate: number;
  isVisible: boolean;
  onClose: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}
```

### Phase 4: Simplify Content Layout

**Modify:** `src/components/equipment/detail/EquipmentDetailDialog.tsx`

For mobile path, restructure content:
1. Remove most `<Separator>` components - use `space-y-6` instead
2. Increase section padding for breathing room
3. Make description collapsible with "Show more" button
4. Remove tabs on mobile - show content vertically with sections
5. Use horizontal scrolling for quick info pills (condition, category)

Create helper component:
**New file:** `src/components/equipment/detail/MobileExpandableDescription.tsx`
- Shows first 3 lines, "Show more" expands to full text
- Smooth height animation

### Phase 5: Refactor Main Dialog for Mobile

**Modify:** `src/components/equipment/detail/EquipmentDetailDialog.tsx`

Major changes to mobile path (~lines 770-781):
1. Replace `Sheet` wrapper with full-screen `div` (`fixed inset-0 z-50`)
2. Add scroll container with ref for IntersectionObserver
3. Integrate new components:
   - MobileHeroCarousel at top
   - MobileDetailStickyHeader (visibility based on scroll)
   - Simplified content sections
   - MobileBookingBar at bottom (persistent)
4. Remove FloatingBookingCTA and MobileSidebarDrawer usage for mobile
5. Keep all existing booking state logic intact

### Phase 6: Add CSS Animations

**Modify:** `src/index.css`

Add new keyframes:
```css
@keyframes sticky-header-enter {
  from { opacity: 0; transform: translateY(-100%); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes booking-bar-expand {
  from { height: 72px; }
  to { height: 85dvh; }
}
```

---

## Files Summary

### New Files (4)
1. `src/components/equipment/detail/MobileHeroCarousel.tsx`
2. `src/components/equipment/detail/MobileDetailStickyHeader.tsx`
3. `src/components/equipment/detail/MobileExpandableDescription.tsx`
4. `src/components/booking/MobileBookingBar.tsx`

### Modified Files (2)
1. `src/components/equipment/detail/EquipmentDetailDialog.tsx` - Major mobile refactor
2. `src/index.css` - New animation keyframes

### Files to Keep (fallback)
- `FloatingBookingCTA.tsx` - Keep for now, can deprecate later
- `MobileSidebarDrawer.tsx` - Keep for now, can deprecate later

---

## Implementation Order

1. **MobileHeroCarousel** - Independent, visual foundation
2. **MobileBookingBar** - Core UX improvement, replaces clunky double-sheet
3. **MobileDetailStickyHeader** - Depends on scroll container
4. **MobileExpandableDescription** - Simple helper
5. **EquipmentDetailDialog refactor** - Integration of all components
6. **CSS animations** - Polish

---

## Key Patterns to Reuse

From existing codebase:
- **Embla carousel**: `ListingCard.tsx` lines 86-94
- **Spring animation**: `MobileListingsBottomSheet.tsx` line 32 - `cubic-bezier(0.32, 0.72, 0, 1)`
- **Progressive image loading**: `EquipmentPhotoGallery.tsx` lines 16-57
- **Safe area padding**: `MobileSidebarDrawer.tsx` line 316
- **Backdrop blur pattern**: `MobileSidebarDrawer.tsx` line 277

---

## Verification

After implementation, test:

1. **Photo carousel**
   - Swipe through photos smoothly
   - Tap opens lightbox
   - Dot indicators update correctly

2. **Sticky header**
   - Appears when scrolling past photos
   - Disappears when scrolling back up
   - Back button closes view

3. **Bottom booking bar**
   - Always visible (no scroll trigger)
   - Shows price before date selection
   - Expands smoothly when tapped
   - Full booking flow works in expanded state
   - Collapse animation is smooth

4. **Content sections**
   - Description expands/collapses smoothly
   - No visual clutter from separators
   - Adequate spacing between sections

5. **Overall feel**
   - Animations are smooth (60fps)
   - No jank on scroll
   - Touch targets are adequate size (min 44px)

6. **Device testing**
   - iPhone notch/dynamic island handled
   - Safe area padding correct
   - Works on smaller screens (iPhone SE size)
