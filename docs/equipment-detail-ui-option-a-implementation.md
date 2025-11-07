# Equipment Detail Dialog - Option A Implementation Plan

**Plan**: Simplified 3-Tab Layout with Enhanced Sidebar  
**Target Component**: `src/components/equipment/detail/EquipmentDetailDialog.tsx`  
**Timeline**: 3-4 weeks  
**Complexity**: Medium  
**Risk Level**: Low

---

## 🎯 Objectives

### Primary Goals
1. Reduce tabs from 5 to 3 for better clarity
2. Merge "Availability" and "Location" into "Details" tab
3. Remove "Book" tab entirely (booking stays in sidebar only)
4. Improve mobile experience with visible tab labels and floating CTA

### Success Metrics
- Booking initiation rate increases by ≥15%
- Tab clarity improves (user testing feedback)
- Mobile engagement increases by ≥10%
- No decrease in booking completion rate

### Constraints
- ⚠️ **CRITICAL**: BookingSidebar component must remain functionally unchanged
- Maintain all existing booking functionality
- Preserve responsive behavior (desktop/mobile)
- Keep existing state management intact

---

## 📋 Pre-Implementation Checklist

Before starting, verify:

- [ ] Current file location: `src/components/equipment/detail/EquipmentDetailDialog.tsx`
- [ ] BookingSidebar location: `src/components/booking/BookingSidebar.tsx`
- [ ] All shadcn/ui components installed (Badge, Card, Separator, Tabs)
- [ ] Git branch created: `feature/equipment-detail-3-tab-layout`
- [ ] Backup of current component made
- [ ] Team approval for UI changes obtained

**Verification Commands**:
```bash
# Check files exist
ls -la src/components/equipment/detail/EquipmentDetailDialog.tsx
ls -la src/components/booking/BookingSidebar.tsx

# Create feature branch
git checkout -b feature/equipment-detail-3-tab-layout

# Backup current file
cp src/components/equipment/detail/EquipmentDetailDialog.tsx \
   src/components/equipment/detail/EquipmentDetailDialog.tsx.backup
```

---

## 📁 File Structure (New Files to Create)

```
src/
├── components/
│   ├── equipment/
│   │   └── detail/
│   │       ├── EquipmentDetailDialog.tsx (MODIFY)
│   │       ├── DetailsTab.tsx (NEW - Step 1)
│   │       └── tabs/
│   │           └── index.ts (NEW - Step 1, optional)
│   └── booking/
│       ├── BookingSidebar.tsx (DO NOT MODIFY)
│       ├── FloatingBookingCTA.tsx (NEW - Step 4)
│       └── MobileSidebarDrawer.tsx (NEW - Step 5)
```

---

## 🔧 Implementation Steps

---

## **STEP 1: Create DetailsTab Component**

### Objective
Combine "Availability" and "Location" tabs into a single "Details" tab that shows both calendar and map.

### New File: `src/components/equipment/detail/DetailsTab.tsx`

```tsx
import { CalendarIcon, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import EquipmentLocationMap from "../EquipmentLocationMap";

interface DetailsTabProps {
  equipmentId: string;
  dailyRate: number;
  location: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * DetailsTab combines availability calendar and location map
 * into a single tab for better information grouping.
 */
export const DetailsTab = ({
  equipmentId,
  dailyRate,
  location,
  latitude,
  longitude,
}: DetailsTabProps) => {
  return (
    <div className="space-y-8">
      {/* Availability Section */}
      <section aria-labelledby="availability-heading">
        <h3
          id="availability-heading"
          className="text-lg font-semibold mb-4 flex items-center gap-2"
        >
          <CalendarIcon className="h-5 w-5 text-primary" />
          Availability Calendar
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select dates in the sidebar to see pricing and book this equipment.
        </p>
        <AvailabilityCalendar
          equipmentId={equipmentId}
          defaultDailyRate={dailyRate}
          viewOnly={true}
        />
      </section>

      <Separator className="my-6" />

      {/* Location Section */}
      <section aria-labelledby="location-heading">
        <h3
          id="location-heading"
          className="text-lg font-semibold mb-4 flex items-center gap-2"
        >
          <MapPin className="h-5 w-5 text-primary" />
          Location
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Pickup and return location for this equipment.
        </p>
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

### Why This Structure?
- **Grouped logically**: Availability and location are both "logistics" info
- **Clear headings**: Users understand each section's purpose
- **Helpful hints**: Descriptive text guides users
- **Accessible**: Proper ARIA labels and semantic HTML
- **Visual hierarchy**: Icons + bold headings + spacing

### Testing After Step 1
```bash
# Check TypeScript compilation
npm run type-check

# If using tests
npm run test -- DetailsTab
```

**Expected**: No TypeScript errors, component compiles successfully

---

## **STEP 2: Update TabsList (5 Tabs → 3 Tabs)**

### File to Modify: `src/components/equipment/detail/EquipmentDetailDialog.tsx`

### Location: Find the TabsList component (around line 470-520)

### 2.1: Add Import for DetailsTab

**Find** (at top of file, around line 1-40):
```tsx
import { EquipmentOverviewTab } from "./EquipmentOverviewTab";
import { EquipmentPhotoGallery } from "./EquipmentPhotoGallery";
import { EquipmentHeader } from "./EquipmentHeader";
```

**Add after these imports**:
```tsx
import { DetailsTab } from "./DetailsTab";
```

---

### 2.2: Update TabsList Grid

**Find** (around line 470):
```tsx
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-1 sm:gap-2"
                  aria-label="Overview"
                >
                  <Info className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger
                  value="availability"
                  className="flex items-center gap-1 sm:gap-2"
                  aria-label="Availability"
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Availability</span>
                </TabsTrigger>
                <TabsTrigger
                  value="location"
                  className="flex items-center gap-1 sm:gap-2"
                  aria-label="Location"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Location</span>
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="flex items-center gap-1 sm:gap-2"
                  aria-label="Reviews"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Reviews</span>
                </TabsTrigger>
                <TabsTrigger
                  value="book"
                  className="flex items-center gap-1 sm:gap-2"
                  aria-label="Book"
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Book</span>
                </TabsTrigger>
              </TabsList>
