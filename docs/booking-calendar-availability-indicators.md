# Booking Calendar Availability Indicators Implementation Guide

## Overview
This guide provides step-by-step instructions for adding visual availability indicators (red for unavailable, green for available) to the date picker calendars in the booking sidebar on equipment details pages. The implementation will maintain the current calendar appearance while adding subtle color indicators to help users quickly identify available and unavailable dates.

## Context
Currently, the equipment details page has two calendar implementations:
1. **AvailabilityCalendar** (in details tab) - Shows full month view with availability status using background colors and icons
2. **BookingSidebar DateSelector** (booking card) - Uses two separate date picker popovers (start date and end date) without availability indicators

This guide focuses on enhancing the **DateSelector** component's calendar pickers with availability indicators.

## Goal
Add visual availability indicators to the calendar date pickers in the booking sidebar:
- **Red indicator**: Date is unavailable (blocked or booked)
- **Green indicator**: Date is available
- Keep the existing calendar design and user experience
- Indicators should be subtle and non-intrusive

---

## Implementation Plan

### Phase 1: Data Fetching & Hook Creation

#### 1.1 Create Availability Hook
**File**: `src/hooks/booking/useEquipmentAvailability.ts` (new file)

**Purpose**: Fetch and manage availability data for the equipment's calendar.

**Implementation**:
```typescript
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateForStorage } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type AvailabilityRecord = Database["public"]["Tables"]["availability_calendar"]["Row"];

export interface EquipmentAvailability {
  date: string;
  isAvailable: boolean;
  customRate?: number | null;
}

interface UseEquipmentAvailabilityProps {
  equipmentId?: string;
  enabled?: boolean;
}

export const useEquipmentAvailability = ({
  equipmentId,
  enabled = true,
}: UseEquipmentAvailabilityProps) => {
  const [availability, setAvailability] = useState<Map<string, EquipmentAvailability>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAvailability = useCallback(async () => {
    if (!equipmentId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch availability for the next 6 months
      const today = new Date();
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(today.getMonth() + 6);

      const { data, error: fetchError } = await supabase
        .from("availability_calendar")
        .select("*")
        .eq("equipment_id", equipmentId)
        .gte("date", formatDateForStorage(today))
        .lte("date", formatDateForStorage(sixMonthsFromNow));

      if (fetchError) throw fetchError;

      // Convert to Map for fast lookup
      const availabilityMap = new Map<string, EquipmentAvailability>();
      (data || []).forEach((record: AvailabilityRecord) => {
        availabilityMap.set(record.date, {
          date: record.date,
          isAvailable: record.is_available ?? true,
          customRate: record.custom_rate,
        });
      });

      setAvailability(availabilityMap);
    } catch (err) {
      console.error("Error fetching availability:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch availability"));
    } finally {
      setLoading(false);
    }
  }, [equipmentId, enabled]);

  useEffect(() => {
    void fetchAvailability();
  }, [fetchAvailability]);

  const getAvailabilityForDate = useCallback(
    (date: Date): EquipmentAvailability | undefined => {
      const dateStr = formatDateForStorage(date);
      return availability.get(dateStr);
    },
    [availability]
  );

  const isDateAvailable = useCallback(
    (date: Date): boolean => {
      const dateStr = formatDateForStorage(date);
      const record = availability.get(dateStr);
      // If no record exists, assume available
      return record?.isAvailable ?? true;
    },
    [availability]
  );

  return {
    availability,
    loading,
    error,
    getAvailabilityForDate,
    isDateAvailable,
    refetch: fetchAvailability,
  };
};
```

---

### Phase 2: Calendar Component Customization

#### 2.1 Extend Calendar Component
**File**: `src/components/ui/calendar.tsx`

**Changes**: Add support for custom day content modifiers.

**Location**: After line 150 (in the components section)

**Add this new component**:
```typescript
DayContent: ({ date, ...props }) => {
  // This will be overridden by consumers who need custom indicators
  return <span {...props}>{date.getDate()}</span>;
},
```

**Purpose**: Allow parent components to customize the day cell rendering with availability indicators.

---

