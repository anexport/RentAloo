# Equipment Cards on Mobile — Resize Plan (Airbnb-like)

## Context
Equipment cards across the app (including the homepage) feel oversized on mobile. The goal is to make them more compact and closer to Airbnb's mobile "listing card" density.

**Target devices**: 360–390px width (iPhone 12/13/14, Pixel, Galaxy S series)
**Breakpoint trigger**: `<768px` (md breakpoint) — aligns with existing `isMobile` detection in codebase

---

## 1) Components inventory (what to change)

### Core card components
| Component | Path | Current state | Action needed |
|-----------|------|---------------|---------------|
| `ListingCard` | `src/components/equipment/ListingCard.tsx` | Desktop-optimized, oversized on mobile | Add responsive compact mode |
| `ListingCardSkeleton` | `src/components/equipment/ListingCardSkeleton.tsx` | Matches desktop ListingCard | Mirror compact mode changes |
| `MobilePeekCard` | `src/components/equipment/MobilePeekCard.tsx` | **Already compact** (160px wide, p-2, text-sm) | Reference pattern — no changes needed |
| `MobileListingRow` | `src/components/equipment/MobileListingRow.tsx` | Horizontal row for ExplorePage | Keep as-is — already mobile-optimized |

### Surfaces where cards render (and appear oversized)
| Surface | Path | Current issue | Fix |
|---------|------|---------------|-----|
| Homepage browse grid | `src/pages/HomePage.tsx` | 1-col on mobile, gap-6 | 2-col grid, gap-3 |
| Featured carousel | `src/components/explore/FeaturedListingsSection.tsx` | 100% width slides, gap-6 | 85% width (peek), gap-4 |
| Recommendations carousel | `src/components/renter/RecommendationsSection.tsx` | 100% width slides, gap-6 | 85% width (peek), gap-4 |
| Saved/watchlist grid | `src/components/renter/SavedEquipmentTab.tsx` | 1-col on mobile, gap-6 | 2-col grid, gap-3 |
| Virtual grid wrapper | `src/components/equipment/VirtualListingGrid.tsx` | 1-col on mobile, gap-6 | 2-col grid, gap-3 |
| Mobile bottom sheet | `src/components/explore/MobileListingsBottomSheet.tsx` | Uses MobilePeekCard | Verify gap consistency (gap-3) |

### Surfaces already optimized (no changes needed)
- `src/pages/ExplorePage.tsx` — uses `MobileListingRow` on mobile (horizontal list style)
- `MobilePeekCard` in bottom sheet peek state — already compact

---

## 2) Why our cards feel too big on mobile (current state)

**ListingCard.tsx current sizing:**
```
Image:       aspect-video (16:9)
Padding:     p-4 (16px)
Title:       text-lg (18px)
Price:       text-xl (20px)
Description: Visible, 2 lines
CTA:         1-2 full-width buttons
```

**Carousel current sizing:**
```
Mobile slide width:  flex-[0_0_100%] (full viewport)
Gap:                 gap-6 (24px)
```

**Grid current sizing:**
```
Mobile columns:  1 column
Gap:             gap-6 (24px)
```

---

## 3) Target specifications (Airbnb-inspired)

### ListingCard compact mode (mobile)
```
Image:       aspect-[4/3] (more square, fits better in 2-col)
Padding:     p-3 (12px)
Title:       text-base (16px), line-clamp-1
Price:       text-lg (18px)
Description: HIDDEN on mobile (max-md:hidden)
CTA buttons: HIDDEN on mobile — entire card is tap target
Location:    HIDDEN on mobile — save vertical space
Rating:      Keep, but smaller (scale-90 or text-xs)
```

### Carousel compact mode (mobile)
```
Mobile slide width:  flex-[0_0_85%] (shows peek of next card)
Gap:                 gap-4 (16px)
```

### Grid compact mode (mobile)
```
Mobile columns:  2 columns (grid-cols-2)
Gap:             gap-3 (12px)
```

---

## 4) Implementation approach

**Decision: Hybrid (responsive CSS as default, no prop needed)**

Use Tailwind responsive prefixes directly in components. The existing `isMobile` check (`useMediaQuery(createMaxWidthQuery("md"))`) is already in ListingCard and can be leveraged for JS-dependent changes (like hiding buttons).

**Why not a `variant` prop?**
- All mobile contexts want compact mode — no need for explicit control
- Reduces API surface and decision-making for consumers
- Easier to maintain consistency

---

## 5) Implementation plan (file-by-file)

### A) `src/components/equipment/ListingCard.tsx`

