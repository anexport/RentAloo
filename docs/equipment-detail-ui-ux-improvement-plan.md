# Equipment Detail Dialog - UI/UX Improvement Study

**Date**: November 7, 2025  
**Component**: `EquipmentDetailDialog`  
**Location**: `src/components/equipment/detail/EquipmentDetailDialog.tsx`  
**Constraint**: Sidebar (BookingSidebar) must remain functionally intact

---

## Executive Summary

This document analyzes the current UI/UX of the Equipment Detail Dialog and proposes improvements for better user experience, clearer information hierarchy, and more intuitive interaction patterns.

### Current Pain Points
1. **5-tab navigation feels cluttered** on mobile (icons only, hidden labels)
2. **"Book" tab is hidden** - users might not discover the booking form
3. **Information hierarchy unclear** - all tabs appear equal in importance
4. **Redundant booking paths** - Both sidebar and "Book" tab can initiate booking
5. **Mobile experience cramped** - Bottom sheet at 90vh feels overwhelming
6. **Tab context switching** - Users lose view of key info when changing tabs

---

## Current UI Analysis

### Layout Structure (Desktop)
```
┌─────────────────────────────────────────────────────────┐
│ Header (Title, Location, Rating, Condition)            │
├─────────────────────────────────────────────────────────┤
│ Photo Gallery (60/40 Grid)                             │
├─────────────────────────────────────────────────────────┤
│                                              │          │
│  ┌─────────────────────────────────┐        │ Sidebar  │
│  │ Tabs (5 equal tabs)             │        │ (Sticky) │
│  │ ┌─┬─┬─┬─┬─┐                     │        │          │
│  │ │O│A│L│R│B│ ← All equal weight │        │ • Price  │
│  │ └─┴─┴─┴─┴─┘                     │        │ • Rating │
│  │                                  │        │ • Dates  │
│  │ Tab Content                      │        │ • Total  │
│  │ (Overview/Availability/etc)     │        │ • Button │
│  │                                  │        │          │
│  └─────────────────────────────────┘        │          │
│                                              │          │
└─────────────────────────────────────────────┴──────────┘
```

### Current Tab Structure
| Tab | Icon | Purpose | Usage Frequency |
|-----|------|---------|----------------|
| Overview | Info | Description, condition, category | High (default) |
| Availability | Calendar | View calendar (view-only) | Medium |
| Location | MapPin | Show map | Low-Medium |
| Reviews | MessageSquare | Owner reviews | Medium |
| Book | CreditCard | Booking form/payment | **Critical** but hidden |

### Problems Identified

#### 1. Tab Navigation Issues
- **All tabs equal weight**: "Book" tab (most important for conversion) has same visual weight as "Location"
- **Mobile cramped**: 5 tabs with icons only - unclear purpose without labels
- **Hidden CTA**: Primary booking action buried in 5th tab
- **Poor discoverability**: New users don't know "Book" tab exists

#### 2. Sidebar Redundancy
- **Duplicate booking flow**: Sidebar has booking button + "Book" tab has form
- **Confusion**: Which should users use? Both? One before the other?
- **State management complexity**: Two places to initiate same action

#### 3. Information Architecture
- **Flat hierarchy**: All content given equal importance
- **Poor progressive disclosure**: Users can't scan key info quickly
- **Context loss**: Switching tabs hides important reference info

#### 4. Mobile Experience
- **90vh bottom sheet**: Takes almost full screen, feels modal-heavy
- **Sidebar placement**: On mobile, sidebar appears BEFORE content (order-first)
- **Scroll fatigue**: Long vertical scroll through tabs

---

## Proposed UI/UX Improvements

### Option A: Simplified 3-Tab Layout (Recommended)

**Philosophy**: Remove "Book" tab, consolidate booking in sidebar, reduce tab clutter

