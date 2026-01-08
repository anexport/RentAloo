



============================================================================
File: src/components/layout/Sidebar.tsx
Line: 103 to 109
Type: nitpick

Prompt for AI Agent:
In @src/components/layout/Sidebar.tsx around lines 103 - 109, Confirm the database has the get_unread_messages_count RPC function defined and returning a numeric type, and verify Row Level Security policies so it only exposes counts for the calling user; then update the call site in Sidebar.tsx to use type-safe RPC invocation (use the Supabase client generic for number) and ensure the returned value is validated (handle null/undefined and the supabase error) before returning 0.



============================================================================
File: supabase/migrations/047_fix_booking_created_notify_trigger.sql
Line: 27 to 30
Type: potential_issue

Prompt for AI Agent:
In @supabase/migrations/047_fix_booking_created_notify_trigger.sql around lines 27 - 30, The NULL check currently only validates v_renter_id; update the guard to validate all critical variables returned by the JOIN (e.g., v_renter_id, v_owner_id, v_equipment_id, v_booking_request_id or whatever names are set in this function) and return early if any are NULL. Modify the IF statement that now reads "IF v_renter_id IS NULL THEN RETURN NEW; END IF;" to instead check a combined condition (IF v_renter_id IS NULL OR v_owner_id IS NULL OR v_equipment_id IS NULL OR v_booking_request_id IS NULL THEN RETURN NEW; END IF;) so create_notification and any format() calls never run with NULL inputs.



============================================================================
File: src/pages/owner/OwnerBookingsPage.tsx
Line: 25 to 29
Type: nitpick

Prompt for AI Agent:
In @src/pages/owner/OwnerBookingsPage.tsx around lines 25 - 29, The bookingIds array is being regenerated whenever bookingRequests changes even if IDs are identical; make bookingIds stable by memoizing based on the IDs snapshot rather than the whole bookingRequests object: compute the IDs (bookingRequests.map(b => b.id)) and derive a stable key (e.g., join/JSON.stringify of the ids) to use as the dependency for useMemo, or use a deep-compare memo helper so the bookingIds returned by the useMemo in OwnerBookingsPage only changes when the actual ID values change (refer to bookingIds, bookingRequests and the useMemo call).



============================================================================
File: src/pages/renter/RenterDashboard.tsx
Line: 217 to 221
Type: nitpick

Prompt for AI Agent:
In @src/pages/renter/RenterDashboard.tsx around lines 217 - 221, bookingIds is re-created whenever renterBookings changes (even if only non-ID fields change), causing unnecessary reconnections in useBookingSubscriptions; change the derivation to return the same array reference when the set/order of IDs is unchanged—e.g., inside the bookingIds logic compare the new IDs to the previous IDs (or serialize/sort and use that as the dependency) and only produce a new array when the actual IDs differ so useBookingSubscriptions only updates on real ID changes (update the bookingIds useMemo/implementation referencing bookingIds and renterBookings accordingly).



============================================================================
File: src/components/equipment/VirtualListingGrid.tsx
Line: 181 to 206
Type: nitpick

Prompt for AI Agent:
In @src/components/equipment/VirtualListingGrid.tsx around lines 181 - 206, The itemRefCallbacks Map (used by getItemRef) grows indefinitely because callbacks for removed listing IDs are never removed; add a useEffect that runs when listings change to compute current listing IDs and delete any keys from itemRefCallbacks.current that are no longer present (and optionally also remove their entries from itemRefsMap.current), so stale callbacks are cleaned up; reference the existing symbols itemRefCallbacks, getItemRef, itemRefsMap, onItemRefRef and place this cleanup effect alongside the other effects in the component.



============================================================================
File: src/hooks/useBookingRequests.ts
Line: 24 to 34
Type: potential_issue

Prompt for AI Agent:
In @src/hooks/useBookingRequests.ts around lines 24 - 34, The BOOKING_SELECT_QUERY includes equipment:equipment(...) with photos:equipment_photos(*), but the BookingRequestWithRelations type for the equipment object lacks a photos field; update the BookingRequestWithRelations type (or the nested Equipment type it uses) to include photos with the correct shape (e.g., photos: EquipmentPhoto[] or the existing equipment_photos type), import or define the EquipmentPhoto/equipment_photos type if necessary, and ensure any usages of BookingRequestWithRelations reflect the added photos property.



============================================================================
File: src/hooks/useBookingSubscriptions.ts
Line: 156 to 168
Type: nitpick

Prompt for AI Agent:
In @src/hooks/useBookingSubscriptions.ts around lines 156 - 168, The subscription callback in useBookingSubscriptions.ts only handles SUBSCRIBED and CHANNEL_ERROR; update the channel.subscribe handler (the callback inspecting subscriptionStatus) to also handle TIMED_OUT and CLOSED by calling setStatus (e.g., "error" or "closed") and setError with a clear message (including subscriptionStatus) and console.error logging; also add a default/fallback branch to handle any other unexpected statuses so errors are surfaced consistently before assigning channelRef.current.



