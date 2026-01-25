# Equipment Detail Page - PARITY CHECKLIST

**Route:** `/equipment/:id`  
**Mobile Screen:** `EquipmentDetailScreen.tsx`  
**Last Updated:** 2026-01-14  
**Status:** ⚠️ PARTIAL - Core booking flow done, Payment pending (by design)

---

## 1. Route & Parameters

| Attribute | Web | Mobile | Status |
|-----------|-----|--------|--------|
| Route path | `/equipment/:id` | `/equipment/:id` | ✅ Match |
| Param: `equipmentId` | string (UUID) | string (UUID) | ✅ Match |
| Auth guard | None (public) | None (public) | ✅ Match |
| Redirect logic | None | None | ✅ Match |

---

## 2. Web Source Files

### Core Files
| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/equipment/EquipmentDetailPage.tsx` | 166 | SEO wrapper, basic display |
| `src/components/equipment/detail/EquipmentDetailDialog.tsx` | 773 | **MAIN IMPLEMENTATION** - Full booking flow |

### Booking Components
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/booking/BookingSidebar.tsx` | 151 | Desktop booking sidebar |
| `src/components/booking/MobileSidebarDrawer.tsx` | 250 | Mobile drawer with booking + payment |
| `src/components/booking/FloatingBookingCTA.tsx` | 148 | Floating "Book Now" button |
| `src/components/booking/sidebar/DateSelector.tsx` | ~80 | Date range picker UI |
| `src/components/booking/sidebar/PricingHeader.tsx` | ~50 | Price per day display |
| `src/components/booking/sidebar/LocationContact.tsx` | ~60 | Owner location info |
| `src/components/booking/sidebar/PricingBreakdown.tsx` | ~100 | Detailed cost breakdown |
| `src/components/booking/sidebar/InsuranceSelector.tsx` | ~120 | Insurance options |
| `src/components/booking/sidebar/BookingButton.tsx` | ~80 | Submit booking button |

### Calendar & Payment
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/AvailabilityCalendar.tsx` | ~200 | Date picker with availability |
| `src/components/payment/PaymentCheckoutForm.tsx` | 400 | Stripe Elements integration |

### Utility Files
| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/booking.ts` | 323 | `calculateBookingTotal`, `checkBookingConflicts` |
| `src/types/booking.ts` | ~100 | `BookingCalculation`, `InsuranceType`, `BookingConflict` |
| `src/types/equipment.ts` | ~150 | Equipment types |

---

## 3. Mobile Target File

| File | Current Lines | Status |
|------|---------------|--------|
| `apps/mobile/src/screens/EquipmentDetailScreen.tsx` | ~430 | ⚠️ PARTIAL (booking flow done, payment placeholder) |

---

## 4. Feature Inventory & Parity Matrix

### 4.1 Data Fetching

| # | Feature | Web Implementation | Mobile Status | Action | Priority |
|---|---------|-------------------|---------------|--------|----------|
| 1 | Fetch equipment by ID | `useQuery` + `supabase.from('equipment').select('*, profiles(*)')` | ✅ Implemented | - | - |
| 2 | Fetch equipment images | Included in main query | ✅ Implemented | - | - |
| 3 | Fetch owner profile | Join with profiles table | ✅ Implemented | - | - |
| 4 | Fetch blocked dates | `useQuery` for `equipment_availability` | ✅ Ported | - | P0 |
| 5 | Loading state | Skeleton UI | ⚠️ Partial (basic spinner) | Improve | P2 |
| 6 | Error state | Toast + fallback UI | ⚠️ Partial | Improve | P2 |
| 7 | 404 handling | Redirect or error message | 🔴 Missing | Port | P1 |

### 4.2 Photo Gallery

| # | Feature | Web Implementation | Mobile Status | Action | Priority |
|---|---------|-------------------|---------------|--------|----------|
| 8 | Main image display | Full-width hero image | ✅ Implemented | - | - |
| 9 | Thumbnail carousel | Horizontal scroll thumbnails | ✅ Implemented | - | - |
| 10 | Image zoom/lightbox | Dialog with full-screen view | 🔴 Missing | Port | P1 |
| 11 | Swipe gestures | Native swipe on mobile | 🔴 Missing | Port | P1 |
| 12 | Image counter | "1 / 5" indicator | 🔴 Missing | Port | P2 |

