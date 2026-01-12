# Equipment Cards on Mobile — Resize Plan (Airbnb-like)

## Context
Equipment cards across the app (including the homepage) feel oversized on mobile. The goal is to make them more compact and closer to Airbnb’s mobile “listing card” density.

Note: From this environment we can’t reliably inspect `airbnb.com.au` directly (network restricted + heavy JS rendering). This plan therefore uses:
- A concrete DevTools measurement checklist for Airbnb (to capture exact sizes on your machine).
- Known Airbnb mobile card patterns (compact content, tighter spacing, carousel “peek”).

## 1) Where our “equipment cards” come from (what to change)
**Core card**
- `src/components/equipment/ListingCard.tsx`

**Skeleton**
- `src/components/equipment/ListingCardSkeleton.tsx`

**Surfaces where cards render and likely appear oversized**
- Homepage browse grid: `src/pages/HomePage.tsx`
- Featured carousel: `src/components/explore/FeaturedListingsSection.tsx`
- Recommendations carousel: `src/components/renter/RecommendationsSection.tsx`
- Saved/watchlist grid: `src/components/renter/SavedEquipmentTab.tsx`
- Virtual grid wrapper controlling columns/gaps: `src/components/equipment/VirtualListingGrid.tsx`

**Important note**
- `src/pages/ExplorePage.tsx` already uses `MobileListingRow` on mobile, so it’s probably not the main offender.

## 2) Why our cards feel too big on mobile (current drivers)
- **Carousels use full-width slides on mobile**: `flex-[0_0_100%]` makes each card a “hero card”.
- **Mobile grids default to 1 column + large gaps**: `gap-6` increases perceived size and reduces density.
- **`ListingCard` is desktop-dense on mobile**:
  - Large content inset: `p-4`
  - Large type: `text-lg` (title), `text-xl` (price)
  - Shows description (extra height)
  - Includes a full-width CTA button (extra height)

## 3) Airbnb-like targets (what we’re aiming for)
Common Airbnb mobile listing-card patterns to mirror:
- **Compact information architecture**: title + rating + location/area + price (no big CTA buttons inside the card).
- **Tighter spacing + smaller secondary text**: feels like ~12–14px for metadata and modest padding.
- **Carousel “peek”**: slides are often ~75–90% width (not 100%), so the next card is visible.
- **More density in browse sections**: often 2 columns on mobile with tighter gaps.

## 4) Airbnb benchmark checklist (how to get exact sizes)
On your machine in Chrome DevTools (Device Toolbar):
1. Test at **390px** (iPhone 12/13/14) and also **360px**.
2. Inspect an Airbnb card in a comparable context (horizontal carousel and/or grid).
3. Record these measurements:
   - Card width (px)
   - Image height (px) and aspect ratio
   - Content padding/inset (px)
   - Font sizes for: title, secondary/meta, and price
   - Vertical spacing between rows (gap)
4. We then set our Tailwind classes to match those numbers (or very close).

## 5) Implementation plan (how we adapt ours, file-by-file)
### A) `src/components/equipment/ListingCard.tsx`
Add a `density`/`variant` prop (e.g. `"default" | "compact"`) or implement mobile-first responsive classes, then apply a compact mobile variant:
- Reduce padding (e.g. `p-3` on small screens).
- Reduce title/price sizing (e.g. title `text-base`, price smaller than `text-xl` on mobile).
- Hide or greatly reduce description on small screens (e.g. `max-sm:hidden`).
- Remove large CTA button(s) on small screens; make the whole card the primary click target (Airbnb-style).
- Optionally reduce wishlist button visual size (while keeping ~44px tap target).
- Consider image aspect ratio closer to Airbnb (often feels more like `4/3` than `16/9`).

### B) `src/components/equipment/ListingCardSkeleton.tsx`
Mirror the compact layout:
- Smaller padding on mobile.
- Remove the CTA-row skeleton on mobile (if the CTA is removed there too).

### C) `src/pages/HomePage.tsx`
Increase density in the card grid on mobile:
- Move from 1 column to 2 columns on small screens.
- Tighten gaps: e.g. `grid-cols-2 gap-3 sm:gap-4 md:gap-6`.
- Render `ListingCard` in compact mode for the homepage listing grid.

### D) `src/components/equipment/VirtualListingGrid.tsx`
For `layout="grid"`:
- Update the container classes to support 2 columns on mobile + smaller gaps.
- Update `skeletonCount` to match the responsive column count (so loading state looks consistent).

### E) `src/components/explore/FeaturedListingsSection.tsx`
Make the mobile carousel less “hero”:
- Change mobile slide basis from `100%` to a “peek” width (e.g. `flex-[0_0_85%]`).
- Reduce mobile gap from `gap-6` to something tighter (e.g. `gap-4`).
- Use compact `ListingCard` styling in this carousel.

### F) `src/components/renter/RecommendationsSection.tsx`
Same carousel adjustments as Featured:
- Mobile slide basis “peek” width (not `100%`).
- Reduced mobile gaps.
- Use compact `ListingCard`.

### G) `src/components/renter/SavedEquipmentTab.tsx`
Increase density similarly to Home:
- Use a 2-column mobile grid + tighter gaps.
- Use compact `ListingCard`.

## 6) Validation / acceptance criteria
### Visual density
- On 360–390px widths, more items appear per screen (2-col grids; shorter cards; carousel peek).

### Interaction correctness
- Tapping the card opens details.
- Tapping the heart toggles favorite without opening the card (no accidental opens).

### Layout robustness
- No text overflow (use `line-clamp` where appropriate).
- No large blank areas.
- Skeleton state matches final layout density.

### Suggested quick checks after changes
- `npm run dev` and manually verify:
  - HomePage cards
  - Featured carousel cards
  - Recommendations carousel cards
  - Saved/watchlist cards
- Optionally lint: `npm exec eslint "src/**/*.{ts,tsx}"`

## 7) Decision needed before implementation
Pick the preferred mobile layout approach:
- **A)** 2-column compact grid (Airbnb-like browse density)
- **B)** 1-column list but much shorter cards
- **C)** Mix (2-col on some pages, 1-col on others)

