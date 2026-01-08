Starting CodeRabbit review in plain text mode...

Connecting to review service
Setting up
Analyzing
Reviewing

============================================================================
File: src/components/ui/skeleton.tsx
Line: 8 to 21
Type: potential_issue

Prompt for AI Agent:
In @src/components/ui/skeleton.tsx around lines 8 - 21, The Skeleton component renders a shimmer div only when shimmer is true but the animation and visuals are missing; define the "animate-shimmer" animation in your Tailwind config (add keyframes named shimmer and an animation entry "shimmer") and give the shimmer overlay visible styling (e.g., a semi-transparent gradient background and proper positioning) on the inner div rendered by Skeleton (the element with className "absolute inset-0 animate-shimmer") so the gradient can translate across the skeleton; ensure classes referenced in the component match the keys in tailwind.config.js.



============================================================================
File: src/pages/owner/OwnerDashboard.tsx
Line: 340 to 345
Type: potential_issue

Prompt for AI Agent:
In @src/pages/owner/OwnerDashboard.tsx around lines 340 - 345, AnimatedNumber may render a duplicate "$" when both prefix="$" and formatCurrency are used; check the AnimatedNumber component implementation (props: prefix, formatCurrency) and either remove the explicit prefix prop from the OwnerDashboard usage or disable formatCurrency so only one mechanism adds the currency symbol; update the call site (AnimatedNumber in OwnerDashboard) to use only the correct prop and add a brief comment noting which prop is responsible for currency formatting to prevent regressions.
============================================================================
File: src/components/ui/AnimatedNumber.tsx
Line: 39
Type: potential_issue

Prompt for AI Agent:
In @src/components/ui/AnimatedNumber.tsx at line 39, The sanitization for decimals in the AnimatedNumber component is vulnerable to NaN because safeDecimals is computed directly from decimals; change the computation to first validate that decimals is a finite number (e.g., Number.isFinite(decimals) or isFinite) and only then apply Math.floor and clamp to [0,20], otherwise default to a safe integer (like 0); update the declaration of safeDecimals so it never becomes NaN before being passed as minimumFractionDigits/maximumFractionDigits.

============================================================================
File: src/index.css
Line: 233 to 255
Type: nitpick

Prompt for AI Agent:
In @src/index.css around lines 233 - 255, The infinite heartbeat on @keyframes heartbeat is too distracting; update the .animate-heartbeat rule to limit repeats or scope when it runs: set animation-iteration-count (e.g., 3) and/or add animation-delay/animation-fill-mode to pause between repeats, or change the trigger so .animate-heartbeat is only applied on user interaction/state change (hover, focus, or JS-driven class toggle) instead of animating forever; adjust the .animate-heartbeat declaration accordingly to implement one of these fixes.



============================================================================
File: src/index.css
Line: 323 to 334
Type: nitpick

Prompt for AI Agent:
In @src/index.css around lines 323 - 334, Add the browser hint to prepare for the transform by updating the .image-zoom-container img rule to include will-change: transform (and optionally promote compositing with transform: translateZ(0) if needed); locate the .image-zoom-container img CSS selector and add the will-change property so the hover scale transition uses the optimized rendering path.



============================================================================
File: src/index.css
Line: 257 to 285
Type: nitpick

Prompt for AI Agent:
In @src/index.css around lines 257 - 285, Add a will-change hint to the shimmer animation to improve rendering performance: update the .animate-shimmer and .dark .animate-shimmer rules to include will-change: background-position (or will-change: transform, background-position if you want broader hints) so the browser can optimize the @keyframes shimmer background-position animation; ensure the hint is present alongside background-size and animation in the .animate-shimmer and mirrored in .dark .animate-shimmer.



============================================================================
File: src/index.css
Line: 287 to 302
Type: nitpick

Prompt for AI Agent:
In @src/index.css around lines 287 - 302, The current @keyframes carousel-pulse and .animate-carousel-pulse animate box-shadow which is expensive; replace the box-shadow animation with a hardware-friendly approach by creating a pseudo-element (e.g., target the same element that uses .animate-carousel-pulse and add a ::before or ::after) that holds the blurred glow/visual and animate only its opacity in the keyframes instead of box-shadow; remove box-shadow changes from @keyframes carousel-pulse, update .animate-carousel-pulse to trigger the opacity animation on the pseudo-element, and adjust will-change to only include opacity to improve performance.



============================================================================
File: src/components/auth/LoginModal.tsx
Line: 86 to 106
Type: nitpick

