# React Query Migration Plan

## Executive Summary

| Category | Count | Status |
|----------|-------|--------|
| ✅ Already Using React Query | 8 hooks | Reference patterns |
| 🔴 High Priority Migration | 6 hooks | Clear benefit |
| 🟡 Medium Priority | 2 hooks | Some benefit |
| ⚪ Keep As-Is | 3 hooks | Special cases |

---

## Phase 1: Reference Patterns (Already Migrated)

These hooks demonstrate the patterns to follow:

### Gold Standard Examples

| Hook | Pattern | Key Features |
|------|---------|--------------|
| `useFavorites` | Query + Mutation + Optimistic | Best example - optimistic updates, rollback, realtime sync |
| `useActiveRental` | Query + Realtime | Combines React Query with Supabase realtime |
| `useOwnerClaims` | Query + Realtime | Clean pattern with invalidation on realtime events |
| `useBookingRequests` | Query + Mutation | Good mutation pattern with cache invalidation |

Use `useFavorites` as your template - it has:
- Separated fetch functions
- Optimistic updates with rollback
- Real-time synchronization
- Proper error handling with toasts

---

## Phase 2: High Priority Migrations

These hooks manually manage loading/error state and would immediately benefit from React Query.

### 2.1 `useReviews`
**Effort: Medium | Impact: High**

Current issues:
- Manual `loading`, `error` state
- Custom caching logic missing
- No request deduplication

```typescript
// Before (simplified)
const [reviews, setReviews] = useState([]);
const [loading, setLoading] = useState(true);

// After pattern
const { data: reviews = [], isLoading } = useQuery({
  queryKey: ['reviews', { revieweeId, reviewerId, bookingId }],
  queryFn: () => fetchReviews(options),
  staleTime: 5 * 60 * 1000,
});

const submitMutation = useMutation({
  mutationFn: submitReview,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
});
```

### 2.2 `useVerification`
**Effort: Medium | Impact: High**

Current issues:
- 316 lines of manual state management
- Multiple parallel fetches without React Query's batching
- No caching of verification profiles

Recommended approach:
- Split into `useVerificationProfile` (query) and `useVerificationMutations` (mutations)
- Use React Query's `enabled` for conditional fetching

### 2.3 `usePayment`
**Effort: Low | Impact: Medium**

Current issues:
- Manual loading/error for each operation
- No caching of payment data

Migration notes:
- `getPayment` and `getUserPayments` → queries
- `createPayment`, `processRefund`, `releaseEscrow` → mutations
- Edge function calls work fine with React Query mutations

### 2.4 `useNotificationPreferences`
**Effort: Low | Impact: Medium**

Current issues:
- 177 lines for simple CRUD
- Manual stale request tracking (`fetchIdRef`)
- Manual mounted state tracking

This is a straightforward migration - single query + single mutation.

### 2.5 `useNotifications`
**Effort: High | Impact: High**

Current issues:
- 595 lines with manual caching
- Reinvents cache invalidation
- Complex grouping logic mixed with data fetching

Recommended approach:
1. Extract grouping logic to `useMemo` (keep it)
2. Convert fetch to `useQuery`
3. Convert markAsRead/delete/archive to `useMutation` with optimistic updates
4. Keep realtime subscription but use `queryClient.invalidateQueries` instead of manual cache

### 2.6 `useProfileLookup`
**Effort: Low | Impact: Low**

Current issues:
- Manual deduplication logic
- No cross-component cache sharing

Perfect use case for React Query - profiles can be shared across components.

---

## Phase 3: Medium Priority

### 3.1 `booking/useEquipmentAvailability`
**Effort: Low | Impact: Medium**

Current issues:
- Manual loading/error state
- No caching (fetches on every mount)

Simple migration, but consider if availability data should be short-lived (low staleTime).

### 3.2 `useOnboardingCheck`
**Effort: Low | Impact: Low**

Current issues:
- Manual state management
- Re-fetches on every mount

Simple boolean check - easy migration.

---

## Phase 4: Keep As-Is (Special Cases)

### ⚪ `useMessaging` (1400+ lines)
**Recommendation: Partial migration**

- The realtime subscription logic is deeply integrated
- Consider extracting `fetchConversations` to React Query
- Keep message sending and realtime logic as-is
- Break into smaller hooks first, then migrate pieces

### ⚪ `useEquipmentAutocomplete`
**Recommendation: Keep as-is**

- Already uses debouncing
- Has custom caching via service layer
- AbortController handling is correct
- Low value from React Query here

### ⚪ `usePrefersReducedMotion`
**Recommendation: Keep as-is**

- Not a data fetching hook
- Just reads browser preference

---

## Implementation Order

### Week 1: Foundation
1. **Create shared query keys factory**
```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  reviews: {
    all: ['reviews'] as const,
    byReviewee: (id: string) => ['reviews', 'reviewee', id] as const,
    byBooking: (id: string) => ['reviews', 'booking', id] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    byId: (id: string) => ['profiles', id] as const,
  },
  // ... etc
};
```

2. **Migrate `useProfileLookup`** (simplest, proves pattern)
3. **Migrate `useNotificationPreferences`** (simple CRUD)

### Week 2: Core Features
4. **Migrate `useReviews`**
5. **Migrate `usePayment`**
6. **Migrate `useEquipmentAvailability`**

### Week 3: Complex Hooks
7. **Migrate `useVerification`** (split first)
8. **Migrate `useNotifications`** (keep realtime separate)

### Week 4: Cleanup
9. **Migrate `useOnboardingCheck`**
10. **Extract messaging fetch to React Query** (partial)
11. **Remove manual caching code** from migrated hooks

---

## Migration Template

For each hook, follow this pattern:

```typescript
// src/hooks/useExample.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// 1. Extract fetch function (testable, reusable)
const fetchExample = async (params: Params): Promise<Result> => {
  const { data, error } = await supabase.from("table").select("*");
  if (error) throw error;
  return data;
};

// 2. Export hook
export const useExample = (params: Params) => {
  const queryClient = useQueryClient();

  // Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.example.byId(params.id),
    queryFn: () => fetchExample(params),
    enabled: !!params.id,
    staleTime: 5 * 60 * 1000, // Standard 5 minutes
  });

  // Mutation (if needed)
  const updateMutation = useMutation({
    mutationFn: updateExample,
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: queryKeys.example.all 
      });
    },
  });

  return {
    data: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
    update: updateMutation.mutate,
  };
};
```

---

## Success Metrics

After migration, you should see:
- **~40% less code** in data-fetching hooks
- **Zero custom caching logic** (use React Query's)
- **Consistent loading/error states** across all hooks
- **Request deduplication** automatic
- **Background refetching** for stale data
- **Devtools support** for debugging

---

## Checklist

- [x] Create `src/lib/queryKeys.ts`
- [x] Migrate `useProfileLookup`
- [x] Migrate `useNotificationPreferences`
- [x] Migrate `useReviews`
- [x] Migrate `usePayment`
- [x] Migrate `useEquipmentAvailability`
- [x] Migrate `useVerification`
- [x] Migrate `useNotifications`
- [x] Migrate `useOnboardingCheck`
- [x] ~~Partial migration of `useMessaging`~~ **SKIPPED** - Hook is 1,400+ lines with deeply integrated realtime logic. Requires breaking into smaller hooks first. Risk/benefit ratio unfavorable.
- [x] ~~Remove deprecated manual caching utilities~~ **DONE** - Removed `notificationCache` from `useNotifications`. Remaining caches (`useMessaging`, geocoding, autocomplete) are appropriate for their use cases.