### 4.3 Equipment Info Display

| # | Feature | Web Implementation | Mobile Status | Action | Priority |
|---|---------|-------------------|---------------|--------|----------|
| 13 | Title | `<h1>` with equipment name | ✅ Implemented | - | - |
| 14 | Category badge | Badge with category name | ✅ Implemented | - | - |
| 15 | Condition badge | Colored badge (Excellent/Good/Fair) | ✅ Implemented | - | - |
| 16 | Price per day | `€XX/day` format | ✅ Implemented | - | - |
| 17 | Location | City/address with icon | ✅ Implemented | - | - |
| 18 | Description | Full text with line clamp | ✅ Implemented | - | - |
| 19 | Specifications list | Key-value pairs | 🔴 Missing | Port | P1 |
| 20 | Features/amenities | Chip list | 🔴 Missing | Port | P1 |

### 4.4 Owner Section

| # | Feature | Web Implementation | Mobile Status | Action | Priority |
|---|---------|-------------------|---------------|--------|----------|
| 21 | Owner avatar | Avatar with fallback | ✅ Implemented | - | - |
| 22 | Owner name | Display name | ✅ Implemented | - | - |
| 23 | Owner rating | Star rating with count | 🔴 Missing | Port | P1 |
| 24 | Member since | Join date | 🔴 Missing | Port | P2 |
| 25 | Response time | Average response time | 🔴 Missing | Port | P2 |
| 26 | Contact button | Opens messaging | 🔴 Missing | Port | P1 |
| 27 | View profile link | Navigate to owner profile | 🔴 Missing | Port | P1 |

### 4.5 Location & Map

| # | Feature | Web Implementation | Mobile Status | Action | Priority |
|---|---------|-------------------|---------------|--------|----------|
| 28 | Static map preview | Leaflet or Google Maps embed | ⚠️ Placeholder only | Implement | P2 |
| 29 | Address display | Formatted address | ✅ Implemented | - | - |
| 30 | Open in maps | External link to Google/Apple Maps | 🔴 Missing | Port | P2 |

### 4.6 Reviews Tab

| # | Feature | Web Implementation | Mobile Status | Action | Priority |
|---|---------|-------------------|---------------|--------|----------|
| 31 | Reviews list | Paginated reviews | 🔴 Missing | Port | P1 |
| 32 | Average rating | Star display with decimal | 🔴 Missing | Port | P1 |
| 33 | Rating breakdown | 5-star bar chart | 🔴 Missing | Port | P2 |
| 34 | Individual review card | Avatar, name, date, rating, text | 🔴 Missing | Port | P1 |
| 35 | Load more reviews | Pagination or infinite scroll | 🔴 Missing | Port | P2 |
| 36 | Empty state | "No reviews yet" message | 🔴 Missing | Port | P1 |

### 4.7 Availability Calendar

| # | Feature | Web Implementation | Mobile Status | Action | Priority |
|---|---------|-------------------|---------------|--------|----------|
| 37 | Calendar display | `AvailabilityCalendar` component | ✅ Ported | - | P0 |
| 38 | Blocked dates | Grayed out/disabled dates | ✅ Ported | - | P0 |
| 39 | Date range selection | Click start + end date | ✅ Ported | - | P0 |
| 40 | Selected range highlight | Visual highlight of range | ✅ Ported | - | P0 |
| 41 | Month navigation | Prev/Next month buttons | ✅ Ported | - | P0 |
| 42 | Min booking duration | Enforce minimum days | ✅ Ported | - | P0 |
| 43 | Max advance booking | Limit how far ahead | ✅ Ported | - | P1 |

### 4.8 Booking Flow

| # | Feature | Web Implementation | Mobile Status | Action | Priority |
|---|---------|-------------------|---------------|--------|----------|
| 44 | Date selection state | `dateRange: { from, to }` | ✅ Ported | - | P0 |
| 45 | Conflict checking | `checkBookingConflicts()` | ✅ Ported | - | P0 |
| 46 | Price calculation | `calculateBookingTotal()` | ✅ Ported | - | P0 |
| 47 | Days count | Computed from date range | ✅ Ported | - | P0 |
| 48 | Base price display | Daily rate × days | ✅ Ported | - | P0 |
| 49 | Service fee | Platform fee calculation | ✅ Ported | - | P0 |
| 50 | Insurance options | None / Basic / Premium | ✅ Ported | - | P0 |
| 51 | Insurance price | Per-day insurance cost | ✅ Ported | - | P0 |
| 52 | Deposit amount | Security deposit display | ✅ Ported | - | P0 |
| 53 | Total calculation | Sum of all fees | ✅ Ported | - | P0 |
| 54 | Pricing breakdown UI | Itemized list | ✅ Ported | - | P0 |

