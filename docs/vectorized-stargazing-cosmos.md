# Delightful Popups & Microinteractions Implementation Plan

## Overview
Add celebratory moments, helpful tooltips, and social proof indicators across Vaymo to make the app feel alive like Airbnb.

---

## Phase 1: Infrastructure Setup

### 1.1 Add TooltipProvider to App Root
**File:** `src/App.tsx`
- Wrap app content with `<TooltipProvider delayDuration={300}>`
- Remove individual `TooltipProvider` from `ListingCard.tsx`

### 1.2 Install Confetti Library
```bash
npm install canvas-confetti && npm install -D @types/canvas-confetti
```

### 1.3 Create Celebration Utilities
**New File:** `src/lib/celebrations.ts`
- `fireConfetti()` - General celebration
- `fireHeartConfetti()` - Favorites (red particles, top-right origin)
- `fireSuccessConfetti()` - Payment/booking success (green, dual-sided)

### 1.4 Add CSS Animations
**File:** `src/index.css`
- `@keyframes celebrate-pulse` - Badge highlight
- `@keyframes bounce-in` - Entry animation
- `@keyframes social-proof-enter` - Fade-slide for badges
- `@keyframes urgent-pulse` - Pulsing ring for urgent actions

---

## Phase 2: Equipment Cards & Browsing

### 2.1 Favorites Celebration
**File:** `src/components/equipment/ListingCard.tsx`
- Fire `fireHeartConfetti()` when item is favorited (not unfavorited)
- Keep existing toast notification

### 2.2 Social Proof Badges
**File:** `src/components/equipment/ListingCard.tsx`
- Add "Top Rated" badge (amber) when `avgRating >= 4.5`
- Add "Popular" badge (blue) when `reviews.length >= 5`
- Position: top-left of image, with tooltip explaining badge

### 2.3 Owner Rating HoverCard
**File:** `src/components/equipment/ListingCard.tsx`
- Wrap rating display with `<HoverCard>`
- Show owner avatar, name, review count, star breakdown on hover

### 2.4 i18n Keys
**Files:** `src/i18n/locales/{en,es,fr,de,it}/equipment.json`
```json
"listing_card": {
  "top_rated": "Top Rated",
  "top_rated_tooltip": "This item has a {{rating}} star rating",
  "popular": "Popular"
}
```

---

## Phase 3: Booking Flow

### 3.1 Booking Button Enhancement
**File:** `src/components/booking/sidebar/BookingButton.tsx`
- Add hover scale effect: `hover:scale-[1.02] active:scale-[0.98]`
- Add shadow on hover: `hover:shadow-lg`

### 3.2 Payment Success Celebration
**File:** `src/pages/payment/PaymentConfirmation.tsx`
- Fire `fireSuccessConfetti()` on mount when payment succeeds
- Add `animate-bounce-in` to success icon

### 3.3 Date Selection Toast
**File:** `src/components/booking/sidebar/DateSelector.tsx`
- Show Sonner toast when dates are confirmed: "Dates confirmed! Mar 5 - Mar 8 (4 days)"

### 3.4 i18n Keys
**File:** `src/i18n/locales/en/booking.json`
```json
"dates_selected": "Dates confirmed!",
"dates_selected_description": "{{start}} - {{end}} ({{days}} days)"
```

---

## Phase 4: Onboarding

### 4.1 Step Progression Celebrations
**File:** `src/pages/auth/OnboardingPage.tsx`
- Toast on each step completion: "Step X complete!"
- Fire small confetti on completing step 2 (before final step)
- Fire `fireSuccessConfetti()` on profile completion

### 4.2 Role Selection Tooltips
**File:** `src/pages/auth/OnboardingPage.tsx`
- Add `<HelpCircle>` icon next to each role option
- Show tooltip explaining what each role does

### 4.3 Interest Selection Animation
- Add `animate-celebrate-pulse` when interest is selected

### 4.4 i18n Keys
**File:** `src/i18n/locales/en/auth.json`
```json
"onboarding": {
  "step_complete": "Step {{step}} complete!",
  "renter_tooltip": "Browse and book equipment from owners in your area",
  "owner_tooltip": "List your equipment for rent and earn money"
}
```

---

## Phase 5: Owner Dashboard

### 5.1 Urgent Action Nudges
**File:** `src/pages/owner/OwnerDashboard.tsx`
- Add `animate-urgent-pulse` to pending requests alert when `count >= 3`
- Wrap in `<Popover>` showing quick list of pending requests

### 5.2 Earnings Milestone Celebrations
**File:** `src/components/dashboard/CompactStats.tsx`
- Track earnings in localStorage
- Fire confetti + toast when crossing milestones: $100, $500, $1000, $5000

### 5.3 Stat Card Tooltips
- Wrap each stat card with `<Tooltip>` explaining what it means

### 5.4 i18n Keys
**File:** `src/i18n/locales/en/dashboard.json`
```json
"earnings_milestone": "Congratulations! You've earned ${{amount}}!",
"pending_tooltip": "{{count}} booking requests waiting for approval"
```

---

## Phase 6: Listing Wizard Upgrade

### 6.1 Enhanced Success State
**File:** `src/components/equipment/listing-wizard/ListingWizard.tsx`
- Fire `fireSuccessConfetti()` when listing is published
- Add `<Sparkles>` icon with staggered animation
- Extend success display from 2s to 2.5s

### 6.2 Step Completion Toasts
- Show toast when completing each wizard step

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add TooltipProvider wrapper |
| `src/lib/celebrations.ts` | **NEW** - Confetti utilities |
| `src/index.css` | Add animation keyframes |
| `src/components/equipment/ListingCard.tsx` | Favorites confetti, badges, HoverCard |
| `src/pages/payment/PaymentConfirmation.tsx` | Success confetti |
| `src/components/booking/sidebar/BookingButton.tsx` | Hover effects |
| `src/components/booking/sidebar/DateSelector.tsx` | Date selection toast |
| `src/pages/auth/OnboardingPage.tsx` | Step celebrations, role tooltips |
| `src/pages/owner/OwnerDashboard.tsx` | Urgent nudges popover |
| `src/components/dashboard/CompactStats.tsx` | Milestone celebrations, tooltips |
| `src/components/equipment/listing-wizard/ListingWizard.tsx` | Enhanced success |
| `src/i18n/locales/*/equipment.json` | Badge translation keys |
| `src/i18n/locales/*/booking.json` | Date confirmation keys |
| `src/i18n/locales/*/auth.json` | Onboarding step keys |
| `src/i18n/locales/*/dashboard.json` | Milestone/tooltip keys |

---

## Verification

1. **Test TooltipProvider**: Verify tooltips work throughout app without duplicates
2. **Test Confetti**: Check celebrations fire on favorites, payment success, listing publish
3. **Test Badges**: Verify "Top Rated" shows for 4.5+ ratings, "Popular" for 5+ reviews
4. **Test Accessibility**: Confirm `prefers-reduced-motion` is respected
5. **Test i18n**: Switch languages and verify all new strings translate
6. **Test Mobile**: Ensure HoverCards work as click-to-open on touch devices
7. **Run Build**: `npm run build` - no TypeScript errors