**Image container (line ~155-156):**
```diff
- className="aspect-video bg-muted relative overflow-hidden..."
+ className="aspect-video md:aspect-video aspect-[4/3] bg-muted relative overflow-hidden..."
```
Note: Mobile-first, so `aspect-[4/3]` is default, `md:aspect-video` for desktop.

**CardContent padding (line ~307):**
```diff
- <CardContent className="p-4 flex flex-col flex-1">
+ <CardContent className="p-3 md:p-4 flex flex-col flex-1">
```

**Title (line ~309):**
```diff
- <h3 className="font-semibold text-lg line-clamp-1">
+ <h3 className="font-semibold text-base md:text-lg line-clamp-1">
```

**Price (line ~313):**
```diff
- <div className="text-xl font-bold text-primary tabular-nums">
+ <div className="text-lg md:text-xl font-bold text-primary tabular-nums">
```

**Description (line ~322-324):**
```diff
- <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
+ <p className="text-muted-foreground text-sm mb-3 line-clamp-2 hidden md:block">
```

**Location row (line ~325-345):**
```diff
- <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
+ <div className="flex items-center justify-between text-sm text-muted-foreground mb-4 md:mb-4 mb-2">
```

Hide location on mobile, keep rating:
```diff
- <div className="flex items-center space-x-1 min-w-0 flex-1 mr-2">
+ <div className="flex items-center space-x-1 min-w-0 flex-1 mr-2 hidden md:flex">
```

**CTA buttons section (line ~347-365):**
Replace entire button section with mobile-aware version:
```tsx
{/* Desktop: show buttons. Mobile: card is tap target, no buttons */}
<div className="hidden md:flex gap-2 mt-auto">
  <Button variant="outline" className="flex-1" onClick={handleOpen}>
    {t("listing_card.view")}
  </Button>
  <Button className="flex-1" onClick={handleOpen}>
    {t("listing_card.see_availability")}
  </Button>
</div>
```

Remove the existing `isMobile` conditional for the outline button since we're hiding the entire section on mobile.

**Wishlist button — KEEP current size:**
Current `h-11 w-11` (44px) is correct for touch targets. Do not reduce.

### B) `src/components/equipment/ListingCardSkeleton.tsx`

Mirror all ListingCard responsive changes:
- Image: `aspect-[4/3] md:aspect-video`
- Padding: `p-3 md:p-4`
- Hide description skeleton on mobile: `hidden md:block`
- Hide CTA skeleton on mobile: `hidden md:flex`
- Hide location skeleton on mobile: `hidden md:flex`

### C) `src/pages/HomePage.tsx`

Find the grid container for browse listings and update:
```diff
- className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
+ className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6"
```

### D) `src/components/equipment/VirtualListingGrid.tsx`

Update grid container classes:
```diff
- className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
+ className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6"
```

Update `skeletonCount` logic to account for 2 columns on mobile:
```tsx
const skeletonCount = useMemo(() => {
  if (typeof window === "undefined") return 6;
  const width = window.innerWidth;
  if (width < 768) return 4;  // 2 columns × 2 rows
  if (width < 1024) return 4; // 2 columns × 2 rows
  return 6;                   // 3 columns × 2 rows
}, []);
```

### E) `src/components/explore/FeaturedListingsSection.tsx`

Update carousel slide basis for mobile peek:
```diff
- className="... flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(25%-18px)]"
+ className="... flex-[0_0_85%] sm:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(25%-18px)]"
```

Update gap:
```diff
- className="flex gap-6"
+ className="flex gap-4 md:gap-6"
```

### F) `src/components/renter/RecommendationsSection.tsx`

Same changes as FeaturedListingsSection:
- Slide basis: `flex-[0_0_85%]` on mobile
- Gap: `gap-4 md:gap-6`

### G) `src/components/renter/SavedEquipmentTab.tsx`

Update grid:
```diff
- className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr"
+ className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 auto-rows-fr"
```

### H) `src/components/explore/MobileListingsBottomSheet.tsx`

Verify peek carousel gap is `gap-3` (should already be correct based on exploration).

---

## 6) Accessibility requirements (MUST comply)

### Touch targets
- [ ] Wishlist button: Keep `h-11 w-11` (44px minimum)
- [ ] Carousel nav arrows: Keep `min-w-11 min-h-11` (44px minimum)
- [ ] Image dot indicators: Keep `min-w-[44px] min-h-[44px]` wrapper
- [ ] Entire card must be tappable on mobile (already is via `onClick={handleOpen}`)

### Text minimums
- [ ] Title: `text-base` (16px) minimum — OK
- [ ] Price: `text-lg` (18px) — OK
- [ ] Secondary text: `text-xs` (12px) minimum — never go smaller
- [ ] Rating text: `text-xs` (12px) — OK