### Phase 3: Create Availability-Aware Calendar Wrapper

#### 3.1 Create Enhanced Calendar Component
**File**: `src/components/booking/AvailabilityIndicatorCalendar.tsx` (new file)

**Purpose**: Wrapper around the base Calendar component that shows availability indicators.

**Implementation**:
```typescript
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

interface AvailabilityIndicatorCalendarProps extends ComponentProps<typeof Calendar> {
  isDateAvailable?: (date: Date) => boolean;
  loading?: boolean;
}

export const AvailabilityIndicatorCalendar = ({
  isDateAvailable,
  loading = false,
  modifiers,
  modifiersClassNames,
  ...props
}: AvailabilityIndicatorCalendarProps) => {
  // Helper to check if date is available
  const checkAvailability = (date: Date): boolean => {
    if (!isDateAvailable) return true;
    return isDateAvailable(date);
  };

  // Create custom modifiers for available/unavailable dates
  const customModifiers = {
    available: (date: Date) => !loading && checkAvailability(date),
    unavailable: (date: Date) => !loading && !checkAvailability(date),
    ...modifiers,
  };

  // Custom class names for availability indicators
  const customModifiersClassNames = {
    available: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-green-500 after:shadow-sm",
    unavailable: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-red-500 after:shadow-sm",
    ...modifiersClassNames,
  };

  return (
    <Calendar
      modifiers={customModifiers}
      modifiersClassNames={customModifiersClassNames}
      {...props}
    />
  );
};
```

**Explanation**:
- Uses CSS `after` pseudo-element to add a small colored dot at the bottom of each date cell
- Green dot for available dates
- Red dot for unavailable dates
- Dots are small (1rem width/height) and positioned at the bottom center
- Non-intrusive design that doesn't interfere with existing calendar functionality

---

### Phase 4: Update DateSelector Component

#### 4.1 Integrate Availability Data
**File**: `src/components/booking/sidebar/DateSelector.tsx`

**Changes**:

1. **Add imports** (at the top):
```typescript
import { useEquipmentAvailability } from "@/hooks/booking/useEquipmentAvailability";
import { AvailabilityIndicatorCalendar } from "@/components/booking/AvailabilityIndicatorCalendar";
```

2. **Update DateSelectorProps interface** (around line 14):
```typescript
interface DateSelectorProps {
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onStartDateSelect?: (date: Date | undefined) => void;
  onEndDateSelect?: (date: Date | undefined) => void;
  conflicts: BookingConflict[];
  loadingConflicts: boolean;
  minDate?: Date;
  equipmentId?: string; // NEW: Add this
}
```

3. **Add to component parameters** (around line 22):
```typescript
const DateSelector = ({
  dateRange,
  onDateRangeChange,
  onStartDateSelect,
  onEndDateSelect,
  conflicts,
  loadingConflicts,
  minDate,
  equipmentId, // NEW: Add this
}: DateSelectorProps) => {
```

4. **Add availability hook** (after the useDateRangePicker hook, around line 45):
```typescript
  // Fetch availability data
  const { isDateAvailable, loading: availabilityLoading } = useEquipmentAvailability({
    equipmentId,
    enabled: !!equipmentId,
  });
```

5. **Replace Calendar with AvailabilityIndicatorCalendar** (around line 72-80):

**BEFORE**:
```typescript
<PopoverContent className="w-auto p-0" align="start">
  <Calendar
    mode="single"
    selected={dateRange?.from}
    onSelect={handleStartDateSelect}
    disabled={(date) => startOfDay(date) < startOfDay(today)}
    initialFocus
  />
</PopoverContent>
```

**AFTER**:
```typescript
<PopoverContent className="w-auto p-0" align="start">
  <AvailabilityIndicatorCalendar
    mode="single"
    selected={dateRange?.from}
    onSelect={handleStartDateSelect}
    disabled={(date) => startOfDay(date) < startOfDay(today)}
    isDateAvailable={isDateAvailable}
    loading={availabilityLoading}
    initialFocus
  />
</PopoverContent>
```

6. **Update end date calendar** (around line 100-110):