#### New Tab Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header (Enhanced with Quick Actions)                    │
├─────────────────────────────────────────────────────────┤
│ Photo Gallery                                           │
├─────────────────────────────────────────────────────────┤
│                                              │          │
│  ┌─────────────────────────────────┐        │ Sidebar  │
│  │ Tabs (3 tabs - cleaner)         │        │          │
│  │ ┌─────┬─────┬─────┐             │        │ ENHANCED │
│  │ │ Overview│ Details│ Reviews│   │        │          │
│  │ └─────┴─────┴─────┘             │        │ • Price  │
│  │                                  │        │ • Rating │
│  │ - Overview: Description          │        │ • Dates  │
│  │ - Details: Availability + Map    │        │ • Total  │
│  │ - Reviews: Owner reviews         │        │ • 🔥 CTA │
│  │                                  │        │          │
│  └─────────────────────────────────┘        │ [EXPAND] │
│                                              │          │
└─────────────────────────────────────────────┴──────────┘
```

#### Changes:
1. **Merge "Availability" + "Location" → "Details" tab**
   - Availability calendar at top
   - Location map below
   - Related information grouped together

2. **Remove "Book" tab entirely**
   - Booking flow lives only in sidebar
   - Clearer single path to conversion
   - Reduces confusion

3. **Enhanced sidebar on mobile**
   - Expandable/collapsible for space
   - Floating CTA button that scrolls with user
   - Quick access to booking without tab switching

4. **Rename tabs for clarity**
   - "Overview" stays (description, condition, category)
   - "Details" (availability + location = logistics)
   - "Reviews" stays (social proof)

#### Benefits:
✅ **3 tabs instead of 5** - cleaner, less overwhelming  
✅ **Single booking path** - no confusion  
✅ **Better grouping** - related info together  
✅ **Mobile-friendly** - fewer taps, clearer purpose  
✅ **Higher conversion** - prominent CTA in sidebar  

---

### Option B: Accordion Layout (Information Dense)

**Philosophy**: No tabs, use collapsible sections for better scanning

```
┌─────────────────────────────────────────────────────────┐
│ Header + Quick Actions                                  │
├─────────────────────────────────────────────────────────┤
│ Photo Gallery                                           │
├─────────────────────────────────────────────────────────┤
│                                              │          │
│  ▼ Overview (expanded by default)           │ Sidebar  │
│    Description, condition, category         │          │
│                                              │ • Price  │
│  ▶ Availability & Location                  │ • Dates  │
│                                              │ • Total  │
│  ▶ Reviews (4.5 ⭐️ · 12 reviews)           │ • CTA    │
│                                              │          │
│                                              │          │
└─────────────────────────────────────────────┴──────────┘
```

#### Changes:
1. **Replace tabs with accordions**
   - All sections visible at once (collapsed)
   - Click to expand individual sections
   - Overview expanded by default

2. **Better scanning**
   - Users see all available info without clicking
   - Preview text for each section
   - No "hidden" content in tabs

3. **Progressive disclosure**
   - Expand only what you need
   - Multiple sections can be open simultaneously
   - Less context switching

#### Benefits:
✅ **No hidden information** - all sections visible  
✅ **Better for screen readers** - standard accordion pattern  
✅ **Less clicking** - see overview without interaction  
✅ **Mobile scroll-friendly** - natural vertical flow  

#### Drawbacks:
❌ Can feel longer to scroll  
❌ Less visual separation than tabs  
❌ Users might miss collapsed sections  

---

### Option C: Sticky Summary Bar (Keep Current Tabs)

**Philosophy**: Keep 5 tabs but add persistent context bar

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                   │
├─────────────────────────────────────────────────────────┤
│ Photo Gallery                                           │
├─────────────────────────────────────────────────────────┤
│ [STICKY] $45/day · 4.5⭐️ · Available Dec 1-15 [BOOK] │ ← Sticky!
├─────────────────────────────────────────────────────────┤
│                                              │          │
│  ┌─────────────────────────────────┐        │ Sidebar  │
│  │ Tabs (keep 5)                    │        │          │
│  │ ┌─┬─┬─┬─┬─┐                     │        │          │
│  │ │O│A│L│R│B│                     │        │          │
│  │ └─┴─┴─┴─┴─┘                     │        │          │
│  │                                  │        │          │
│  │ Tab Content                      │        │          │
│  │                                  │        │          │
│  └─────────────────────────────────┘        │          │
│                                              │          │
└─────────────────────────────────────────────┴──────────┘
```