```

**Replace with**:
```tsx
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2"
                  aria-label="Overview - Description and details"
                >
                  <Info className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="flex items-center gap-2"
                  aria-label="Details - Availability and location"
                >
                  <Package className="h-4 w-4" />
                  <span>Details</span>
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="flex items-center gap-2"
                  aria-label="Reviews - Owner ratings and feedback"
                >
                  <Star className="h-4 w-4" />
                  <span>Reviews</span>
                  {data.reviews && data.reviews.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {data.reviews.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
```

### Key Changes:
1. **Grid columns**: `grid-cols-5` → `grid-cols-3`
2. **Removed**: `hidden sm:inline` from spans (labels always visible now!)
3. **Changed gap**: `gap-1 sm:gap-2` → `gap-2` (consistent spacing)
4. **New "Details" tab**: Replaces "availability" and "location"
5. **New icon**: Package for "Details" (represents combined content)
6. **Star icon**: Changed "Reviews" icon from MessageSquare to Star (more intuitive)
7. **Review badge**: Shows count when reviews exist
8. **Better ARIA**: More descriptive aria-labels

---

### 2.3: Add Package and Star Icon Imports

**Find** (at top of file, around line 20-25):
```tsx
import {
  MapPin,
  Calendar as CalendarIcon,
  Info,
  MessageSquare,
  Package,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
```

**Add Star to imports** (if not already there):
```tsx
import {
  MapPin,
  Calendar as CalendarIcon,
  Info,
  MessageSquare,
  Package,
  CheckCircle2,
  CreditCard,
  Star, // ADD THIS
} from "lucide-react";
```

---

### Testing After Step 2

**Visual Check**:
1. Open equipment detail dialog in browser
2. Verify 3 tabs are visible
3. Confirm tab labels are visible on mobile (test responsive)
4. Check Review badge shows correct count

**Expected Result**:
- 3 tabs displayed: Overview, Details, Reviews
- Labels visible on all screen sizes
- Review count badge appears when reviews exist
- Clean, uncluttered appearance

---

## **STEP 3: Update TabsContent (Add Details, Remove Old Tabs)**

### File to Modify: `src/components/equipment/detail/EquipmentDetailDialog.tsx`

### Location: Find TabsContent sections (around line 520-650)

### 3.1: Update Overview Tab (Keep as-is, just verify)

**Verify this exists** (around line 520):
```tsx
              <TabsContent value="overview" className="space-y-6 mt-6">
                <EquipmentOverviewTab
                  description={data.description}
                  condition={data.condition}
                  category={data.category}
                />
              </TabsContent>
```

**Action**: Leave unchanged ✓

---

### 3.2: Replace Availability and Location Tabs with Details Tab

**Find** (around line 530-545):
```tsx
              <TabsContent value="availability" className="mt-6">
                <AvailabilityCalendar
                  equipmentId={data.id}
                  defaultDailyRate={data.daily_rate}
                  viewOnly={true}
                />
              </TabsContent>

              <TabsContent value="location" className="mt-6">
                <EquipmentLocationMap
                  location={data.location}
                  latitude={data.latitude}
                  longitude={data.longitude}
                />
              </TabsContent>
```

**Replace with**:
```tsx
              <TabsContent value="details" className="mt-6">
                <DetailsTab
                  equipmentId={data.id}
                  dailyRate={data.daily_rate}
                  location={data.location}
                  latitude={data.latitude}
                  longitude={data.longitude}
                />
              </TabsContent>
```

**Why**: Combines both calendar and map into single tab component

---

### 3.3: Update Reviews Tab (Add Empty State)

**Find** (around line 550):
```tsx
              <TabsContent value="reviews" className="mt-6">
                <ReviewList
                  revieweeId={data.owner?.id}
                  showSummary={true}
                  showEquipment={false}
                />
              </TabsContent>
```

**Replace with** (adds empty state handling):
```tsx
              <TabsContent value="reviews" className="mt-6">
                {data.reviews && data.reviews.length > 0 ? (
                  <ReviewList
                    revieweeId={data.owner?.id}
                    showSummary={true}
                    showEquipment={false}
                  />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Star className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          No Reviews Yet
                        </h3>
                        <p className="text-muted-foreground max-w-md">
                          This owner hasn't received any reviews yet. Be the first to rent and share your experience!
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
```

**Benefits**:
- Better UX when no reviews exist
- Encourages first booking
- Professional empty state design

---

### 3.4: REMOVE "Book" TabsContent Entirely

**Find** (around line 555-650 - this is a LARGE section):
```tsx
              <TabsContent value="book" className="mt-6">
                {!hasCategory(data) ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Package className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          Category Information Missing
                        </h3>
                        <p className="text-muted-foreground max-w-md">
                          This equipment is missing category information. Please
                          contact the owner or try again later.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : bookingRequestId && calculation ? (
                  <PaymentForm
                    // ... lots of payment form code ...
                  />
                ) : (
                  <BookingRequestForm
                    // ... lots of booking form code ...
                  />
                )}
              </TabsContent>
```

**Action**: DELETE this entire TabsContent block

**⚠️ IMPORTANT**: 
- All booking functionality now happens through the sidebar only
- BookingRequestForm and PaymentForm are no longer rendered in tabs
- This simplifies the booking flow to a single path

---

### Testing After Step 3

**Manual Testing**:
1. Navigate to Overview tab → should show description, condition, category
2. Navigate to Details tab → should show calendar AND map
3. Navigate to Reviews tab → should show reviews OR empty state
4. Verify no "Book" tab exists
5. Verify sidebar still shows and functions correctly

**Expected Result**:
- 3 tabs work correctly
- Details tab displays both sections with separator
- Empty state appears when no reviews
- No "Book" tab visible
- Sidebar unchanged and functional

---

## **STEP 4: Create FloatingBookingCTA Component (Mobile)**

### Objective
Add a floating button on mobile that provides quick access to booking after user scrolls past the header.

### New File: `src/components/booking/FloatingBookingCTA.tsx`

```tsx
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FloatingBookingCTAProps {
  /**
   * Daily rental rate to display
   */
  dailyRate: number;
  
  /**
   * Callback when user clicks the CTA button
   */
  onOpenBooking: () => void;
  
  /**
   * Whether the button should be shown (typically mobile only)
   */
  isVisible: boolean;
  
  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * FloatingBookingCTA is a sticky button that appears on mobile
 * after the user scrolls past the header, providing quick access
 * to the booking sidebar/drawer.
 */
export const FloatingBookingCTA = ({
  dailyRate,
  onOpenBooking,
  isVisible,
  className,
}: FloatingBookingCTAProps) => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setShouldShow(false);
      return;
    }

    // Show button after user scrolls 400px down
    const handleScroll = () => {
      const scrolled = window.scrollY > 400;
      setShouldShow(scrolled);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isVisible]);

  if (!shouldShow) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-4",
        "bg-gradient-to-t from-background via-background to-transparent pt-8",
        "animate-in slide-in-from-bottom duration-300",
        className
      )}
    >
      <Button
        onClick={onOpenBooking}
        size="lg"
        className="w-full shadow-2xl text-base font-semibold"
      >
        <Calendar className="mr-2 h-5 w-5" />
        Book Now · ${dailyRate}/day
      </Button>
    </div>
  );
};
```

### Features:
- **Scroll-triggered**: Appears after 400px scroll
- **Gradient background**: Fades in naturally
- **Animated entrance**: Slides up from bottom
- **Clear CTA**: Shows price for context
- **Accessible**: Proper button semantics

---

### Testing After Step 4

**Test Script**:
```bash
# Run component in isolation (if using Storybook)
npm run storybook

