
============================================================================
File: src/components/booking/BookingListItem.tsx
Line: 43 to 86
Type: potential_issue

Prompt for AI Agent:
In @src/components/booking/BookingListItem.tsx around lines 43 - 86, The getStatusConfig(status: string | null, hasPayment?: boolean) uses hasPayment to show "Confirmed" vs "Approved" but callers omit that arg; update the call site(s) that render booking status (the getStatusConfig(...) invocation in BookingListItem) to pass the actual payment flag from the booking object (e.g., pass booking.hasPayment or Boolean(booking.payment) or booking.payment?.status === "paid" as appropriate to your data model); if the booking type truly lacks payment info, remove the unused hasPayment parameter from getStatusConfig and simplify the label logic accordingly.



============================================================================
File: src/pages/owner/OwnerDashboard.tsx
Line: 54 to 55
Type: potential_issue

Prompt for AI Agent:
In @src/pages/owner/OwnerDashboard.tsx around lines 54 - 55, The current initializer calls formatDateForStorage(new Date()) on every render even though todayRef.current is intended to be stable; fix by computing the date once using useMemo and then seeding the ref from that memoized value (e.g., const today = useMemo(() => formatDateForStorage(new Date()), []); const todayRef = useRef(today)); update usages of todayRef unchanged; reference symbols: todayRef, formatDateForStorage, useMemo, useRef.



============================================================================
File: src/components/layout/MobileBottomNav.tsx
Line: 52 to 62
Type: potential_issue

Prompt for AI Agent:
In @src/components/layout/MobileBottomNav.tsx around lines 52 - 62, The Listings item and Add item are both marked active because Listings uses matchPaths with prefix matching; update MobileBottomNav to prevent prefix matches from capturing the /owner/equipment/new route by either removing the redundant matchPaths from the Listings item (keep only to: "/owner/equipment" and rely on exact or child-aware matching) or by changing the isItemActive logic to treat matchPaths matches as valid only when the current path startsWith(matchPath) AND is not equal to any other item's exact to (e.g., exclude currentPath === otherItem.to like "/owner/equipment/new"); specifically modify the isItemActive function to check item.to === currentPath first, then check matchPaths but ignore matches where another nav item's to equals the currentPath so only the exact Add item becomes active.