### 4.9 Floating CTA & Mobile Drawer

| # | Feature | Web Implementation | Mobile Status | Action | Priority |
|---|---------|-------------------|---------------|--------|----------|
| 55 | Floating CTA button | `FloatingBookingCTA` - sticky bottom | ✅ Ported | - | P0 |
| 56 | CTA shows price | "€XX/day - Book Now" | ✅ Ported | - | P0 |
| 57 | Mobile drawer | `MobileSidebarDrawer` - Sheet from bottom | ✅ Ported | - | P0 |
| 58 | Drawer states | dates → insurance → payment | ✅ Ported (payment placeholder) | - | P0 |
| 59 | Drawer navigation | Back/Continue buttons | ✅ Ported | - | P0 |

### 4.10 Payment Integration

| # | Feature | Web Implementation | Mobile Status | Action | Priority |
|---|---------|-------------------|---------------|--------|----------|
| 60 | Auth check | Require login before payment | 🔴 Missing | Port | P0 |
| 61 | PaymentIntent creation | API call to Edge Function | 🔴 Missing | Port | P0 |
| 62 | Stripe Elements | `PaymentElement` component | 🔴 Missing | Port | P0 |
| 63 | Payment form | Card input with validation | 🔴 Missing | Port | P0 |
| 64 | Loading state | Spinner during processing | 🔴 Missing | Port | P0 |
| 65 | Error handling | Display payment errors | 🔴 Missing | Port | P0 |
| 66 | Success redirect | Navigate to confirmation | 🔴 Missing | Port | P0 |
| 67 | Return URL | Deep link for redirect | 🔴 Missing | Port | P0 |

### 4.11 User Actions

| # | Feature | Web Implementation | Mobile Status | Action | Priority |
|---|---------|-------------------|---------------|--------|----------|
| 68 | Share equipment | Share button with native share | 🔴 Missing | Port | P2 |
| 69 | Save/favorite | Heart icon toggle | 🔴 Missing | Port | P2 |
| 70 | Report listing | Flag inappropriate content | 🔴 Missing | Port | P3 |

### 4.12 States & Edge Cases

| # | Feature | Web Implementation | Mobile Status | Action | Priority |
|---|---------|-------------------|---------------|--------|----------|
| 71 | Loading skeleton | Shimmer placeholders | ⚠️ Basic spinner | Improve | P2 |
| 72 | Equipment not found | Error UI | 🔴 Missing | Port | P1 |
| 73 | Equipment unavailable | "Not available" state | 🔴 Missing | Port | P1 |
| 74 | Own equipment | Hide booking, show edit | 🔴 Missing | Port | P1 |
| 75 | Network error | Retry button | 🔴 Missing | Port | P1 |
| 76 | Offline mode | Cached data display | 🔴 Missing | Port | P3 |

---

## 5. Hooks & Libraries Required

### Hooks to Port/Use
| Hook | Source | Purpose | Status |
|------|--------|---------|--------|
| `useAuth` | shared | Get current user | ✅ Available |
| `useQuery` | @tanstack/react-query | Data fetching | ✅ Available |
| `useToast` | @/components/ui/use-toast | Notifications | ✅ Available |
| `useTranslation` | react-i18next | i18n | ✅ Available |
| `useMediaQuery` | @/hooks/use-media-query | Responsive | ⚠️ Not needed in mobile |

### Libraries to Port
| Library | Source | Functions | Status |
|---------|--------|-----------|--------|
| `booking.ts` | `apps/mobile/src/lib/booking.ts` | `calculateBookingTotal`, `checkBookingConflicts`, `INSURANCE_OPTIONS` | ✅ Already exists in mobile |
| Stripe | `@stripe/react-stripe-js` | Payment elements | 🔴 Need Capacitor setup (Mikol) |

