# Design System Migration Plan

This document outlines the plan to migrate remaining pages to the new unified design system established in the dashboard refactoring.

## Overview

### New Design System Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `PageShell` | `@/components/layout/PageShell` | Unified page container with header, icon, description, action |
| `ContentCard` | `@/components/ui/ContentCard` | Standardized card with variants (default, flat, elevated, interactive, dashed, highlighted) |
| `EmptyState` | `@/components/ui/EmptyState` | Unified empty state with icon, title, description, action |
| `PageSkeleton` | `@/components/ui/PageSkeleton` | Loading skeletons (PageHeaderSkeleton, CardSkeleton, StatsGridSkeleton, ListSkeleton, BookingCardSkeleton, DashboardSkeleton, PageTransitionLoader) |

### CSS Animations (in `index.css`)

| Animation | Usage |
|-----------|-------|
| `animate-page-enter` | Smooth page entrance |
| `animate-content-reveal` | Staggered content reveal with `--stagger-index` |
| `animate-loading-dot` | Subtle loading dots |
| `card-hover-lift` | Consistent card hover effect |

### Design Tokens

- Cards: `rounded-2xl`
- Page spacing: `space-y-6`
- Header format: icon + title + description
- Loading: No large spinners, use skeleton patterns or subtle loading dots

---

## Migration Checklist

### Phase 1: Settings Pages (High Priority)

#### 1.1 ProfileSettings (`/settings`)
**File:** `src/pages/ProfileSettings.tsx`

- [ ] Replace full-page spinner with `PageSkeleton` or loading dots
- [ ] Wrap content in `PageShell` with appropriate icon (`Settings` or `User`)
- [ ] Add `animate-page-enter` animation
- [ ] Update `Card` components to use `rounded-2xl` or `ContentCard`
- [ ] Apply consistent `space-y-6` spacing
- [ ] Remove manual "Back to Dashboard" link (sidebar handles navigation)

**Current issues:**
```tsx
// OLD: Full-page spinner
<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>

// OLD: Manual back link
<Link to={getDashboardLink()}>
  <ArrowLeft /> Back to Dashboard
</Link>
```

**Target pattern:**
```tsx
import PageShell from "@/components/layout/PageShell";
import { Settings } from "lucide-react";

// Loading state
if (loading) {
  return (
    <DashboardLayout>
      <PageShell title="Profile Settings" icon={Settings}>
        <CardSkeleton count={2} />
      </PageShell>
    </DashboardLayout>
  );
}

// Main content
return (
  <DashboardLayout>
    <PageShell
      title="Profile Settings"
      description="Manage your account preferences"
      icon={Settings}
    >
      {/* Content */}
    </PageShell>
  </DashboardLayout>
);
```

---

#### 1.2 NotificationsSettings (`/settings/notifications`)
**File:** `src/pages/settings/NotificationsSettings.tsx`

- [ ] Replace `Loader2` spinner with skeleton pattern
- [ ] Replace `PageHeader` with `PageShell`
- [ ] Add `animate-page-enter` animation
- [ ] Update container from `container max-w-3xl py-8` to PageShell wrapper
- [ ] Ensure cards use `rounded-2xl`
- [ ] Apply staggered animations to notification sections

**Current issues:**
```tsx
// OLD: Loader2 spinner
<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />

// OLD: PageHeader + container
<div className="container max-w-3xl py-8">
  <PageHeader title={...} description={...} />
```

**Target pattern:**
```tsx
import PageShell from "@/components/layout/PageShell";
import { Bell } from "lucide-react";
import { CardSkeleton } from "@/components/ui/PageSkeleton";

if (loading) {
  return (
    <PageShell title="Notification Settings" icon={Bell}>
      <CardSkeleton count={3} />
    </PageShell>
  );
}

return (
  <PageShell
    title="Notification Settings"
    description="Control how and when you receive notifications"
    icon={Bell}
  >
    <div className="space-y-6">
      {/* Cards with stagger animation */}
    </div>
  </PageShell>
);
```