# Or test in browser
npm run dev
```

**Manual Test**:
1. Open equipment detail on mobile device/emulator
2. Scroll down 400px
3. Verify button slides up from bottom
4. Click button → should trigger onOpenBooking callback
5. Scroll back up → button should disappear

---

## **STEP 5: Create MobileSidebarDrawer Component**

### Objective
On mobile, show the sidebar as a bottom sheet drawer instead of inline, triggered by the FloatingBookingCTA.

### New File: `src/components/booking/MobileSidebarDrawer.tsx`

```tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import BookingSidebar from "./BookingSidebar";
import type { Listing } from "@/components/equipment/services/listings";
import type { BookingCalculation, BookingConflict } from "@/types/booking";
import type { DateRange } from "react-day-picker";
import type { User } from "@supabase/supabase-js";

interface MobileSidebarDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing;
  avgRating: number;
  reviewCount: number;
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onStartDateSelect?: (date: Date | undefined) => void;
  onEndDateSelect?: (date: Date | undefined) => void;
  conflicts: BookingConflict[];
  loadingConflicts: boolean;
  calculation: BookingCalculation | null;
  watchedStartDate: string;
  watchedEndDate: string;
  onBooking: () => void;
  isCreatingBooking: boolean;
  user: User | null;
}

/**
 * MobileSidebarDrawer wraps BookingSidebar in a Sheet component
 * for mobile devices, providing a drawer interface for booking.
 */
export const MobileSidebarDrawer = ({
  open,
  onOpenChange,
  ...sidebarProps
}: MobileSidebarDrawerProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] max-h-[85vh] rounded-t-2xl overflow-y-auto"
      >
        {/* Swipe indicator */}
        <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
        
        <SheetHeader className="text-left mb-6">
          <SheetTitle>Book This Equipment</SheetTitle>
          <SheetDescription>
            Select your dates and confirm your booking
          </SheetDescription>
        </SheetHeader>
        
        {/* Render BookingSidebar inside drawer */}
        <div className="pb-6">
          <BookingSidebar {...sidebarProps} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
