

============================================================================
File: src/lib/queryKeys.ts
Line: 19
Type: potential_issue

Prompt for AI Agent:
In @src/lib/queryKeys.ts at line 19, The byIds cache key currently builds a comma-joined string which can collide if IDs contain commas and produces an empty string for an empty array; update the byIds implementation to return the sorted array itself (e.g., use ids.slice().sort() so the original array isn't mutated) instead of ids.sort().join(",") so React Query can handle array equality and avoid collisions or empty-string keys; keep the surrounding tuple structure (["profiles","batch", sortedIds]) and preserve the const typing.



============================================================================
File: src/hooks/usePayment.ts
Line: 121 to 150
Type: potential_issue

Prompt for AI Agent:
In @src/hooks/usePayment.ts around lines 121 - 150, The current insert into payments and subsequent update to booking_requests are separate and can leave the DB inconsistent if the second fails; replace them with a single atomic DB operation by creating a Postgres stored procedure (e.g., create_payment_and_approve_booking) that INSERTs into payments and UPDATEs booking_requests inside one transaction and RETURNS the inserted payment; then call it from usePayment.ts via supabase.rpc('create_payment_and_approve_booking', { booking_request_id: bookingRequestId, renter_id: renterId, owner_id: ownerId, subtotal: paymentSummary.subtotal, service_fee: paymentSummary.service_fee, tax: paymentSummary.tax, total_amount: paymentSummary.total, escrow_amount: paymentSummary.escrow_amount, owner_payout_amount: paymentSummary.owner_payout, payment_status: PAYMENT_STATUS.SUCCEEDED, escrow_status: ESCROW_STATUS.HELD, payment_method_id: paymentMethodId, currency: 'usd', stripe_payment_intent_id: pi_mock_${Date.now()} }), handle rpc errors (throw on error) and use the returned payment instead of separate supabase.from('payments').insert(...) and supabase.from('booking_requests').update(...) calls.


============================================================================
File: src/hooks/useOnboardingCheck.ts
Line: 122
Type: potential_issue

Prompt for AI Agent:
In @src/hooks/useOnboardingCheck.ts at line 122, The query key in useOnboardingCheck is being built with user?.id ?? "" which yields an empty string when user is null; change the code so the query key is never created with an empty string — e.g. compute the key only when user exists (const key = user ? queryKeys.onboarding.check(user.id) : undefined) and pass that key to the queryKey prop (or explicitly use undefined instead of ""), or omit/disable the query when key is undefined so cache entries aren’t created with an invalid empty-id key.



============================================================================
File: src/components/layout/MobileMenuSheet.tsx
Line: 255 to 297
Type: potential_issue

Prompt for AI Agent:
In @src/components/layout/MobileMenuSheet.tsx around lines 255 - 297, The AvatarFallback in MobileMenuSheet.tsx has a typo in its utility class ("bg-linear-to-br") which prevents the gradient from rendering; update the AvatarFallback className to use the correct Tailwind class "bg-gradient-to-br" (preserve the rest of the classes and dark variants and keep it on the AvatarFallback element so the fallback shows the intended gradient).



============================================================================
File: src/components/layout/MobileMenuSheet.tsx
Line: 522 to 539
Type: potential_issue

Prompt for AI Agent:
In @src/components/layout/MobileMenuSheet.tsx around lines 522 - 539, The click handlers call optional props without null checks in MobileMenuSheet: update the Button onClick handlers that invoke onLoginClick and onSignupClick to guard against undefined (e.g., check if onLoginClick/onSignupClick exist or use optional chaining before calling) so clicking the buttons won't throw when those props are not provided; ensure the change is applied to the Button elements wrapped by SheetClose asChild to preserve existing behavior.



============================================================================
File: src/hooks/useNotifications.ts
Line: 554 to 600
Type: potential_issue

Prompt for AI Agent:
In @src/hooks/useNotifications.ts around lines 554 - 600, The four async action wrappers (markAsRead, markAllAsRead, deleteNotification, archiveNotification) currently swallow errors; update each to show toast notifications on success and failure: in the try block after a successful mutateAsync call fire a success toast (e.g., toast.success with a clear message) and return true/number as appropriate, and in the catch block capture the error and call toast.error including the error message/details before returning false/0; reference the existing functions and their mutations (markAsReadMutation, markAllAsReadMutation, deleteMutation, archiveMutation) and ensure user check (if (!user) ...) remains unchanged.