#### Changes:
1. **Add sticky summary bar** between gallery and tabs
   - Shows key info: price, rating, selected dates
   - Always visible when scrolling
   - Quick "Book Now" CTA

2. **Keep existing 5-tab structure**
   - Minimal disruption to current design
   - Users familiar with pattern

3. **Sticky bar scrolls away** after initial view
   - Returns when user scrolls up
   - Provides context without blocking content

#### Benefits:
✅ **Minimal changes** to existing structure  
✅ **Always-visible CTA** via sticky bar  
✅ **Quick reference** for key info while browsing tabs  
✅ **Easy to implement** - just add new component  

#### Drawbacks:
❌ Still have 5-tab clutter  
❌ Doesn't solve mobile icon-only issue  
❌ Sticky bar uses vertical space  

---

### Option D: Card-Based Layout (No Tabs)

**Philosophy**: Cards for each section, no tabs/accordions

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                   │
├─────────────────────────────────────────────────────────┤
│ Photo Gallery                                           │
├─────────────────────────────────────────────────────────┤
│                                              │          │
│  ┌─────────────────────────────────┐        │ Sidebar  │
│  │ About this Equipment │            │        │          │
│  │ Description text...             │        │ [Sticky] │
│  └─────────────────────────────────┘        │          │
│                                              │          │
│  ┌─────────────────────────────────┐        │          │
│  │ Availability Calendar │          │        │          │
│  │ [Calendar widget]                │        │          │
│  └─────────────────────────────────┘        │          │
│                                              │          │
│  ┌─────────────────────────────────┐        │          │
│  │ Location │                       │        │          │
│  │ [Map widget]                     │        │          │
│  └─────────────────────────────────┘        │          │
│                                              │          │
│  ┌─────────────────────────────────┐        │          │
│  │ Reviews (4.5 ⭐️ · 12)          │        │          │
│  │ [Review list]                    │        │          │
│  └─────────────────────────────────┘        │          │
│                                              │          │
└─────────────────────────────────────────────┴──────────┘
```

#### Changes:
1. **Remove tabs entirely**
   - Each section is a standalone card
   - Vertical scroll through all content
   - Natural information flow

2. **Card-based sections**
   - Clear visual separation
   - Can have different card sizes based on content importance
   - Easy to scan and skip

3. **No hidden content**
   - Everything visible (lazy-loaded as needed)
   - No cognitive load of "where is X?"
   - Airbnb-style long-form layout

#### Benefits:
✅ **Simplest mental model** - just scroll  
✅ **Mobile-native** - natural touch scrolling  
✅ **No hidden content** - transparent information  
✅ **SEO-friendly** - all content rendered  
✅ **Accessible** - screen readers navigate easily  

#### Drawbacks:
❌ Longer scrolling required  
❌ Calendar/map might load when not needed  
❌ Less compact than tabs  
❌ Users can't quickly jump to specific section  

---

## Detailed Recommendation: Option A (Simplified 3-Tab)

### Why Option A is Best

1. **Balances Simplicity & Functionality**
   - Reduces cognitive load (3 vs 5 tabs)
   - Maintains quick navigation
   - Groups related content logically

2. **Solves Core Problems**
   - ✅ Removes booking confusion (single path)
   - ✅ Better mobile experience (clearer icons/labels)
   - ✅ Eliminates tab clutter
   - ✅ Maintains sidebar as focal point for conversion

3. **Minimal Risk**
   - Sidebar unchanged (your requirement)
   - Tab pattern familiar to users
   - Progressive enhancement, not total redesign

4. **Data-Driven**
   - Availability + Location = related "Details"
   - Overview = most important (default)
   - Reviews = social proof (separate)
   - Booking = action (sidebar only)

---

## Implementation Plan: Option A

### Phase 1: Tab Consolidation

#### Step 1.1: Create "Details" Tab Component
**File**: `src/components/equipment/detail/DetailsTab.tsx`

```tsx
interface DetailsTabProps {
  equipmentId: string;
  dailyRate: number;
  location: string;
  latitude: number | null;
  longitude: number | null;
}