```

### Features:
- **85vh height**: Not too tall, leaves room for context
- **Rounded corners**: Modern, polished appearance
- **Swipe indicator**: Visual cue for dismissal
- **Scrollable**: Content scrolls if needed
- **Wraps existing sidebar**: Reuses BookingSidebar component

---

### Testing After Step 5

**Test on Mobile**:
1. Click FloatingBookingCTA button
2. Drawer should slide up from bottom
3. Verify swipe indicator visible
4. Test scrolling within drawer
5. Swipe down or tap outside to close
6. Verify all sidebar functionality works in drawer

---

## **STEP 6: Integrate Mobile Components into EquipmentDetailDialog**

### File to Modify: `src/components/equipment/detail/EquipmentDetailDialog.tsx`

### 6.1: Add New Imports

**Find** (at top of file):
```tsx
import BookingSidebar from "@/components/booking/BookingSidebar";
```

**Add after**:
```tsx
import { FloatingBookingCTA } from "@/components/booking/FloatingBookingCTA";
import { MobileSidebarDrawer } from "@/components/booking/MobileSidebarDrawer";
```

---

### 6.2: Add Mobile Sidebar State

**Find** (in component, around line 70-90 with other useState declarations):
```tsx
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const requestIdRef = useRef(0);
```

**Add after**:
```tsx
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
```

---

### 6.3: Update Mobile Layout (Remove Sidebar from Order)

**Find** (the section where sidebar is rendered, around line 655-680):
```tsx
          {/* Sticky booking sidebar */}
          <BookingSidebar
            listing={data}
            avgRating={avgRating}
            reviewCount={data.reviews?.length || 0}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onStartDateSelect={handleStartDateSelect}
            onEndDateSelect={handleEndDateSelect}
            conflicts={conflicts}
            loadingConflicts={loadingConflicts}
            calculation={calculation}
            watchedStartDate={watchedStartDate}
            watchedEndDate={watchedEndDate}
            onBooking={handleBooking}
            isCreatingBooking={isCreatingBooking}
            user={user}
          />
```

**Replace with** (conditional rendering):
```tsx
          {/* Sticky booking sidebar - Desktop only */}
          {!isMobile && (
            <BookingSidebar
              listing={data}
              avgRating={avgRating}
              reviewCount={data.reviews?.length || 0}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onStartDateSelect={handleStartDateSelect}
              onEndDateSelect={handleEndDateSelect}
              conflicts={conflicts}
              loadingConflicts={loadingConflicts}
              calculation={calculation}
              watchedStartDate={watchedStartDate}
              watchedEndDate={watchedEndDate}
              onBooking={handleBooking}
              isCreatingBooking={isCreatingBooking}
              user={user}
            />
          )}
```

---

### 6.4: Add Mobile Components After Main Content

**Find** (after the closing `</div>` of the main content grid, around line 685):
```tsx
        </div>
      </div>
    );
  };
```

**Add before `};`**:
```tsx
        </div>

        {/* Mobile-only: Floating CTA and Sidebar Drawer */}
        {isMobile && (
          <>
            <FloatingBookingCTA
              dailyRate={data.daily_rate}
              onOpenBooking={() => setMobileSidebarOpen(true)}
              isVisible={true}
            />
            
            <MobileSidebarDrawer
              open={mobileSidebarOpen}
              onOpenChange={setMobileSidebarOpen}
              listing={data}
              avgRating={avgRating}
              reviewCount={data.reviews?.length || 0}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onStartDateSelect={handleStartDateSelect}
              onEndDateSelect={handleEndDateSelect}
              conflicts={conflicts}
              loadingConflicts={loadingConflicts}
              calculation={calculation}
              watchedStartDate={watchedStartDate}
              watchedEndDate={watchedEndDate}
              onBooking={handleBooking}
              isCreatingBooking={isCreatingBooking}
              user={user}
            />
          </>
        )}
      </div>
    );
  };
```

### What This Does:
- **Desktop**: Sidebar shows inline on right (unchanged)
- **Mobile**: Sidebar hidden, FloatingCTA shows after scroll
- **Mobile booking**: FloatingCTA opens MobileSidebarDrawer
- **Clean separation**: Desktop and mobile behaviors clearly separated

---

### Testing After Step 6

**Desktop Testing**:
1. Open equipment detail on desktop
2. Verify sidebar visible on right side
3. Verify no floating button appears
4. Verify all booking functionality works

**Mobile Testing**:
1. Open equipment detail on mobile
2. Verify sidebar NOT visible inline
3. Scroll down 400px → floating button appears
4. Click button → drawer slides up with sidebar content
5. Test booking flow in drawer
6. Close drawer → button still visible

---

## **STEP 7: Remove Unused Code and Clean Up**

### File to Modify: `src/components/equipment/detail/EquipmentDetailDialog.tsx`

### 7.1: Remove Unused Imports

After removing the "Book" tab, these imports may no longer be needed in the main component:

**Check if these are used elsewhere in the file**:
- `BookingRequestForm` - REMOVE if only used in deleted "Book" tab
- `PaymentForm` - REMOVE if only used in deleted "Book" tab
- `CreditCard` icon - REMOVE if only used for "Book" tab

**Find** (at top of file):
```tsx
import BookingRequestForm from "@/components/booking/BookingRequestForm";
import PaymentForm from "@/components/payment/PaymentForm";
```

**Action**: 
- Search file for `BookingRequestForm` usage
- Search file for `PaymentForm` usage
- If ONLY used in deleted "Book" tab → DELETE these imports
- If used elsewhere → KEEP them

**Find** (in lucide-react imports):
```tsx
import {
  // ... other icons
  CreditCard,
  // ... other icons
} from "lucide-react";
```

**Action**: Remove `CreditCard,` if not used elsewhere

---

### 7.2: Remove/Update State Related to "Book" Tab

**Check these state variables** (around line 70-90):
- `bookingRequestId` - May still be needed for sidebar
- `isCreatingBooking` - Still needed for sidebar
- `isCancellingBooking` - May not be needed

**Review and keep if:**
- Used by BookingSidebar
- Used by booking handlers
- Referenced in cleanup effects

**Example - Check this state**:
```tsx
const [bookingRequestId, setBookingRequestId] = useState<string | null>(null);
```

**Action**: Search for `bookingRequestId` usage. If only used in deleted "Book" tab, consider removing. If used by sidebar, KEEP.

---

### 7.3: Simplify `handleBookAndPay` Function

The `handleBookAndPay` function may have logic specific to the "Book" tab that's no longer needed.

**Find** (around line 250-320):
```tsx
  const handleBookAndPay = useCallback(async () => {
    // ... booking logic
    
    // Set booking request ID to trigger payment form
    if (newBooking) {
      setBookingRequestId(newBooking.id);
      setActiveTab("book"); // ← THIS LINE may be obsolete
    }
  }, [/* dependencies */]);