### Types to Ensure
| Type | Source | Status |
|------|--------|--------|
| `Equipment` | shared types | ✅ Available |
| `BookingCalculation` | `apps/mobile/src/types/booking.ts` | ✅ Already exists in mobile |
| `InsuranceType` | `apps/mobile/src/types/booking.ts` | ✅ Already exists in mobile |
| `BookingConflict` | `apps/mobile/src/types/booking.ts` | ✅ Already exists in mobile |
| `DateRange` | `react-day-picker` | ✅ Available |

---

## 6. Modals & Sheets

| Modal/Sheet | Web Component | Trigger | Mobile Equivalent |
|-------------|---------------|---------|-------------------|
| Booking Drawer | `MobileSidebarDrawer` | FloatingCTA tap | `Sheet` component |
| Payment Form | Inside drawer | "Proceed to Payment" | Same drawer, different state |
| Login Prompt | Auth modal | Booking without auth | Redirect to login |
| Image Lightbox | Dialog with carousel | Image tap | Full-screen gallery |
| Success Modal | Toast or redirect | Payment success | Toast + redirect |

---

## 7. API Calls

| API Call | Method | Endpoint | Request | Response | Mobile Status |
|----------|--------|----------|---------|----------|---------------|
| Get equipment | GET | `equipment?id=eq.{id}` | - | Equipment object | ✅ Implemented |
| Get availability | GET | `availability_calendar?equipment_id=eq.{id}` | - | Blocked dates array | ✅ Implemented (useEquipmentAvailability) |
| Get reviews | GET | `reviews?equipment_id=eq.{id}` | - | Reviews array | 🔴 Missing |
| Check conflicts | RPC | `check_booking_conflicts` | dateRange, equipmentId | boolean | ✅ Implemented (checkBookingConflicts) |
| Create PaymentIntent | POST | Edge Function `create-payment-intent` | amount, equipmentId, dates, insurance | clientSecret | 🔴 Missing (Mikol) |
| Confirm payment | POST | Stripe API | paymentIntentId | Success/Error | 🔴 Missing (Mikol) |

---

## 8. Acceptance Criteria

### Must Have (P0) - Booking Flow (NO Payment)
- [x] Calendar displays with blocked dates
- [x] User can select date range
- [x] Conflicts are checked and displayed
- [x] Price calculation matches web exactly
- [x] Insurance can be selected
- [x] Pricing breakdown shows all fees
- [x] Floating CTA opens booking drawer
- [ ] Auth check before payment → ✅ Implemented (redirects to /login)
- [ ] Stripe payment works → 🔴 Placeholder (Mikol)
- [ ] Success redirects to confirmation → 🔴 Placeholder (Mikol)

### Should Have (P1)
- [ ] Reviews section displays
- [ ] Owner rating and info
- [ ] Contact owner button
- [ ] Image lightbox
- [ ] Equipment not found handling
- [ ] Own equipment detection
- [ ] Specifications display

### Nice to Have (P2+)
- [ ] Map integration
- [ ] Share functionality
- [ ] Favorite/save
- [ ] Loading skeletons
- [ ] Rating breakdown chart

---

## 9. Summary Statistics

| Category | Total | ✅ Done | ⚠️ Partial | 🔴 Missing |
|----------|-------|---------|------------|------------|
| Data Fetching | 7 | 4 | 2 | 1 |
| Photo Gallery | 5 | 2 | 0 | 3 |
| Equipment Info | 8 | 6 | 0 | 2 |
| Owner Section | 7 | 2 | 0 | 5 |
| Location & Map | 3 | 1 | 1 | 1 |
| Reviews Tab | 6 | 0 | 0 | 6 |
| Availability Calendar | 7 | 7 | 0 | 0 |
| Booking Flow | 11 | 11 | 0 | 0 |
| Floating CTA & Drawer | 5 | 5 | 0 | 0 |
| Payment Integration | 8 | 0 | 0 | 8 |
| User Actions | 3 | 0 | 0 | 3 |
| States & Edge Cases | 6 | 0 | 1 | 5 |
| **TOTAL** | **76** | **38 (50%)** | **4 (5%)** | **34 (45%)** |

---

## 10. Implementation Order