export const DetailsTab = ({
  equipmentId,
  dailyRate,
  location,
  latitude,
  longitude
}: DetailsTabProps) => {
  return (
    <div className="space-y-8">
      {/* Availability Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Availability Calendar
        </h3>
        <AvailabilityCalendar
          equipmentId={equipmentId}
          defaultDailyRate={dailyRate}
          viewOnly={true}
        />
      </section>

      <Separator className="my-6" />

      {/* Location Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location
        </h3>
        <EquipmentLocationMap
          location={location}
          latitude={latitude}
          longitude={longitude}
        />
      </section>
    </div>
  );
};
```

**Benefits of grouping**:
- User can check availability AND see location in one view
- Related to booking decision
- Natural progression: "When can I rent?" → "Where do I pick it up?"

---

#### Step 1.2: Update TabsList to 3 Tabs

**Before** (5 tabs):
```tsx
<TabsList className="grid w-full grid-cols-5">
  <TabsTrigger value="overview">
    <Info className="h-4 w-4" />
    <span className="hidden sm:inline">Overview</span>
  </TabsTrigger>
  <TabsTrigger value="availability">
    <CalendarIcon className="h-4 w-4" />
    <span className="hidden sm:inline">Availability</span>
  </TabsTrigger>
  <TabsTrigger value="location">
    <MapPin className="h-4 w-4" />
    <span className="hidden sm:inline">Location</span>
  </TabsTrigger>
  <TabsTrigger value="reviews">
    <MessageSquare className="h-4 w-4" />
    <span className="hidden sm:inline">Reviews</span>
  </TabsTrigger>
  <TabsTrigger value="book">
    <CreditCard className="h-4 w-4" />
    <span className="hidden sm:inline">Book</span>
  </TabsTrigger>
</TabsList>
```

**After** (3 tabs with better mobile labels):
```tsx
<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger 
    value="overview"
    className="flex items-center gap-2"
  >
    <Info className="h-4 w-4" />
    <span>Overview</span> {/* Always visible now! */}
  </TabsTrigger>
  <TabsTrigger 
    value="details"
    className="flex items-center gap-2"
  >
    <Package className="h-4 w-4" /> {/* New combined icon */}
    <span>Details</span>
  </TabsTrigger>
  <TabsTrigger 
    value="reviews"
    className="flex items-center gap-2"
  >
    <MessageSquare className="h-4 w-4" />
    <span>Reviews</span>
  </TabsTrigger>
</TabsList>
```

**Mobile improvement**:
- Labels now visible on mobile (more space with 3 tabs)
- Clearer purpose at a glance
- Better touch targets (wider tabs)

---

#### Step 1.3: Update Tab Content

```tsx
<TabsContent value="overview" className="space-y-6 mt-6">
  <EquipmentOverviewTab
    description={data.description}
    condition={data.condition}
    category={data.category}
  />
</TabsContent>

<TabsContent value="details" className="mt-6">
  <DetailsTab
    equipmentId={data.id}
    dailyRate={data.daily_rate}
    location={data.location}
    latitude={data.latitude}
    longitude={data.longitude}
  />
</TabsContent>

<TabsContent value="reviews" className="mt-6">
  <ReviewList
    revieweeId={data.owner?.id}
    showSummary={true}
    showEquipment={false}
  />
</TabsContent>

{/* Remove "book" tab entirely */}
```

---

### Phase 2: Sidebar Enhancements

#### Enhancement 1: Make Sidebar More Prominent (Desktop)

**Current**: Sidebar is just "there"  
**Improved**: Add visual cues that it's THE booking action

```tsx
<Card className="p-6 space-y-6 border-2 border-primary/20 shadow-lg">
  {/* Add subtle highlight */}
  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
    <Badge variant="default" className="px-4 py-1">
      Book This Equipment
    </Badge>
  </div>
  
  {/* Rest of sidebar content */}
</Card>
```

---

#### Enhancement 2: Floating CTA on Mobile

**Current**: Sidebar at top on mobile (confusing order)  
**Improved**: Fixed CTA button that follows scroll

**New Component**: `src/components/booking/FloatingBookingCTA.tsx`

```tsx
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useState } from "react";

interface FloatingBookingCTAProps {
  dailyRate: number;
  onOpenSidebar: () => void;
  isMobile: boolean;
}

export const FloatingBookingCTA = ({
  dailyRate,
  onOpenSidebar,
  isMobile
}: FloatingBookingCTAProps) => {
  const [isVisible, setIsVisible] = useState(false);

  // Show after user scrolls past header
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 400;
      setIsVisible(scrolled && isMobile);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 px-4 animate-in slide-in-from-bottom">
      <Button
        onClick={onOpenSidebar}
        size="lg"
        className="w-full shadow-2xl"
      >
        <Calendar className="mr-2 h-5 w-5" />
        Book · ${dailyRate}/day
      </Button>
    </div>
  );
};
```

**Usage**: Shows after user scrolls, provides quick access to booking without navigating back

---

#### Enhancement 3: Sidebar Drawer on Mobile

Instead of showing sidebar first, make it a drawer that slides up:

```tsx
// Mobile: Sidebar becomes a drawer
{isMobile && (
  <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
    <SheetContent side="bottom" className="h-[85vh]">
      <SheetHeader>
        <SheetTitle>Book This Equipment</SheetTitle>
      </SheetHeader>
      <div className="mt-6">
        <BookingSidebar {...sidebarProps} />
      </div>
    </SheetContent>
  </Sheet>
)}