---

### Phase 2: Support & Verification (High Priority)

#### 2.1 SupportPage (`/support`)
**File:** `src/pages/SupportPage.tsx`

- [ ] Wrap in `PageShell` with `LifeBuoy` icon
- [ ] Add `animate-page-enter` animation
- [ ] Update cards to `rounded-2xl` or use `ContentCard` variant="interactive"
- [ ] Apply staggered content reveal

**Current issues:**
```tsx
// OLD: Manual header
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold">Support & Help</h1>
    ...
  </div>
</div>
```

---

#### 2.2 VerifyIdentity (`/verification`)
**File:** `src/pages/verification/VerifyIdentity.tsx`

- [ ] Replace custom animate-pulse loading with skeleton pattern
- [ ] Consider using `PageShell` for outer wrapper
- [ ] Add `animate-page-enter` to main content
- [ ] Ensure consistent card styling (`rounded-2xl`)

**Note:** This page has a more complex layout with hero section and step progress. May need lighter touch - focus on loading state and animation consistency.

---

### Phase 3: Admin Dashboard (Medium Priority)

#### 3.1 AdminDashboard (`/admin/dashboard`)
**File:** `src/pages/admin/AdminDashboard.tsx`

- [ ] Replace `Loader2` full-page spinner with `DashboardSkeleton` or custom admin skeleton
- [ ] Wrap in `PageShell` with `ShieldCheck` icon
- [ ] Add `animate-page-enter` animation
- [ ] Update stat cards and table cards to use consistent `rounded-2xl`
- [ ] Apply staggered animations to sections

**Current issues:**
```tsx
// OLD: Full-page Loader2
<Loader2 className="h-10 w-10 animate-spin text-primary" />
```

---

### Phase 4: Claims Flow (Medium Priority)

#### 4.1 FileClaimPage (`/claims/file/:bookingId`)
**File:** `src/pages/claims/FileClaimPage.tsx`

- [ ] Replace `Loader2` spinner with skeleton
- [ ] Wrap in `PageShell` with `AlertCircle` or `FileWarning` icon
- [ ] Add `animate-page-enter` animation
- [ ] Update cards to `rounded-2xl`

---

#### 4.2 ManageClaimPage (`/claims/manage/:claimId`)
**File:** `src/pages/claims/ManageClaimPage.tsx`

- [ ] Replace `Loader2` spinner with skeleton
- [ ] Wrap in `PageShell`
- [ ] Add `animate-page-enter` animation
- [ ] Update cards to `rounded-2xl`

---

#### 4.3 ReviewClaimPage (`/claims/review/:claimId`)
**File:** `src/pages/claims/ReviewClaimPage.tsx`

- [ ] Replace `Loader2` spinner with skeleton
- [ ] Wrap in `PageShell`
- [ ] Add `animate-page-enter` animation
- [ ] Update cards to `rounded-2xl`

---

### Phase 5: Inspection & Rental Flow (Medium Priority)

#### 5.1 EquipmentInspectionPage (`/inspection/:bookingId/:type`)
**File:** `src/pages/inspection/EquipmentInspectionPage.tsx`

- [ ] Replace `Loader2` spinner with skeleton
- [ ] Consider `PageShell` wrapper or keep specialized layout
- [ ] Add page entrance animation
- [ ] Ensure card consistency

---

#### 5.2 ActiveRentalPage (`/rental/:bookingId`)
**File:** `src/pages/rental/ActiveRentalPage.tsx`

- [ ] Already uses `Skeleton` ✅
- [ ] Consider adding `animate-page-enter` to main content
- [ ] Update cards to `rounded-2xl` if not already

---

### Phase 6: Special Flows (Lower Priority)

#### 6.1 OwnerUpgrade (`/owner/become-owner`)
**File:** `src/pages/owner/OwnerUpgrade.tsx`