### Focus states
- [ ] Card must show visible focus ring when focused via keyboard
- [ ] Current `hover:shadow-xl hover:-translate-y-1` should have `focus-visible:` equivalent

### Color contrast
- [ ] No changes to colors in this plan — existing contrast ratios maintained

---

## 7) Testing requirements

### Device widths to test
| Width | Device | Priority |
|-------|--------|----------|
| 360px | Galaxy S series, older phones | High |
| 375px | iPhone SE, iPhone 8 | High |
| 390px | iPhone 12/13/14 | High |
| 428px | iPhone 14 Pro Max | Medium |
| 744px | iPad Mini | Medium |
| 768px | Breakpoint boundary | High |
| 820px | iPad Air | Low |

### Orientations
- [ ] Portrait (primary)
- [ ] Landscape (secondary — verify no breakage)

### Pages to verify
- [ ] HomePage — browse grid, featured carousel, recommendations carousel
- [ ] SavedEquipmentTab — saved items grid
- [ ] ExplorePage — verify MobileListingRow still works (no changes expected)
- [ ] Any page using VirtualListingGrid

### Functional checks
- [ ] Tapping card opens detail dialog/page
- [ ] Tapping wishlist heart toggles favorite (does NOT open card)
- [ ] Carousel swipe works smoothly with 85% width slides
- [ ] Carousel "peek" shows edge of next card
- [ ] Skeleton loading state matches final card dimensions
- [ ] No text overflow (line-clamp working)
- [ ] No horizontal scroll on page (cards fit in viewport)

### Performance checks
- [ ] No layout shift when images load (aspect ratio enforced)
- [ ] Smooth carousel animations with new peek width
- [ ] No jank when scrolling grids with more visible cards

---

## 8) Validation / acceptance criteria

### Visual density
- [ ] On 360–390px widths: **2 cards per row** in grids
- [ ] On 360–390px widths: **~85% card visible** in carousels with next card peeking
- [ ] Cards feel noticeably more compact than current state
- [ ] Vertical space usage reduced (no description, no CTA buttons on mobile)

### Layout robustness
- [ ] No text overflow — `line-clamp-1` on titles working
- [ ] No large blank areas
- [ ] Skeleton state matches final layout density exactly
- [ ] 2-col grid alignment is even (cards same height via `auto-rows-fr` or flexbox)

### Interaction correctness
- [ ] Tapping card → opens details ✓
- [ ] Tapping heart → toggles favorite, does NOT open card ✓
- [ ] Carousel swipe → smooth, snaps correctly ✓
- [ ] Keyboard focus → visible focus ring ✓

---

## 9) Files changed summary

| File | Type of change |
|------|----------------|
| `src/components/equipment/ListingCard.tsx` | Responsive classes for compact mobile |
| `src/components/equipment/ListingCardSkeleton.tsx` | Mirror ListingCard responsive changes |
| `src/pages/HomePage.tsx` | 2-col grid, smaller gap on mobile |
| `src/components/equipment/VirtualListingGrid.tsx` | 2-col grid, smaller gap, skeleton count |
| `src/components/explore/FeaturedListingsSection.tsx` | 85% slide width, smaller gap on mobile |
| `src/components/renter/RecommendationsSection.tsx` | 85% slide width, smaller gap on mobile |
| `src/components/renter/SavedEquipmentTab.tsx` | 2-col grid, smaller gap on mobile |
| `src/components/explore/MobileListingsBottomSheet.tsx` | Verify gap consistency (likely no change) |

---

## 10) Out of scope (explicitly not changing)

- `MobilePeekCard.tsx` — already compact, reference pattern
- `MobileListingRow.tsx` — already mobile-optimized for ExplorePage
- `ExplorePage.tsx` — already uses mobile-specific components
- Desktop card appearance — no changes above 768px
- Dark mode — no color changes, existing theming preserved
- RTL support — no layout direction changes needed
- Animation timing — keep existing transitions unless issues found

---

## 11) Quick reference: before/after

### ListingCard mobile
| Property | Before | After |
|----------|--------|-------|
| Image aspect | 16:9 | 4:3 |
| Padding | 16px | 12px |
| Title size | 18px | 16px |
| Price size | 20px | 18px |
| Description | Visible | Hidden |
| Location | Visible | Hidden |
| CTA buttons | 1-2 buttons | None (card is tap target) |

### Grids mobile
| Property | Before | After |
|----------|--------|-------|
| Columns | 1 | 2 |
| Gap | 24px | 12px |

### Carousels mobile
| Property | Before | After |
|----------|--------|-------|
| Slide width | 100% | 85% |
| Gap | 24px | 16px |
| Peek visible | No | Yes |