{/* Floating CTA triggers the drawer */}
<FloatingBookingCTA
  dailyRate={data.daily_rate}
  onOpenSidebar={() => setSidebarOpen(true)}
  isMobile={isMobile}
/>
```

---

### Phase 3: Visual Polish

#### Improvement 1: Better Tab Icons

Replace generic icons with more descriptive ones:

| Old Tab | Old Icon | New Tab | New Icon | Rationale |
|---------|----------|---------|----------|-----------|
| Overview | Info | Overview | Info | ✅ Good as-is |
| Availability | Calendar | Details | Package | Combined section |
| Location | MapPin | - | - | Merged into Details |
| Reviews | MessageSquare | Reviews | Star | More intuitive |
| Book | CreditCard | - | - | Removed |

---

#### Improvement 2: Add Tab Badges

Show dynamic info in tab labels:

```tsx
<TabsTrigger value="reviews" className="flex items-center gap-2">
  <Star className="h-4 w-4" />
  <span>Reviews</span>
  {reviewCount > 0 && (
    <Badge variant="secondary" className="ml-1">
      {reviewCount}
    </Badge>
  )}
</TabsTrigger>
```

**Shows**: "Reviews (12)" → User knows there's content before clicking

---

#### Improvement 3: Empty State Handling

If a tab has no content, show helpful message:

```tsx
<TabsContent value="reviews" className="mt-6">
  {reviewCount === 0 ? (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center py-12">
          <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No Reviews Yet
          </h3>
          <p className="text-muted-foreground">
            Be the first to rent and review this equipment!
          </p>
        </div>
      </CardContent>
    </Card>
  ) : (
    <ReviewList {...reviewProps} />
  )}
</TabsContent>
```

---

## Mobile-Specific Improvements

### Issue: Current mobile UX is cramped

#### Solution 1: Better Bottom Sheet Height

**Current**: `h-[90vh]` - feels too large  
**Improved**: `h-[85vh]` with rounded top corners

```tsx
<SheetContent
  side="bottom"
  className="h-[85vh] max-h-[85vh] rounded-t-2xl" // Add rounded corners
  style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }} // Lift shadow
>
```

---

#### Solution 2: Swipe Hints

Add visual cue that sheet can be dismissed:

```tsx
<SheetContent>
  {/* Swipe indicator */}
  <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
  
  <SheetHeader>
    <SheetTitle>{title}</SheetTitle>
  </SheetHeader>
  {/* Rest of content */}