### Phase 1: Core Booking Infrastructure (P0) ✅ COMPLETED
1. ~~Port `src/lib/booking.ts`~~ → Already exists at `apps/mobile/src/lib/booking.ts`
2. ~~Port booking types~~ → Already exists at `apps/mobile/src/types/booking.ts`
3. ~~Create `AvailabilityCalendar` mobile component~~ → Created `AvailabilityIndicatorCalendar`
4. ~~Create `BookingDrawer`~~ → Created `MobileSidebarDrawer`

### Phase 2: Booking Flow UI (P0) ✅ COMPLETED
5. ~~Add date selection state to screen~~ → Done in EquipmentDetailScreen
6. ~~Implement `DateSelector` in drawer~~ → Done
7. ~~Implement `InsuranceSelector` in drawer~~ → Done
8. ~~Implement `PricingBreakdown` in drawer~~ → Done
9. ~~Fix `FloatingBookingCTA` to open drawer~~ → Done

### Phase 3: Payment Integration (P0) 🔴 PENDING (Mikol)
10. Setup Stripe for Capacitor (may need `@stripe/stripe-react-native` investigation)
11. Port `PaymentCheckoutForm` for mobile
12. Implement payment success/error handling
13. Add confirmation redirect

### Phase 4: Reviews & Polish (P1)
14. Add reviews fetch
15. Create reviews list UI
16. Add owner rating display
17. Implement contact owner
18. Add image lightbox

### Phase 5: Edge Cases & Polish (P1-P2)
19. Equipment not found handling
20. Own equipment detection
21. Specifications display
22. Loading skeletons
23. Map integration

---

## 11. Testing Checklist

### Functional Tests
- [ ] Select dates → calculation updates correctly
- [ ] Select blocked date → shows error
- [ ] Change insurance → total updates
- [ ] Tap Book Now → drawer opens
- [ ] Not logged in → prompted to login
- [ ] Enter payment → Stripe validates
- [ ] Payment success → redirect works
- [ ] Payment failure → error shows

### Edge Case Tests
- [ ] Equipment with no images
- [ ] Equipment with no reviews
- [ ] Equipment owned by current user
- [ ] Equipment not found (invalid ID)
- [ ] Network offline during load
- [ ] Network offline during payment

### UI/UX Tests
- [ ] Gallery swipe works smoothly
- [ ] Drawer animation is smooth
- [ ] Keyboard doesn't cover inputs
- [ ] All text is i18n translated
- [ ] Prices formatted correctly (€)
- [ ] Dates formatted correctly (locale)

---

## 12. Stripe Capacitor Investigation Notes

**Option A: Stripe React Native**
- Requires `@stripe/stripe-react-native`
- Needs native bridge via Capacitor
- More complex setup but native experience

**Option B: Stripe.js in WebView**
- Use same `@stripe/react-stripe-js` as web
- Works in Capacitor WebView
- Simpler, same code as web
- May have redirect issues

**Recommendation:** Start with Option B (WebView) as it's same codebase. Only switch to Option A if issues arise.

**Return URL for Capacitor:**
```typescript
// Use Capacitor deep link
const returnUrl = Capacitor.isNativePlatform() 
  ? 'app.rentaloo.mobile://payment/confirmation'
  : `${window.location.origin}/payment/confirmation`;
```

---

## 13. Files to Create/Modify

### New Files (Mobile)
```
apps/mobile/src/
├── components/
│   └── booking/
│       ├── BookingDrawer.tsx         # Main drawer component
│       ├── DateSelector.tsx          # Date picker section
│       ├── InsuranceSelector.tsx     # Insurance options
│       ├── PricingBreakdown.tsx      # Cost breakdown
│       ├── BookingButton.tsx         # Submit button
│       └── FloatingBookingCTA.tsx    # Fixed bottom CTA
│   └── equipment/
│       └── ImageGallery.tsx          # Swipeable gallery
├── screens/
│   └── EquipmentDetailScreen.tsx     # UPDATE existing
```

### Shared Package Additions
```
packages/shared/src/
├── lib/
│   └── booking.ts                    # PORT from src/lib/booking.ts
├── types/
│   └── booking.ts                    # PORT from src/types/booking.ts
```

### Files to Modify
- `apps/mobile/src/screens/EquipmentDetailScreen.tsx` - Major update
- `apps/mobile/src/App.tsx` - Add payment confirmation route

---

*Document generated for porting /equipment/:id to mobile app*