Prompt for AI Agent:
In @src/components/auth/LoginModal.tsx around lines 86 - 106, Extract the hardcoded 400ms into a named constant (e.g., SUCCESS_ANIMATION_DELAY = 400) and replace the literal in the setTimeout call so timeoutRef.current = setTimeout(..., SUCCESS_ANIMATION_DELAY); update any related comments and, if this delay is shared across files, export the constant for reuse; keep all logic that uses timeoutRef, setShowSuccess, onOpenChange, returnedUser.user_metadata?.role, and navigate unchanged except for replacing the magic number with the new constant.



============================================================================
File: src/components/ui/FloatingInput.tsx
Line: 61 to 62
Type: potential_issue

Prompt for AI Agent:
In @src/components/ui/FloatingInput.tsx around lines 61 - 62, The isFloating calculation in FloatingInput incorrectly treats controlled empty-string values as falsy (using !!props.value), so change the check to detect the presence of the prop rather than its truthiness (e.g., use props.value !== undefined or 'value' in props) so controlled inputs with value="" still cause the label to float; update the isFloating expression that currently references props.value and props.defaultValue accordingly.



============================================================================
File: src/components/ui/FloatingInput.tsx
Line: 36 to 43
Type: potential_issue

Prompt for AI Agent:
In @src/components/ui/FloatingInput.tsx around lines 36 - 43, The mount effect in FloatingInput incorrectly uses Boolean(props.defaultValue) which treats valid falsy values like 0 (and possibly "") as empty; change the detection to consider any non-null/undefined defaultValue as a value (e.g., props.defaultValue != null) and also check the DOM value (internalRef.current?.value) to decide setting setHasValue(true); additionally, include props.defaultValue in the effect dependency array so hasValue updates if defaultValue changes after mount, and update/rename the React.useEffect that references internalRef, props.defaultValue, and setHasValue accordingly.



============================================================================
File: src/components/ui/FloatingInput.tsx
Line: 22 to 34
Type: nitpick

Prompt for AI Agent:
In @src/components/ui/FloatingInput.tsx around lines 22 - 34, The custom ref-merging logic in mergedRef (inside FloatingInput.tsx) is verbose; replace it with a standard utility to simplify and harden behavior: import a mergeRefs helper (e.g., from "react-merge-refs" or use React.mergeRefs if available) and use mergeRefs([internalRef, ref]) instead of the manual React.useMemo callback so mergedRef directly combines internalRef and the forwarded ref; ensure you remove the existing inline function and its dependency on ref and keep the forwardedRef usage consistent with the component's existing internalRef and ref symbols.



============================================================================
File: src/components/ui/AnimatedNumber.tsx
Line: 4 to 37
Type: potential_issue

Prompt for AI Agent:
In @src/components/ui/AnimatedNumber.tsx around lines 4 - 37, In AnimatedNumber, add input validation guards: ensure value is a finite number (use isFinite and fallback to 0 or display fallback) to avoid NaN/Infinity outputs; clamp duration to a sensible positive minimum (e.g., Math.max(1, Math.floor(duration || 1000))) to avoid zero/negative animation times; validate/normalize decimals to an integer within 0–20 (decimals prop) before passing to formatting or useCountUp; and guard any toLocaleString usage of locale with a try/catch (or Intl.NumberFormat with fallback to undefined/browser locale) so invalid locale strings don’t throw RangeError. Apply these checks inside the AnimatedNumber function before calling useCountUp or formatting utilities and use the validated variables thereafter.



============================================================================
File: src/hooks/useCountUp.ts
Line: 73 to 96
Type: nitpick

Prompt for AI Agent:
In @src/hooks/useCountUp.ts around lines 73 - 96, When start === end, short-circuit the animation to avoid wasted frames: detect the condition (compare start and end) before scheduling the animation (or at the top of animate) and immediately call setValue using the correct formatting logic (respecting decimals), setIsComplete(true), and avoid calling requestAnimationFrame or touching startTimeRef/frameRef; update locations around the animate function and where frameRef.current = requestAnimationFrame(animate) is invoked so the animation never begins when start === end.



============================================================================
File: src/hooks/useCountUp.ts
Line: 21 to 27
Type: potential_issue

Prompt for AI Agent:
In @src/hooks/useCountUp.ts around lines 21 - 27, Validate numeric inputs at the top of useCountUp: ensure decimals is a finite integer within the toFixed-safe range (clamp/round it to 0–100 and default to 0 if not finite), and ensure start and end are finite numbers (replace NaN or ±Infinity with a safe fallback such as 0 or the other value as appropriate); make these corrections before any math or calling toFixed so toFixed and subsequent calculations cannot throw or produce NaN/Infinity.



Review completed ✔