</SheetContent>
```

---

#### Solution 3: Sticky Header in Sheet

Keep title visible when scrolling:

```tsx
<SheetContent className="flex flex-col">
  {/* Sticky header */}
  <div className="sticky top-0 bg-background z-10 pb-4 border-b">
    <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>{description}</SheetDescription>
    </SheetHeader>
  </div>
  
  {/* Scrollable content */}
  <div className="flex-1 overflow-y-auto px-6 py-4">
    {renderContent()}
  </div>
</SheetContent>
```

---

## Visual Mockups

### Before: Current 5-Tab Layout
```
┌─────────────────────────────────────────┐
│ Header                                   │
├─────────────────────────────────────────┤
│ Photos                                   │
├─────────────────────────────────────────┤
│ ┌─┬─┬─┬─┬─┐                     Sidebar │
│ │ │ │ │ │ │                             │
│ └─┴─┴─┴─┴─┘ ← 5 tabs (cluttered)       │
│                                          │
│ Tab Content                              │
└─────────────────────────────────────────┘

Issues:
❌ 5 tabs overwhelming
❌ "Book" hidden in last tab
❌ Mobile shows icons only
```

### After: Proposed 3-Tab Layout
```
┌─────────────────────────────────────────┐
│ Header                                   │
├─────────────────────────────────────────┤
│ Photos                                   │
├─────────────────────────────────────────┤
│ ┌─────┬─────┬─────┐           ┌──────┐ │
│ │  📄 │ 📦  │ ⭐   │           │🎯Book│ │
│ │ Over│ Det │ Rev  │           │      │ │
│ └─────┴─────┴─────┘           │ Side │ │
│                                │ bar  │ │
│ Tab Content (cleaner)          │      │ │
│                                │ [CTA]│ │
└────────────────────────────────┴──────┘

Benefits:
✅ 3 clear tabs
✅ Labels always visible
✅ Booking prominent in sidebar
✅ Better mobile spacing
```

---

## A/B Testing Plan

### Metrics to Track

#### Primary Metrics (Conversion)
- **Booking initiation rate**: % users who click "Book" button
- **Booking completion rate**: % who complete payment
- **Time to booking**: Avg time from open dialog → book click

#### Secondary Metrics (Engagement)
- **Tab click rate**: Which tabs are clicked most?
- **Scroll depth**: How far users scroll in each tab
- **Bounce rate**: % who close dialog without interaction

#### UX Metrics
- **Task completion**: Can users find availability? Reviews?
- **Confusion events**: Back-button usage, rapid tab switching
- **Mobile vs Desktop**: Performance difference by device

---

### Test Variants

**Control (A)**: Current 5-tab layout  
**Variant B**: 3-tab layout (Option A)  
**Variant C**: Sticky summary bar (Option C)

**Duration**: 2 weeks  
**Split**: 33% / 33% / 33%  
**Sample size**: Minimum 1000 dialog views per variant

---

### Success Criteria

**Primary Win Condition**:  
Variant B increases booking initiation rate by **≥15%** vs Control

**Secondary Win Conditions**:
- Reduces average time-to-booking by **≥20%**
- Improves mobile engagement (scroll/clicks) by **≥10%**
- Maintains or improves booking completion rate

---

## Accessibility Improvements

All options should include these enhancements:

### 1. Better Keyboard Navigation
```tsx
<TabsList className="grid w-full grid-cols-3" role="tablist">
  <TabsTrigger
    value="overview"
    role="tab"
    aria-selected={activeTab === "overview"}
    aria-controls="overview-panel"
    id="overview-tab"
  >
    <Info className="h-4 w-4" aria-hidden="true" />
    <span>Overview</span>
  </TabsTrigger>
</TabsList>
```

### 2. Screen Reader Announcements
```tsx
<div
  role="tabpanel"
  aria-labelledby="overview-tab"
  id="overview-panel"
  tabIndex={0}
>
  {/* Content */}