============================================================================
File: src/hooks/useBookingSubscriptions.ts
Line: 23 to 30
Type: nitpick

Prompt for AI Agent:
In @src/hooks/useBookingSubscriptions.ts around lines 23 - 30, Export the UseBookingSubscriptionsOptions interface so consumers can import and reuse the type when calling useBookingSubscriptions; update the interface declaration (UseBookingSubscriptionsOptions) to be exported (export interface UseBookingSubscriptionsOptions) and ensure any internal references (e.g., the useBookingSubscriptions hook signature and any local type uses) remain compatible with the exported name.



============================================================================
File: src/components/ErrorBoundary.tsx
Line: 82 to 132
Type: nitpick

Prompt for AI Agent:
In @src/components/ErrorBoundary.tsx around lines 82 - 132, Add ARIA attributes to improve accessibility for the ErrorBoundary UI: ensure the main fallback container rendered by ErrorBoundary has role="alert" or role="status" with aria-live="polite" (on the top-level div that currently returns the fallback UI), mark the retry and home Buttons (used via handleRetry and handleGoHome) with accessible names and aria-disabled when disabled (reflecting canRetry()/MAX_RETRIES state), and expose the error details block (where this.state.error.message is shown) with aria-label or aria-describedby so screen readers can identify it in DEV mode; update the relevant JSX in the ErrorBoundary component to include these ARIA attributes.



============================================================================
File: src/hooks/useBookingRequests.ts
Line: 88 to 100
Type: nitpick

Prompt for AI Agent:
In @src/hooks/useBookingRequests.ts around lines 88 - 100, The queryFn uses a non-null assertion user!.id which is unnecessary and brittle; change the query function passed to useQuery (the queryFn in this hook) to pass user?.id instead of user!.id so it safely forwards undefined when user is null and relies on the existing enabled: !!user guard and the guard inside fetchBookingRequests to handle falsy userId; update any related references in this hook (queryKey remains fine) to avoid non-null assertions.



============================================================================
File: src/components/ErrorBoundary.tsx
Line: 40 to 43
Type: nitpick

Prompt for AI Agent:
In @src/components/ErrorBoundary.tsx around lines 40 - 43, Uncomment and implement the production-only error tracking in the ErrorBoundary by capturing exceptions with Sentry: import captureException (and any required types) from '@sentry/react', ensure Sentry.init(...) is called during app startup, and inside ErrorBoundary.componentDidCatch (or the existing catch block) call captureException(error, { extra: { componentStack: errorInfo.componentStack } }) only when import.meta.env.PROD is true; keep the TODO comment removed and add a brief fallback/no-op when Sentry is not initialized so tests/dev builds are unaffected.



============================================================================
File: src/components/equipment/VirtualListingGrid.tsx
Line: 142 to 173
Type: nitpick

Prompt for AI Agent:
In @src/components/equipment/VirtualListingGrid.tsx around lines 142 - 173, preloadTimeoutRef is typed as number | null which breaks in Node/SSR where setTimeout returns a NodeJS.Timeout; change its type to ReturnType | null (and keep initial value null) so the ref works in both browser and Node environments, and leave the useEffect logic (clearing with clearTimeout and assigning window.setTimeout) unchanged; update any other refs/usages of preloadTimeoutRef in this component accordingly (symbols: preloadTimeoutRef, useRef, useEffect, visibleCount, listings, threshold, hasMore, preloadImages).



============================================================================
File: src/hooks/useBookingSubscriptions.ts
Line: 72 to 93
Type: potential_issue

Prompt for AI Agent:
In @src/hooks/useBookingSubscriptions.ts around lines 72 - 93, setupSubscription currently uses supabase.channel(booking-updates-${Date.now()}) which forces a new channel on every run; remove Date.now() and use a stable channel name (e.g., "booking-updates" or a deterministic name derived from bookingIds such as a sorted-join or hash of bookingIdSet) when creating the channel in setupSubscription, ensuring channelRef removal logic (channelRef.current and supabase.removeChannel) remains intact; alternatively, add a short JSDoc on the hook advising consumers to memoize bookingIds (e.g., with useMemo) to avoid re-subscription, referencing bookingIds, channelRef, and supabase.channel in the comment.

========================================================
File: src/components/renter/StatsOverview.tsx
Line: 360 to 364
Type: potential_issue

Prompt for AI Agent:
In @src/components/renter/StatsOverview.tsx around lines 360 - 364, The date range variables mix local-time construction with UTC-based grouping; replace local Date(...) usage for threeMonthsAgo (and likewise oneMonthAgo and currentMonthStart) with UTC construction using Date.UTC so they align with groupByMonth's UTC semantics—for example build the date via new Date(Date.UTC(year, monthIndex, day)) using now.getUTCFullYear() and now.getUTCMonth() (adjusted as needed) so .toISOString() no longer shifts across timezones.