**BEFORE**:
```typescript
<PopoverContent className="w-auto p-0" align="start">
  <Calendar
    mode="single"
    selected={dateRange?.to}
    onSelect={handleEndDateSelect}
    disabled={(date) => {
      const todayDate = startOfDay(today);
      const startDate = dateRange?.from
        ? startOfDay(dateRange.from)
        : null;
      return (
        startOfDay(date) < todayDate ||
        (startDate && startOfDay(date) < startDate)
      );
    }}
    initialFocus
  />
</PopoverContent>
```

**AFTER**:
```typescript
<PopoverContent className="w-auto p-0" align="start">
  <AvailabilityIndicatorCalendar
    mode="single"
    selected={dateRange?.to}
    onSelect={handleEndDateSelect}
    disabled={(date) => {
      const todayDate = startOfDay(today);
      const startDate = dateRange?.from
        ? startOfDay(dateRange.from)
        : null;
      return (
        startOfDay(date) < todayDate ||
        (startDate && startOfDay(date) < startDate)
      );
    }}
    isDateAvailable={isDateAvailable}
    loading={availabilityLoading}
    initialFocus
  />
</PopoverContent>
```

---

### Phase 5: Update Parent Components

#### 5.1 Update BookingSidebar Component
**File**: `src/components/booking/BookingSidebar.tsx`

**Changes**:

1. **Update BookingSidebarProps interface** (around line 11):
```typescript
interface BookingSidebarProps {
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
  equipmentId?: string; // NEW: Add this line
}
```

2. **Update component parameters** (around line 29):
```typescript
const BookingSidebar = ({
  listing,
  avgRating,
  reviewCount,
  dateRange,
  onDateRangeChange,
  onStartDateSelect,
  onEndDateSelect,
  conflicts,
  loadingConflicts,
  calculation,
  watchedStartDate,
  watchedEndDate,
  onBooking,
  isCreatingBooking,
  user,
  equipmentId, // NEW: Add this line
}: BookingSidebarProps) => {
```

3. **Pass equipmentId to DateSelector** (around line 82):
```typescript
<DateSelector
  dateRange={dateRange}
  onDateRangeChange={onDateRangeChange}
  onStartDateSelect={onStartDateSelect}
  onEndDateSelect={onEndDateSelect}
  conflicts={conflicts}
  loadingConflicts={loadingConflicts}
  equipmentId={equipmentId} // NEW: Add this line
/>
```

#### 5.2 Update EquipmentDetailDialog Component
**File**: `src/components/equipment/detail/EquipmentDetailDialog.tsx`

**Changes**:

Find the `<BookingSidebar` component usage (around line 500-520) and add the `equipmentId` prop:

**BEFORE**:
```typescript
<BookingSidebar
  listing={data}
  avgRating={avgRating}
  reviewCount={reviewCount}
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

**AFTER**:
```typescript
<BookingSidebar
  listing={data}
  avgRating={avgRating}
  reviewCount={reviewCount}
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
  equipmentId={listingId} // NEW: Add this line
/>
```

**Note**: Repeat this change for all `<BookingSidebar>` instances in the file (there may be multiple for mobile/desktop views).

---

### Phase 6: Styling Adjustments (Optional)

#### 6.1 Fine-tune Indicator Appearance
If you want to customize the indicator dots further, modify the classes in `AvailabilityIndicatorCalendar.tsx`:

**Size variations**:
```typescript
// Smaller dots
after:w-0.5 after:h-0.5

// Larger dots  
after:w-1.5 after:h-1.5
```

**Position variations**:
```typescript
// Top position
after:top-1 after:bottom-auto

// Different spacing from bottom
after:bottom-0.5  // Closer to edge
after:bottom-2    // Further from edge
```

**Color variations**:
```typescript
// Different green shade
after:bg-emerald-500
after:bg-green-600