```

**Look for**: `setActiveTab("book")` or similar tab switching logic

**Action**: Remove tab switching since "Book" tab no longer exists

**Updated version**:
```tsx
    // Set booking request ID for tracking
    if (newBooking) {
      setBookingRequestId(newBooking.id);
      // Payment happens in sidebar, no need to switch tabs
    }
```

---

### 7.4: Update Cleanup Effect

**Find** (around line 350-400):
```tsx
  useEffect(() => {
    if (!open) {
      // Cleanup code
      setActiveTab("overview"); // Make sure this is valid
      // ... other cleanup
    }
  }, [open, bookingRequestId]);
```

**Verify**: `setActiveTab("overview")` is still valid (it should be, as Overview tab still exists)

---

### Testing After Step 7

**Code Quality Checks**:
```bash
# Check for unused imports
npm run lint

# Check TypeScript
npm run type-check

# Check for console errors
npm run dev
# Open browser console, check for errors
```

**Manual Code Review**:
- [ ] No unused imports remain
- [ ] No references to deleted "Book" tab
- [ ] No orphaned state variables
- [ ] No broken function references
- [ ] All TypeScript types resolve

---

## **STEP 8: Visual Polish & Enhancements**

### 8.1: Add Badge to Sidebar (Desktop) for Emphasis

**File to Modify**: `src/components/booking/BookingSidebar.tsx` (carefully!)

**Find** (around line 50-60):
```tsx
    <aside
      className="order-first lg:order-last lg:sticky lg:top-6 lg:max-h-[calc(100vh-4rem)] h-fit"
      aria-label="Booking information"
    >
      <Card className="p-6 space-y-6">
```

**Add subtle emphasis** (optional, only if you want to highlight booking):
```tsx
    <aside
      className="order-first lg:order-last lg:sticky lg:top-6 lg:max-h-[calc(100vh-4rem)] h-fit"
      aria-label="Booking information"
    >
      <Card className="p-6 space-y-6 relative border-2 border-primary/10">
        {/* Optional: Add "Book Now" badge at top */}
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 hidden lg:block">
          <Badge variant="default" className="px-4 py-1 shadow-sm">
            📅 Book This Equipment
          </Badge>
        </div>
```

**⚠️ WARNING**: This modifies BookingSidebar. Only do this if you want visual enhancement. It's not required for core functionality.

---

### 8.2: Improve Tab Icons (Optional Enhancement)

The tabs currently use these icons:
- Overview: `Info` ✓ Good
- Details: `Package` ✓ Good
- Reviews: `Star` ✓ Good

**Optional**: Use more specific icons:
- Details: Could use `Calendar` or `MapPinned` for more context
- Reviews: Current `Star` is perfect

**No changes needed** unless you want to experiment with different icons.

---

### 8.3: Add Loading States to Details Tab

**File to Modify**: `src/components/equipment/detail/DetailsTab.tsx`

**Enhancement**: Show skeleton loaders while calendar/map load

**Find** (in DetailsTab component):
```tsx
        <AvailabilityCalendar
          equipmentId={equipmentId}
          defaultDailyRate={dailyRate}
          viewOnly={true}
        />
```

**Wrap with Suspense** (if you want lazy loading):
```tsx
        <Suspense fallback={
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        }>
          <AvailabilityCalendar
            equipmentId={equipmentId}
            defaultDailyRate={dailyRate}
            viewOnly={true}
          />
        </Suspense>