**Note:** This is a multi-step wizard with custom UX. Consider lighter touch:

- [ ] Keep wizard structure but update cards to `rounded-2xl`
- [ ] Ensure button loading states use subtle indicators (not jarring spinners)
- [ ] Add smooth step transitions

---

## Implementation Guidelines

### Do's ✅

1. **Use PageShell for all dashboard pages**
   ```tsx
   <PageShell title="Page Title" description="Description" icon={Icon}>
     {children}
   </PageShell>
   ```

2. **Use skeleton loading instead of spinners**
   ```tsx
   if (loading) {
     return <CardSkeleton count={3} />;
   }
   ```

3. **Apply entrance animations**
   ```tsx
   <div className="animate-page-enter">
   ```

4. **Use staggered animations for lists**
   ```tsx
   {items.map((item, index) => (
     <div
       key={item.id}
       className="animate-content-reveal"
       style={{ "--stagger-index": index } as React.CSSProperties}
     >
   ```

5. **Consistent card styling**
   ```tsx
   <Card className="rounded-2xl">
   // or
   <ContentCard variant="default">
   ```

### Don'ts ❌

1. **Don't use large full-page spinners**
   ```tsx
   // BAD
   <div className="animate-spin rounded-full h-32 w-32 border-b-2" />
   ```

2. **Don't use Loader2 for page-level loading**
   ```tsx
   // BAD for page loading
   <Loader2 className="h-10 w-10 animate-spin" />
   
   // OK for button/inline loading
   <Button disabled={loading}>
     {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
     Submit
   </Button>
   ```

3. **Don't add manual back links when sidebar exists**
   ```tsx
   // REMOVE - sidebar handles navigation
   <Link to="/dashboard"><ArrowLeft /> Back</Link>
   ```

---

## Testing Checklist

After migrating each page:

- [ ] Page loads without jarring spinner
- [ ] Skeleton/loading state matches page structure
- [ ] Page entrance animation is smooth
- [ ] Cards have consistent rounded corners
- [ ] Spacing is consistent (`space-y-6`)
- [ ] Header has icon, title, description
- [ ] Mobile responsive
- [ ] Dark mode works correctly
- [ ] No console errors

---

## Files to Modify (Summary)

```
src/pages/
├── ProfileSettings.tsx              # Phase 1
├── settings/
│   └── NotificationsSettings.tsx    # Phase 1
├── SupportPage.tsx                  # Phase 2
├── verification/
│   └── VerifyIdentity.tsx           # Phase 2
├── admin/
│   └── AdminDashboard.tsx           # Phase 3
├── claims/
│   ├── FileClaimPage.tsx            # Phase 4
│   ├── ManageClaimPage.tsx          # Phase 4
│   └── ReviewClaimPage.tsx          # Phase 4
├── inspection/
│   └── EquipmentInspectionPage.tsx  # Phase 5
├── rental/
│   └── ActiveRentalPage.tsx         # Phase 5
└── owner/
    └── OwnerUpgrade.tsx             # Phase 6
```

---

## Estimated Effort

| Phase | Pages | Estimated Time |
|-------|-------|----------------|
| Phase 1 | 2 | 30-45 min |
| Phase 2 | 2 | 30-45 min |
| Phase 3 | 1 | 20-30 min |
| Phase 4 | 3 | 45-60 min |
| Phase 5 | 2 | 30-45 min |
| Phase 6 | 1 | 15-20 min |
| **Total** | **11** | **~3-4 hours** |

---

## Notes

- Pages in auth flow (`EmailVerification`, `PaymentConfirmation`) and public pages (`HomePage`, `ExplorePage`, `EquipmentDetailPage`) are intentionally excluded as they have different UX contexts
- The `PageTransitionLoader` component provides subtle loading dots for lazy-loaded pages (already implemented in `App.tsx`)
- When in doubt, refer to already-migrated pages like `RenterBookingsPage` or `OwnerDashboard` for patterns
