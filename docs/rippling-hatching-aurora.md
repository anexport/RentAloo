# Plan: Make Google Maps Feel More Native on Mobile & Desktop

## Problem
The Google Map in `/explore` doesn't feel native-like, especially on mobile:
- **Double-touch requirement**: `gestureHandling: "cooperative"` requires 2-finger gestures to pan/zoom
- This conflicts with full-screen mobile map UX where single-finger navigation is expected

## Solution Summary
Change gesture handling from `"cooperative"` to `"greedy"` and hide zoom buttons on mobile for a native app-like experience.

---

## Files to Modify

| File | Purpose |
|------|---------|
| `src/components/explore/MapView.tsx` | Main explore page map |
| `src/components/equipment/EquipmentLocationMap.tsx` | Equipment detail location map |

---

## Implementation Steps

### Step 1: Add mobile detection to MapView.tsx

Add `isMobile` prop to receive mobile state from parent:

```typescript
type MapViewProps = {
  listings: Listing[];
  selectedListingId?: string;
  onSelectListing?: (listing: Listing) => void;
  onOpenListing?: (listing: Listing) => void;
  className?: string;
  isMobile?: boolean;  // NEW
};
```

### Step 2: Update map initialization in MapView.tsx

Change the map options in `initializeMap` function (~line 251):

```typescript
const map = new google.maps.Map(mapRef.current, {
  center,
  zoom: ITALY_ZOOM,
  minZoom: 5,
  mapId: "explore-map",

  // Changed from "cooperative" to "greedy" for native-feel touch
  gestureHandling: "greedy",

  // UI Controls - hide zoom on mobile
  disableDefaultUI: false,
  zoomControl: !isMobile,              // Hidden on mobile
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,

  // Additional native-feel options
  clickableIcons: false,               // Prevent accidental POI clicks
  keyboardShortcuts: !isMobile,        // Disable keyboard shortcuts on mobile
});
```

### Step 3: Update ExplorePage.tsx to pass isMobile prop

In both mobile and desktop layouts, pass `isMobile` to MapView:

```typescript
<MapView
  listings={sortedListings}
  selectedListingId={selectedListingId}
  onSelectListing={handleSelectListing}
  onOpenListing={handleOpenListing}
  className="h-full w-full"
  isMobile={isMobile}  // Pass the existing isMobile from useMediaQuery
/>
```

### Step 4: Update EquipmentLocationMap.tsx for consistency

Apply same gesture handling changes (~line 88):

```typescript
const map = new google.maps.Map(mapRef.current, {
  center: coordinates,
  zoom: 15,
  mapId: "equipment-location-map",
  gestureHandling: "greedy",           // Changed from "cooperative"
  disableDefaultUI: false,
  zoomControl: true,                   // Keep for this smaller map
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: false,
});
```

---

## What This Enables

| Gesture | Before | After |
|---------|--------|-------|
| Single-finger pan | Scrolls page | Pans map |
| Double-tap | Nothing | Zoom in |
| Pinch | Required for zoom | Still works for zoom |
| Two-finger drag | Required for pan | Still works |

---

## Verification

1. **Mobile testing**:
   - Open `/explore` on mobile device or emulator
   - Single-finger drag should pan the map (not scroll page)
   - Double-tap should zoom in
   - Pinch-to-zoom should work
   - No +/- zoom buttons visible

2. **Desktop testing**:
   - Mouse wheel should zoom
   - Click-drag should pan
   - +/- zoom buttons visible
   - All functionality unchanged