```

**Note**: Only add if your calendar/map components support lazy loading

---

## **STEP 9: Comprehensive Testing**

### 9.1: Manual Testing Checklist

#### Desktop Tests
- [ ] Equipment detail dialog opens correctly
- [ ] All 3 tabs (Overview, Details, Reviews) render
- [ ] Overview tab shows description, condition, category
- [ ] Details tab shows calendar AND map in one view
- [ ] Reviews tab shows reviews OR empty state
- [ ] No "Book" tab exists
- [ ] Sidebar visible on right side
- [ ] Sidebar date selection works
- [ ] Sidebar booking button works
- [ ] Price calculation updates in sidebar
- [ ] Booking flow completes successfully
- [ ] No console errors
- [ ] All tab labels visible
- [ ] Tab icons render correctly

#### Mobile Tests
- [ ] Equipment detail opens in sheet (bottom drawer)
- [ ] 3 tabs visible with full labels (not just icons)
- [ ] Tab labels readable on small screens
- [ ] Overview tab works on mobile
- [ ] Details tab works (calendar + map both render)
- [ ] Reviews tab works
- [ ] Sidebar NOT visible inline
- [ ] Scroll down → FloatingBookingCTA appears
- [ ] FloatingBookingCTA shows correct price
- [ ] Click FloatingBookingCTA → drawer opens
- [ ] Drawer shows booking sidebar content
- [ ] Swipe indicator visible in drawer
- [ ] Can close drawer by swiping or tapping outside
- [ ] Date selection works in drawer
- [ ] Booking button works in drawer
- [ ] Booking flow completes on mobile
- [ ] No layout issues or overflow

#### Responsive Tests
- [ ] Test at 320px width (small mobile)
- [ ] Test at 375px width (iPhone)
- [ ] Test at 768px width (tablet)
- [ ] Test at 1024px width (desktop)
- [ ] Test at 1920px width (large desktop)
- [ ] Verify breakpoint transitions smooth

#### Accessibility Tests
- [ ] Tab navigation works with keyboard (Tab key)
- [ ] Arrow keys navigate between tabs
- [ ] Enter/Space activates buttons
- [ ] Screen reader announces tab labels
- [ ] ARIA labels present on tabs
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] No keyboard traps

### 9.2: Automated Testing

**Create test file**: `src/components/equipment/detail/__tests__/EquipmentDetailDialog.test.tsx`

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import EquipmentDetailDialog from "../EquipmentDetailDialog";

describe("EquipmentDetailDialog - 3-Tab Layout", () => {
  const mockListing = {
    id: "123",
    title: "Test Equipment",
    daily_rate: 45,
    location: "San Francisco, CA",
    // ... other required fields
  };

  it("renders 3 tabs (Overview, Details, Reviews)", () => {
    render(
      <EquipmentDetailDialog
        open={true}
        onOpenChange={vi.fn()}
        listingId="123"
      />
    );

    expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /details/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /reviews/i })).toBeInTheDocument();
  });

  it("does not render Book tab", () => {
    render(
      <EquipmentDetailDialog
        open={true}
        onOpenChange={vi.fn()}
        listingId="123"
      />
    );

    expect(screen.queryByRole("tab", { name: /book/i })).not.toBeInTheDocument();
  });

  it("Details tab shows calendar and map", async () => {
    render(
      <EquipmentDetailDialog
        open={true}
        onOpenChange={vi.fn()}
        listingId="123"
      />
    );

    // Click Details tab
    const detailsTab = screen.getByRole("tab", { name: /details/i });
    fireEvent.click(detailsTab);

    await waitFor(() => {
      expect(screen.getByText(/availability calendar/i)).toBeInTheDocument();
      expect(screen.getByText(/location/i)).toBeInTheDocument();
    });
  });

  it("shows FloatingBookingCTA on mobile", () => {
    // Mock isMobile
    vi.mock("@/hooks/useMediaQuery", () => ({
      useMediaQuery: () => true, // mobile
    }));

    render(
      <EquipmentDetailDialog
        open={true}
        onOpenChange={vi.fn()}
        listingId="123"
      />
    );

    // Simulate scroll
    window.scrollY = 500;
    fireEvent.scroll(window);

    expect(screen.getByRole("button", { name: /book now/i })).toBeInTheDocument();
  });
});
```

**Run tests**:
```bash
npm run test -- EquipmentDetailDialog
```

---

### 9.3: Performance Testing

**Check performance metrics**:

```bash
# Build production bundle
npm run build

# Analyze bundle size
npm run analyze # (if configured)

# Or use lighthouse
npm run preview
# Then run Lighthouse in Chrome DevTools
```

**Performance Checklist**:
- [ ] Initial load time < 3s
- [ ] Time to Interactive < 5s
- [ ] No layout shift when tabs load
- [ ] Smooth tab transitions (60fps)
- [ ] Calendar loads without blocking UI
- [ ] Map loads asynchronously

---

### 9.4: Cross-Browser Testing

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Known Issues to Check**:
- Safari sometimes handles sticky positioning differently
- Mobile Safari bottom drawer may have touch issues
- Firefox may render shadows differently

---

## **STEP 10: Documentation and Handoff**

### 10.1: Update Component Documentation

**Add JSDoc comments** to new components:

**Example** (DetailsTab.tsx):
```tsx
/**
 * DetailsTab Component
 * 
 * Combines availability calendar and location map into a single
 * tab view for better information grouping and user experience.
 * 
 * @component
 * @example
 * ```tsx
 * <DetailsTab
 *   equipmentId="123"
 *   dailyRate={45}
 *   location="San Francisco, CA"
 *   latitude={37.7749}
 *   longitude={-122.4194}
 * />
 * ```
 * 
 * @param {string} equipmentId - Unique equipment identifier
 * @param {number} dailyRate - Daily rental rate in dollars
 * @param {string} location - Human-readable location string
 * @param {number|null} latitude - Geographic latitude
 * @param {number|null} longitude - Geographic longitude
 */
```

---

### 10.2: Create Migration Guide

**New file**: `docs/equipment-detail-migration-guide.md`

```markdown
# Equipment Detail Dialog - 3-Tab Migration Guide

## What Changed

### Removed
- "Availability" tab (merged into Details)
- "Location" tab (merged into Details)
- "Book" tab (booking now sidebar-only)

### Added
- "Details" tab (combines Availability + Location)
- FloatingBookingCTA component (mobile)
- MobileSidebarDrawer component (mobile)

### Modified
- TabsList: 5 tabs → 3 tabs
- Tab labels: Always visible (not hidden on mobile)
- Mobile UX: Sidebar in drawer instead of inline

## For Developers

### Breaking Changes
None - all booking functionality preserved

### New Props
- `mobileSidebarOpen` state in EquipmentDetailDialog
- `isVisible` prop on FloatingBookingCTA

### Deprecated
- "book", "availability", "location" tab values

## For QA

### Test Scenarios
1. Desktop booking flow unchanged
2. Mobile booking via floating CTA + drawer
3. All 3 tabs render correct content
4. No "Book" tab exists
5. Sidebar works identically on desktop

## For Product

### User-Facing Changes
- Cleaner tab interface (3 vs 5 tabs)
- Easier mobile booking (floating button)
- Better information grouping (Details tab)
- No change to booking flow logic
```