// Different red shade
after:bg-rose-500
after:bg-red-600
```

**Add border for better visibility**:
```typescript
after:border after:border-white dark:after:border-gray-800
```

---

## Testing Checklist

### 6.1 Functional Testing
- [ ] Open equipment detail page
- [ ] Verify availability indicators appear in start date picker
- [ ] Verify availability indicators appear in end date picker
- [ ] Confirm green dots appear for available dates
- [ ] Confirm red dots appear for unavailable dates
- [ ] Test that disabled dates (past dates) don't have indicators
- [ ] Verify indicators update when navigating between months
- [ ] Test on mobile devices (responsive design)

### 6.2 Visual Testing
- [ ] Indicators are visible but not intrusive
- [ ] Indicators work in both light and dark mode
- [ ] Date text is still clearly readable
- [ ] No layout shifts when indicators appear
- [ ] Hover states still work correctly
- [ ] Selected date styling still works

### 6.3 Performance Testing
- [ ] Calendar opens quickly without lag
- [ ] Month navigation is smooth
- [ ] No excessive API calls (check browser network tab)
- [ ] Availability data is cached appropriately

### 6.4 Edge Cases
- [ ] Equipment with no availability records (should show all green)
- [ ] Equipment with all dates blocked (should show all red)
- [ ] Equipment with mixed availability
- [ ] Loading state displays correctly
- [ ] Error handling when availability fetch fails

---

## Rollback Plan

If issues arise, you can quickly revert by:

1. **Remove new files**:
   - Delete `src/hooks/booking/useEquipmentAvailability.ts`
   - Delete `src/components/booking/AvailabilityIndicatorCalendar.tsx`

2. **Revert DateSelector.tsx**:
   - Remove `equipmentId` prop
   - Remove `useEquipmentAvailability` hook usage
   - Change `AvailabilityIndicatorCalendar` back to `Calendar`
   - Remove the imports

3. **Revert BookingSidebar.tsx**:
   - Remove `equipmentId` from props interface and usage

4. **Revert EquipmentDetailDialog.tsx**:
   - Remove `equipmentId` prop from `BookingSidebar` calls

---

## Future Enhancements

### Potential Improvements:
1. **Tooltip on hover**: Show availability status when hovering over a date
2. **Custom pricing indicator**: Different color for dates with custom pricing (e.g., blue)
3. **Legend**: Add a small legend explaining the dot colors
4. **Animation**: Subtle fade-in animation when indicators load
5. **Real-time updates**: Use Supabase real-time subscriptions to update availability instantly
6. **Booking status**: Show different indicator for dates that are pending approval vs confirmed bookings

---

## Database Considerations

### Current Schema
The implementation assumes the `availability_calendar` table has:
- `equipment_id` (UUID)
- `date` (DATE)
- `is_available` (BOOLEAN)
- `custom_rate` (NUMERIC, optional)

### RLS Policies
Ensure appropriate Row Level Security policies exist:
```sql
-- Allow anyone to read availability (for public viewing)
CREATE POLICY "Anyone can view availability"
ON availability_calendar FOR SELECT
TO authenticated, anon
USING (true);
```

---

## Performance Optimization Notes

### Caching Strategy
- The hook fetches 6 months of data at once to minimize API calls
- Data is stored in a `Map` for O(1) lookup performance
- Consider adding React Query for automatic caching and background refetching

### Optimization Tips
1. **Debounce month changes**: If users rapidly click through months, debounce the availability fetch
2. **Preload adjacent months**: Fetch data for previous/next months in advance
3. **Lazy loading**: Only fetch availability when calendar is opened

---

## Accessibility Notes

The implementation maintains accessibility:
- Indicators are purely visual enhancements
- Existing aria-labels and keyboard navigation remain unchanged
- Color is not the only indicator (conflicts still show alert messages)
- Works with screen readers (doesn't interfere with existing ARIA attributes)

---

## Summary

This implementation adds subtle, non-intrusive availability indicators to the booking calendar date pickers. Users will see small colored dots at the bottom of each date:
- **Green**: Available for booking
- **Red**: Unavailable (blocked or booked)

The implementation:
- ✅ Maintains existing design and UX
- ✅ Uses efficient data fetching with caching
- ✅ Works on mobile and desktop
- ✅ Supports dark mode
- ✅ Is fully accessible
- ✅ Can be easily customized or removed

The executor should follow the phases in order, testing after each major change. Total implementation time: 2-4 hours depending on familiarity with the codebase.