</div>
```

### 3. Focus Management
```tsx
useEffect(() => {
  if (open) {
    // Focus first interactive element when dialog opens
    const firstInput = dialogRef.current?.querySelector('input, button');
    firstInput?.focus();
  }
}, [open]);
```

### 4. Skip Links
```tsx
<a href="#booking-section" className="sr-only focus:not-sr-only">
  Skip to booking
</a>
```

---

## Performance Considerations

### Lazy Load Tabs
Don't render tab content until selected:

```tsx
<TabsContent value="details" className="mt-6">
  {activeTab === 'details' ? (
    <DetailsTab {...props} />
  ) : (
    <div className="h-96" /> // Placeholder
  )}
</TabsContent>
```

### Preload Critical Tabs
Preload "Overview" (default) and "Details" (likely next):

```tsx
useEffect(() => {
  if (open) {
    // Prefetch Details tab data
    queryClient.prefetchQuery(['availability', data.id]);
  }
}, [open, data.id]);
```

---

## Implementation Timeline

### Week 1: Foundation
- [ ] Create DetailsTab component
- [ ] Update TabsList to 3 tabs
- [ ] Remove "Book" tab references
- [ ] Test desktop layout

### Week 2: Mobile Enhancements
- [ ] Create FloatingBookingCTA component
- [ ] Implement sidebar drawer on mobile
- [ ] Add swipe indicators
- [ ] Test mobile responsiveness

### Week 3: Polish & Testing
- [ ] Add tab badges
- [ ] Implement empty states
- [ ] Accessibility audit
- [ ] Cross-browser testing

### Week 4: A/B Testing
- [ ] Deploy variant B alongside control
- [ ] Set up analytics tracking
- [ ] Monitor metrics
- [ ] Gather user feedback

---

## Risks & Mitigation

### Risk 1: Users Expect 5 Tabs
**Mitigation**: A/B test shows actual preference data  
**Fallback**: Keep current design if metrics decline

### Risk 2: "Details" Tab Too Long
**Mitigation**: Add internal anchor links to jump  
**Example**: "Jump to: [Availability] [Location]"

### Risk 3: Mobile Drawer Unfamiliar
**Mitigation**: Add tooltip on first use  
**Example**: "💡 Tip: Tap the button below to book"

### Risk 4: Sidebar Changes Inadvertently
**Mitigation**: Lock sidebar component with integration tests  
**Example**: Test that sidebar props/behavior unchanged

---

## Future Enhancements (Post-Launch)

### 1. Smart Tab Ordering
Reorder tabs based on user behavior:
- If user always checks reviews first, make it default tab
- Use ML to predict optimal tab order per user

### 2. Quick Actions
Add action buttons in header:
- "❤️ Save" (wishlist)
- "📤 Share" (social share)
- "❓ Ask Owner" (direct message)

### 3. Contextual Hints
Show tips based on behavior:
- User views calendar → "Tip: Check reviews before booking"
- User on Reviews tab → "This owner has 100% response rate"

### 4. Comparison Mode
Allow comparing multiple equipment side-by-side:
- "Compare with similar items"
- Side-by-side view in split dialog

---

## Conclusion & Recommendation

### Primary Recommendation: **Option A - Simplified 3-Tab Layout**

**Why?**
1. ✅ **Solves core UX problems** (cluttered tabs, hidden booking)
2. ✅ **Minimal risk** (sidebar unchanged, familiar pattern)
3. ✅ **Clear conversion path** (sidebar is THE booking method)
4. ✅ **Better mobile experience** (space for labels, clearer purpose)
5. ✅ **Measurable impact** (can A/B test against control)

**Next Steps:**
1. Get stakeholder approval for 3-tab approach
2. Create DetailsTab component (Week 1)
3. Deploy behind feature flag for A/B test
4. Measure for 2 weeks
5. Roll out winner to 100% of users

**ROI Projection:**
- **Implementation**: 3-4 weeks (1 developer)
- **Expected lift**: 15-25% increase in booking initiation
- **Risk level**: Low (reversible, A/B tested)

---

**Document Author**: GitHub Copilot  
**Last Updated**: November 7, 2025  
**Status**: Proposal - Awaiting Review
