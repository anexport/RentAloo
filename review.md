
============================================================================
File: src/App.tsx
Line: 104 to 106
Type: nitpick

Prompt for AI Agent:
In @src/App.tsx around lines 104 - 106, The loading conditional currently returns PageTransitionLoader directly; replace this with the same PageLoader wrapper used elsewhere to keep consistent abstraction: when the component checks the loading flag (the if (loading) branch), render PageLoader (wrapping PageTransitionLoader if necessary per the other usages) instead of returning PageTransitionLoader directly so the file consistently uses PageLoader across the App component.


============================================================================
File: src/pages/verification/VerifyIdentity.tsx
Line: 149 to 163
Type: potential_issue

Prompt for AI Agent:
In @src/pages/verification/VerifyIdentity.tsx around lines 149 - 163, Wrap the loading UI (the div containing Shield, pulsing dots and "Loading verification status..." text) with accessibility attributes role="status" and aria-live="polite", add a visually-hidden/read-only text node (or element) to announce status for screen readers (keep the visible "Loading verification status..." but also ensure it's announced), mark purely decorative visuals like the Shield icon and the pulsing dot elements (the mapped elements in the [0,1,2].map and the Shield component) with aria-hidden="true" so they aren’t read by AT, and ensure animations respect prefers-reduced-motion by either adding a conditional class or adding a global CSS rule targeting .animate-pulse and .animate-page-enter to disable animations under the prefers-reduced-motion media query.



============================================================================
File: src/pages/claims/ReviewClaimPage.tsx
Line: 151 to 177
Type: nitpick

Prompt for AI Agent:
In @src/pages/claims/ReviewClaimPage.tsx around lines 151 - 177, The PageShell currently uses claim.booking?.equipment?.title as its description; replace that with a clear page-purpose string like "Review and respond to this damage claim" and move the equipment title into the UI where it better provides context (for example pass claim.booking?.equipment?.title into ContentCardHeader.description or as a new prop to ClaimResponseForm). Update the PageShell description prop in the ReviewClaimPage component and add the equipment title to ContentCardHeader (or ClaimResponseForm) so the page description explains the page purpose while the equipment title remains visible.



============================================================================
File: src/pages/admin/AdminDashboard.tsx
Line: 918 to 939
Type: potential_issue

Prompt for AI Agent:
In @src/pages/admin/AdminDashboard.tsx around lines 918 - 939, The error UI currently calls window.location.reload() which forces a full page refresh; instead obtain React Query's queryClient via useQueryClient() (or use the refetch function returned by the useQuery that loads admin data) and, in the Button onClick, call either queryClient.invalidateQueries('adminData') (or the exact query key used by the admin data query) or call refetchAdminData() to retry; update the AdminDashboard error block (the Button handler) to invoke queryClient.invalidateQueries(...) or refetch rather than window.location.reload().



============================================================================
File: src/pages/verification/VerifyIdentity.tsx
Line: 154 to 162
Type: nitpick

Prompt for AI Agent:
In @src/pages/verification/VerifyIdentity.tsx around lines 154 - 162, The inline magic number 150ms used for animation delay in the VerifyIdentity component's loading dots should be extracted to a named constant (e.g., STAGGER_DELAY_MS = 150) near the top of the component/module and referenced in the style calculation (style={{ animationDelay: ${i * STAGGER_DELAY_MS}ms }}); optionally also extract the dot count ([0,1,2]) to a constant like DOT_COUNT or DOT_INDICES to improve clarity and maintainability.



============================================================================
File: src/index.css
Line: 454 to 456
Type: nitpick

Prompt for AI Agent:
In @src/index.css around lines 454 - 456, The hover-triggered animation rule for ".group:hover .animate-icon-float" lacks a will-change hint; to match existing patterns add "will-change: transform" (or appropriate property) alongside the "animation" declaration to provide a rendering hint, e.g. update the ".group:hover .animate-icon-float" rule to include will-change: transform; and apply the same change to the other hover rules referenced (lines with the same pattern for animate-icon-* at 468-470 and 482-484) to keep consistency without overusing will-change.



============================================================================
File: src/components/ui/ContentCard.tsx
Line: 89 to 128
Type: nitpick

Prompt for AI Agent:
In @src/components/ui/ContentCard.tsx around lines 89 - 128, The ContentCardHeader component currently hardcodes a bottom margin and always renders a div; change it to render a semantic header by default and make the spacing configurable: add an optional prop (e.g., as?: keyof JSX.IntrinsicElements or spacingClass?: string) to allow consumers to choose the element and supply spacing, remove the fixed "mb-4" from the className composition (use className and the new spacingClass/as prop instead) and preserve existing behavior by defaulting as="header" so accessibility is improved while spacing is controlled by callers.



============================================================================
File: src/components/renter/StatsOverview.tsx
Line: 391 to 443
Type: nitpick

Prompt for AI Agent:
In @src/components/renter/StatsOverview.tsx around lines 391 - 443, The button rendered in StatsOverview lacks an accessible name for screen readers; update the button (the element using onClick={() => handleCardClick(stat.href)}) to include an explicit accessible name such as an aria-label (or aria-labelledby) that describes the action and target (e.g., "View details for {stat.title}" or "Open {stat.title} details") so screen reader users know it navigates to the detail page; ensure the label uses stat.title and/or stat.href context and keep the visible text unchanged.



============================================================================
File: src/components/ui/ContentCard.tsx
Line: 142 to 161
Type: nitpick

Prompt for AI Agent:
In @src/components/ui/ContentCard.tsx around lines 142 - 161, The footer should use a semantic  element: replace the returned  in ContentCardFooter with a  and update the forwardRef generic/type from HTMLDivElement to HTMLElement (or HTMLFooterElement if you prefer) and the prop types to React.HTMLAttributes so the ref and props match the footer element; keep ContentCardFooter.displayName the same.



============================================================================
File: src/pages/inspection/EquipmentInspectionPage.tsx
Line: 185 to 207
Type: nitpick

Prompt for AI Agent:
In @src/pages/inspection/EquipmentInspectionPage.tsx around lines 185 - 207, The review asks you to confirm that the custom CSS animation class animate-page-enter is defined; check for animate-page-enter in your Tailwind configuration (tailwind.config.js) under theme.extend.animation and theme.extend.keyframes or in your global CSS, and if it is missing add a matching keyframes block and animation entry named animate-page-enter so the component’s class actually applies the intended entrance animation; update the config or global stylesheet and rebuild so the class is available at runtime.



============================================================================
File: src/components/ui/ContentCard.tsx
Line: 60 to 87
Type: potential_issue

Prompt for AI Agent:
In @src/components/ui/ContentCard.tsx around lines 60 - 87, The component currently types the ref as HTMLDivElement while allowing a polymorphic as prop, causing mismatched ref types; make ContentCard polymorphic by introducing a generic type parameter T extends React.ElementType = "div", update ContentCardProps to derive intrinsic props from T (e.g., extend React.ComponentPropsWithoutRef or ComponentPropsWithRef) and change the forwardRef signature to forwardRef, ContentCardProps> (or similar polymorphic ref type) so the ref type matches the rendered element; ensure the default as is "div" and adjust usages to keep variant/padding props while forwarding remaining props and the correctly typed ref.



============================================================================
File: src/components/ui/ContentCard.tsx
Line: 130 to 140
Type: potential_issue

Prompt for AI Agent:
In @src/components/ui/ContentCard.tsx around lines 130 - 140, ContentCardContent currently spreads the incoming className directly which causes inconsistent class merging; update the component (ContentCardContent and its displayName remains) to import and use the cn(...) utility to combine any default/container classes with the incoming className prop (e.g., replace className={className} with className={cn(defaultClass, className)}) so consumers' classes are merged consistently and follow the same pattern used by other components in this file.



============================================================================
File: src/components/layout/Sidebar.tsx
Line: 146
Type: nitpick

Prompt for AI Agent:
In @src/components/layout/Sidebar.tsx at line 146, Update the React Query staleTime in the Sidebar component's useQuery calls from 1 minute to the project standard of 5 minutes: replace staleTime: 1000  60 with staleTime: 1000  60  5 (or 5  60 * 1000) in the three occurrences inside src/components/layout/Sidebar.tsx (the useQuery options where staleTime is set at the lines noted); ensure all three instances that currently use 1 minute are changed so badges and related queries follow the 5-minute guideline.



============================================================================
File: src/components/layout/Sidebar.tsx
Line: 128
Type: nitpick

Prompt for AI Agent:
In @src/components/layout/Sidebar.tsx at line 128, The query staleTime in Sidebar.tsx is set to 1 minute (staleTime: 1000  60); update it to the project standard 5 minutes by changing the staleTime value used in the React Query options (the staleTime property in the hook/option object inside the Sidebar component) to 5 minutes (1000  60 * 5 or equivalent). Ensure this change is applied where the query options are passed (the staleTime field in the query options object used by the Sidebar component) unless there is a documented reason to keep a shorter window for badge accuracy.



============================================================================
File: src/index.css
Line: 400 to 413
Type: potential_issue

Prompt for AI Agent:
In @src/index.css around lines 400 - 413, The box-shadow color uses invalid "/ 0.7" and "/ 0" syntax in the @keyframes badge-pulse (and therefore affects .animate-badge-pulse); fix by using a valid alpha form — e.g., move the alpha into the color function (oklch(0.65 0.25 25 / 0.7)) or replace the expression with a color-mix() or rgba()/rgb() equivalent, or define a separate CSS var that already contains the alphaed color and use that (replace both occurrences inside badge-pulse).



============================================================================
File: src/components/layout/Sidebar.tsx
Line: 91 to 93
Type: nitpick

Prompt for AI Agent:
In @src/components/layout/Sidebar.tsx around lines 91 - 93, The inline style in the Sidebar component is setting a CSS custom property "--trust-offset" using the strokeDashoffset variable but that custom property is never used; remove the dead code by deleting the "--trust-offset": strokeDashoffset entry (and the unnecessary React.CSSProperties cast if it becomes redundant) from the style prop on the element in Sidebar so no unused CSS variable is emitted.



============================================================================
File: src/components/ui/EmptyState.tsx
Line: 71 to 79
Type: nitpick

Prompt for AI Agent:
In @src/components/ui/EmptyState.tsx around lines 71 - 79, EmptyState currently hardcodes an h3 which reduces semantic flexibility; add an optional prop headingLevel (type string or union 'h1'|'h2'|'h3'|'h4'|'h5'|'h6', default 'h3') to the EmptyStateProps and use it to render the title element dynamically (e.g., determine a Tag variable from headingLevel and render {title}), preserving the existing className logic (cn(...) and compact handling) and keeping all other behavior unchanged.



============================================================================
File: src/components/ui/PageSkeleton.tsx
Line: 182 to 200
Type: nitpick

Prompt for AI Agent:
In @src/components/ui/PageSkeleton.tsx around lines 182 - 200, The PageTransitionLoader component should expose ARIA attributes to improve screen reader feedback: update the root container rendered by PageTransitionLoader to include role="status" and aria-live="polite", and add an aria-label (e.g., "Loading page content") either on that container or the "Loading..."  so assistive tech gets descriptive context; keep the visual markup and animation as-is and ensure the added attributes are applied on the element returned by the PageTransitionLoader function.



============================================================================
File: src/components/ui/EmptyState.tsx
Line: 34 to 43
Type: nitpick

Prompt for AI Agent:
In @src/components/ui/EmptyState.tsx around lines 34 - 43, EmptyState currently assumes required props are present at compile time (EmptyStateProps, Icon, title, description), so add lightweight runtime guards at the top of the EmptyState function to handle missing/invalid inputs: check that Icon is a valid React component (function or object), that title and description are non-empty strings, and that action/secondaryAction are valid React nodes if present; if a required prop is missing or invalid, return null (or a minimal fallback UI) and optionally console.warn with a clear message referencing EmptyState and the offending prop to aid debugging. Ensure these checks live inside the EmptyState function before rendering and do not remove existing prop typings.



============================================================================
File: src/pages/claims/ManageClaimPage.tsx
Line: 194 to 201
Type: nitpick

Prompt for AI Agent:
In @src/pages/claims/ManageClaimPage.tsx around lines 194 - 201, Wrap the call to formatDistanceToNow(new Date(claim.filed_at)) used in the ContentCardHeader title in a defensive check or try/catch: verify claim.filed_at produces a valid Date (e.g., !isNaN(new Date(...).getTime())) or catch errors from formatDistanceToNow and fall back to a safe string such as "unknown date" or "date unavailable"; update the title expression in ContentCardHeader accordingly so renterDisplayName and the UI still render if the date is invalid.



============================================================================
File: src/components/booking/BookingRequestCard.tsx
Line: 328 to 347
Type: nitpick

Prompt for AI Agent:
In @src/components/booking/BookingRequestCard.tsx around lines 328 - 347, The status badge uses a deeply nested ternary and a risky fallback; extract the logic into a helper (e.g., getStatusBadgeConfig(status: string | undefined, hasPayment: boolean)) that returns { className, text } based on bookingRequest.status and hasPayment, call getBookingStatusText only for defined statuses, and use a safe fallback text like "Unknown" when status is undefined; then replace the inline ternary in the span (the cn(...) className and inner text) with cn(staticClasses, statusConfig.className) and statusConfig.text to simplify and make behavior explicit.



============================================================================
File: src/components/booking/BookingRequestCard.tsx
Line: 362 to 366
Type: potential_issue




============================================================================
File: src/pages/renter/RenterDashboard.tsx
Line: 280 to 294
Type: nitpick

Prompt for AI Agent:
In @src/pages/renter/RenterDashboard.tsx around lines 280 - 294, The verification banner in RenterDashboard uses a lot of inline styling; extract it into a reusable VerificationBanner component that accepts progress (number) and uses the same ContentCard, AlertTriangle, Link and Button structure and translation key (t("renter.verification.verify_button")). Replace the inline block in RenterDashboard with  (or equivalent) and move the className/bg/border/style strings into the new component to centralize styling and enable reuse.



============================================================================
File: src/components/booking/BookingRequestCard.tsx
Line: 454 to 462
Type: potential_issue

Prompt for AI Agent:
In @src/components/booking/BookingRequestCard.tsx around lines 454 - 462, The button toggling details uses aria-controls="booking-details" but the corresponding details container is missing that id; update the details  (the element shown/hidden by isExpanded) to include id="booking-details" or, to avoid duplicate ids in lists, generate a unique id (e.g. via React's useId or by appending the booking id) and use that same id string in the button's aria-controls so the setIsExpanded toggle (isExpanded state) correctly links the control and the region for accessibility.



============================================================================
File: src/pages/owner/OwnerDashboard.tsx
Line: 256 to 259
Type: potential_issue

Prompt for AI Agent:
In @src/pages/owner/OwnerDashboard.tsx around lines 256 - 259, The analytics Button is rendered disabled without any accessible explanation; update the  (icon BarChart3 and label t("owner.overview.quick_actions.analytics.button")) so screen readers can understand why it's unavailable by either (A) wrapping it in or replacing it with a Tooltip that shows a concise reason on hover/focus and keep it keyboard-focusable, or (B) keep it visually disabled but add an aria-describedby that points to a visually-hidden element (or use aria-disabled="true" on a focusable element) whose text uses a new translation key (e.g., t("owner.overview.quick_actions.analytics.disabled_reason")); ensure the Button has the aria attributes updated to reference that id so assistive tech receives the explanatory message.



============================================================================
File: src/pages/owner/OwnerDashboard.tsx
Line: 151 to 165
Type: nitpick

Prompt for AI Agent:
In @src/pages/owner/OwnerDashboard.tsx around lines 151 - 165, The ContentCard instance has an overly long className string which hurts readability and maintainability; extract that class list into a named constant or use the existing cn() utility and pass that variable to the ContentCard's className prop (e.g., create cardClass = "flex items-center justify-between gap-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30" or cardClass = cn(...)) and replace the inline string in the ContentCard JSX to improve clarity while keeping the same classes and behavior.



============================================================================
File: src/pages/owner/OwnerDashboard.tsx
Line: 248 to 252
Type: nitpick

Prompt for AI Agent:
In @src/pages/owner/OwnerDashboard.tsx around lines 248 - 252, Inline arrow functions passed to the Button onClick (calling navigate("/owner/equipment?action=create") and navigate("/owner/equipment")) should be extracted into named handler functions to avoid recreation on every render: add two handlers e.g. handleCreateEquipment and handleViewEquipment, define them in the OwnerDashboard component and memoize with useCallback using navigate as a dependency, then replace the inline onClick props with these handler names on the respective Buttons.



============================================================================
File: src/pages/owner/OwnerDashboard.tsx
Line: 170 to 195
Type: potential_issue

Prompt for AI Agent:
In @src/pages/owner/OwnerDashboard.tsx around lines 170 - 195, The stats configuration array is recreated on every render causing new object refs and unnecessary re-renders of ContentCard/AnimatedNumber; wrap the array creation in a useMemo inside the OwnerDashboard component (depend on stats and t) so the array is only rebuilt when its inputs change, then map over that memoized value instead of recreating the literal inline; ensure you import/use React.useMemo and keep existing keys/props (stat.label, stat.isRating, etc.).

