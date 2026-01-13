Starting CodeRabbit review in plain text mode...

Connecting to review service
Setting up
Analyzing
Reviewing

============================================================================
File: src/components/payment/PaymentSummaryCompact.tsx
Line: 113 to 120
Type: potential_issue

Prompt for AI Agent:
In @src/components/payment/PaymentSummaryCompact.tsx around lines 113 - 120, The JSX ternary in PaymentSummaryCompact that renders the insurance label uses insuranceType === "basic" ? "Basic" : "Premium", which treats any non-"basic" value (including "none") as "Premium"; change this to handle all cases explicitly by computing an insuranceLabel (or using a switch) before rendering: if insuranceType === "basic" -> "Basic Protection", if insuranceType === "premium" -> "Premium Protection", and for "none" (or unknown) either do not render the label or use a neutral fallback like "Protection"; update the JSX that currently references insuranceType to use that insuranceLabel (or conditionally skip rendering when insuranceType === "none") while still guarding with hasInsurance and calculation.insurance.



============================================================================
File: src/components/payment/PaymentCheckoutForm.tsx
Line: 453
Type: potential_issue

Prompt for AI Agent:
In @src/components/payment/PaymentCheckoutForm.tsx at line 453, isDarkMode is computed once in PaymentCheckoutForm and won't update if the user toggles theme, so make dark-mode detection reactive: replace the static const isDarkMode = document.documentElement.classList.contains("dark") with a stateful approach (e.g., useState inside PaymentCheckoutForm) and update it via an effect that listens for theme changes (use window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change') or a MutationObserver on document.documentElement, or subscribe to your app's theme context) and then re-create/update the Stripe Elements appearance config when that state changes.



============================================================================
File: src/components/booking/MobileBookingBar.tsx
Line: 289 to 320
Type: potential_issue

Prompt for AI Agent:
In @src/components/booking/MobileBookingBar.tsx around lines 289 - 320, The deposit card in MobileBookingBar contains hardcoded English strings and an inline SVG; replace those with i18n strings from the existing useTranslation hook and swap the inline SVG for the already-imported CheckCircle icon to match project conventions: update the text nodes ("Refundable Deposit: $", the paragraph copy) to use t(...) lookups (format the deposit amount with calculation.deposit.toFixed(2) still) and render the  component (preserving styling/classes used on the SVG container) instead of the inline ; ensure you reference calculation.deposit and the MobileBookingBar component and keep aria/accessible labels consistent.



============================================================================
File: src/components/payment/PaymentSummaryCompact.tsx
Line: 29 to 35
Type: potential_issue

Prompt for AI Agent:
In @src/components/payment/PaymentSummaryCompact.tsx around lines 29 - 35, The formatDate function currently assumes new Date(dateStr) will throw for invalid input, but it produces an Invalid Date and format() will render "Invalid Date"; update formatDate to validate the Date before formatting (e.g., import and use date-fns isValid or check Number(date.getTime())/isNaN) and return the original dateStr when invalid, then only call format when the date is valid; keep the function name formatDate and ensure the fallback behavior remains consistent.



============================================================================
File: src/components/payment/PaymentCheckoutForm.tsx
Line: 263 to 295
Type: potential_issue




============================================================================
File: src/components/booking/sidebar/InsuranceSelector.tsx
Line: 25 to 84
Type: potential_issue

Prompt for AI Agent:
In @src/components/booking/sidebar/InsuranceSelector.tsx around lines 25 - 84, The RadioGroup wrapper is ineffective because the rendered plain  elements don't use RadioGroupItem so onValueChange (onInsuranceChange) and built-in keyboard/ARIA behavior are never triggered; replace the inner buttons with RadioGroupItem (using the asChild prop if needed) so each option uses RadioGroupItem keyed by option.type, preserves your existing styling and click handler via onValueChange, and ensures role="radio" and aria-checked are provided by the RadioGroup system; alternatively, if you prefer to keep custom buttons, remove RadioGroup and implement proper ARIA semantics and keyboard handling manually on the mapped items (use selectedInsurance, calculateInsuranceCost, INSURANCE_OPTIONS and CheckCircle2 as before).



Review completed ✔