---

### 10.3: Update README or Storybook

If you use Storybook, add stories:

**New file**: `src/components/equipment/detail/EquipmentDetailDialog.stories.tsx`

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import EquipmentDetailDialog from "./EquipmentDetailDialog";

const meta: Meta<typeof EquipmentDetailDialog> = {
  title: "Equipment/EquipmentDetailDialog",
  component: EquipmentDetailDialog,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof EquipmentDetailDialog>;

export const Desktop: Story = {
  args: {
    open: true,
    listingId: "test-123",
  },
  parameters: {
    viewport: {
      defaultViewport: "desktop",
    },
  },
};

export const Mobile: Story = {
  args: {
    open: true,
    listingId: "test-123",
  },
  parameters: {
    viewport: {
      defaultViewport: "iphone12",
    },
  },
};

export const WithManyReviews: Story = {
  args: {
    open: true,
    listingId: "test-with-reviews",
  },
};

export const NoReviews: Story = {
  args: {
    open: true,
    listingId: "test-no-reviews",
  },
};
```

---

### 10.4: Create Changelog Entry

**Add to CHANGELOG.md**:

```markdown
## [Unreleased]

### Changed
- **Equipment Detail Dialog**: Simplified tab layout from 5 to 3 tabs
  - Merged "Availability" and "Location" into "Details" tab
  - Removed "Book" tab (booking now exclusively via sidebar)
  - Improved mobile experience with floating CTA and drawer

### Added
- FloatingBookingCTA component for mobile quick access
- MobileSidebarDrawer component for mobile booking interface
- DetailsTab component combining calendar and map views
- Empty state for reviews when none exist
- Review count badge on Reviews tab

### Improved
- Tab labels now always visible on mobile (not icon-only)
- Better information hierarchy with grouped logistics
- Single booking path reduces user confusion
- Enhanced accessibility with better ARIA labels
```

---

## 🎯 Final Verification Checklist

Before marking as complete:

### Code Quality
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Code formatted (`npm run format` or Prettier)
- [ ] No console.log statements left in code
- [ ] All imports organized and unused ones removed

### Functionality
- [ ] All 3 tabs render and switch correctly
- [ ] Details tab shows both calendar and map
- [ ] Reviews tab shows content or empty state
- [ ] Desktop sidebar unchanged and working
- [ ] Mobile floating CTA appears and works
- [ ] Mobile drawer opens and closes correctly
- [ ] Booking flow works on both desktop and mobile
- [ ] Date selection and price calculation work

### Visual Design
- [ ] Tab spacing looks clean
- [ ] Icons render correctly
- [ ] Mobile labels visible and readable
- [ ] Floating button doesn't obscure content
- [ ] Drawer has proper height and scrolling
- [ ] No visual glitches or layout shifts
- [ ] Animations smooth (floating button, drawer)

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader labels present
- [ ] Focus indicators visible
- [ ] Color contrast passes WCAG AA
- [ ] ARIA roles and labels correct

### Performance
- [ ] Page load time acceptable
- [ ] No performance regressions
- [ ] Lazy loading works (if implemented)
- [ ] Smooth scrolling and interactions

### Documentation
- [ ] JSDoc comments added to new components
- [ ] Migration guide created
- [ ] README updated (if applicable)
- [ ] Storybook stories added (if applicable)
- [ ] CHANGELOG updated

### Testing
- [ ] Manual testing completed (desktop + mobile)
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Cross-browser testing done
- [ ] Accessibility testing done

---

## 🚀 Deployment

### Pre-Deployment
1. Create pull request with descriptive title:
   - "feat: Simplify equipment detail to 3-tab layout"

2. PR description should include:
   - Summary of changes
   - Screenshots (desktop + mobile before/after)
   - Testing checklist completed
   - Migration notes

3. Request reviews from:
   - Frontend lead
   - UX designer
   - QA engineer

### Deployment Steps
1. Merge feature branch to `develop`
2. Deploy to staging environment
3. Run smoke tests on staging
4. Get stakeholder approval
5. Deploy to production

### Post-Deployment
1. Monitor analytics for:
   - Booking initiation rate (expect +15%)
   - Tab interaction rates
   - Mobile engagement
   - Error rates

2. Set up A/B test if not already done:
   - 50% new layout
   - 50% old layout (if maintained)
   - Run for 2 weeks

3. Gather user feedback:
   - In-app surveys
   - Support tickets
   - User interviews

---

## 🐛 Troubleshooting Guide

### Issue: Tabs not switching
**Symptoms**: Clicking tabs doesn't change content

**Solution**:
```tsx
// Check activeTab state is updated
const [activeTab, setActiveTab] = useState("overview");

// Verify onValueChange prop
<Tabs value={activeTab} onValueChange={setActiveTab}>
```

---

### Issue: Mobile sidebar not opening
**Symptoms**: Floating button appears but drawer doesn't open

**Solution**:
```tsx
// Check mobileSidebarOpen state
const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

// Verify FloatingBookingCTA callback
<FloatingBookingCTA onOpenBooking={() => setMobileSidebarOpen(true)} />

// Check Sheet open prop
<Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
```

---

### Issue: Details tab empty
**Symptoms**: Details tab shows no content

**Solution**:
1. Check DetailsTab component is imported
2. Verify props passed correctly:
```tsx
<DetailsTab
  equipmentId={data.id} // not undefined
  dailyRate={data.daily_rate} // not NaN
  location={data.location} // not empty
  latitude={data.latitude}
  longitude={data.longitude}
/>
```

---

### Issue: Sidebar showing on mobile
**Symptoms**: Both sidebar and floating button visible on mobile

**Solution**:
```tsx
// Ensure conditional rendering
{!isMobile && (
  <BookingSidebar {...props} />
)}

{isMobile && (
  <>
    <FloatingBookingCTA {...props} />
    <MobileSidebarDrawer {...props} />
  </>
)}
```

---

### Issue: Floating button not appearing
**Symptoms**: Button doesn't show after scrolling on mobile

**Solution**:
1. Check `isMobile` returns true
2. Verify `isVisible` prop is true
3. Check scroll event listener:
```tsx
// In FloatingBookingCTA component
useEffect(() => {
  const handleScroll = () => {
    console.log("Scroll position:", window.scrollY); // Debug
    const scrolled = window.scrollY > 400;
    setShouldShow(scrolled);
  };
  
  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => window.removeEventListener("scroll", handleScroll);
}, [isVisible]);
```

---

### Issue: Review badge not showing
**Symptoms**: No review count badge on Reviews tab

**Solution**:
```tsx
// Check data.reviews exists and has length
{data.reviews && data.reviews.length > 0 && (
  <Badge variant="secondary" className="ml-1 text-xs">
    {data.reviews.length}
  </Badge>
)}

// Or add optional chaining
{(data.reviews?.length ?? 0) > 0 && (
  <Badge variant="secondary">
    {data.reviews.length}
  </Badge>
)}
```

---

## 📊 Success Metrics

After 2 weeks post-launch, evaluate:

### Primary Metrics
- **Booking Initiation Rate**: Target +15% increase
- **Booking Completion Rate**: Maintain or improve
- **Time to Book**: Target -20% decrease

### Secondary Metrics
- **Tab Engagement**: Which tabs are clicked most?
- **Mobile Conversion**: Mobile booking rate vs desktop
- **User Satisfaction**: Survey ratings
- **Support Tickets**: Decrease in booking confusion

### Technical Metrics
- **Load Time**: < 3s
- **Error Rate**: < 1%
- **Accessibility Score**: > 90
- **Performance Score**: > 85

---

## 📝 Appendix

### A. File Checklist

**Files Created**:
- [ ] `src/components/equipment/detail/DetailsTab.tsx`
- [ ] `src/components/booking/FloatingBookingCTA.tsx`
- [ ] `src/components/booking/MobileSidebarDrawer.tsx`
- [ ] `docs/equipment-detail-migration-guide.md` (optional)
- [ ] `src/components/equipment/detail/__tests__/EquipmentDetailDialog.test.tsx` (optional)

**Files Modified**:
- [ ] `src/components/equipment/detail/EquipmentDetailDialog.tsx`
- [ ] `CHANGELOG.md` (optional)

**Files NOT Modified** (verify):
- [ ] `src/components/booking/BookingSidebar.tsx` (should be unchanged)
- [ ] All booking logic/state management (should be unchanged)

---

### B. Commit Message Template

```
feat: Simplify equipment detail to 3-tab layout

- Merge Availability + Location into Details tab
- Remove Book tab (booking via sidebar only)
- Add FloatingBookingCTA for mobile quick access
- Add MobileSidebarDrawer for mobile booking
- Improve tab labels visibility on mobile
- Add review count badge to Reviews tab
- Add empty state for no reviews

BREAKING CHANGE: None (all functionality preserved)

Closes #[issue-number]
```

---

### C. Git Branch Strategy

```bash
# Create feature branch
git checkout -b feature/equipment-detail-3-tab-layout

# Commit after each step
git add .
git commit -m "feat: add DetailsTab component"

git add .
git commit -m "feat: update tabs to 3-tab layout"

git add .
git commit -m "feat: add mobile floating CTA and drawer"

# Push when ready for review
git push origin feature/equipment-detail-3-tab-layout
```

---

### D. Rollback Plan

If issues discovered in production:

**Immediate Rollback**:
```bash
# Revert the merge commit
git revert -m 1 <merge-commit-hash>

# Deploy revert to production
git push origin main
```

**Partial Rollback** (keep some changes):
1. Revert specific commits:
```bash
git revert <commit-hash>
```

2. Or use feature flag to disable new UI:
```tsx
const use3TabLayout = useFeatureFlag("equipment-detail-3-tab");

if (use3TabLayout) {
  // New 3-tab layout
} else {
  // Old 5-tab layout
}
```

---

### E. Contact Information

**Questions?**
- Tech Lead: [name@email.com]
- UX Designer: [name@email.com]
- Product Manager: [name@email.com]

**Resources**:
- Design Mockups: [Figma link]
- Tracking Ticket: [Jira/GitHub issue]
- Slack Channel: #equipment-detail-redesign

---

## ✅ Sign-Off

### Developer
- [ ] All steps completed
- [ ] Code reviewed
- [ ] Tests passing
- [ ] Documentation updated

**Signature**: ________________  
**Date**: ________________

### Reviewer
- [ ] Code review completed
- [ ] Functionality verified
- [ ] Design approved
- [ ] Ready for deployment

**Signature**: ________________  
**Date**: ________________

---

**END OF IMPLEMENTATION PLAN**

*This plan is intended to be followed step-by-step by an executor. Each step builds on the previous one. Do not skip steps. Test after each major milestone.*
