Starting CodeRabbit review in plain text mode...

Connecting to review service
Setting up
Analyzing
Reviewing

============================================================================
File: src/components/reviews/ReviewCard.tsx
Line: 46 to 48
Type: potential_issue

Prompt for AI Agent:
In @src/components/reviews/ReviewCard.tsx around lines 46 - 48, Replace the hardcoded tooltip text inside TooltipContent with a translated string using the existing i18n function (call t('display.verified_badge_tooltip')) so the tooltip uses the translation pipeline; also add the key display.verified_badge_tooltip to the project's translation files with the appropriate localized values.



============================================================================
File: src/components/equipment/detail/OwnerInformationCard.tsx
Line: 9 to 13
Type: potential_issue

Prompt for AI Agent:
In @src/components/equipment/detail/OwnerInformationCard.tsx around lines 9 - 13, The component imports Tooltip, TooltipTrigger, and TooltipContent but doesn't include TooltipProvider, so Radix tooltips will not function; fix by importing TooltipProvider (from the same "@/components/ui/tooltip") and wrap the section that renders the tooltips (e.g., the grid inside OwnerInformationCard or the HoverCardContent area where TooltipTrigger/TooltipContent are used) with ..., or ensure a global TooltipProvider is present at a higher level such as the app root if you prefer a single provider for the app.



============================================================================
File: src/components/booking/sidebar/InsuranceSelector.tsx
Line: 54 to 64
Type: potential_issue

Prompt for AI Agent:
In @src/components/booking/sidebar/InsuranceSelector.tsx around lines 54 - 64, The Tooltip trigger (TooltipTrigger + HelpCircle) is not keyboard-focusable; make the trigger accessible by either wrapping the HelpCircle in a semantic focusable element (e.g., a  used as the child of TooltipTrigger) with an appropriate aria-label like "Protection plan information", or ensure the HelpCircle element has tabIndex={0} and keyboard handlers to open the tooltip on Enter/Space; update the TooltipTrigger usage and add the ARIA label and keyboard event handling so keyboard users can focus and activate the tooltip content (target symbols: Tooltip, TooltipTrigger, HelpCircle, TooltipContent).



============================================================================
File: src/components/booking/sidebar/InsuranceSelector.tsx
Line: 117 to 131
Type: potential_issue

Prompt for AI Agent:
In @src/components/booking/sidebar/InsuranceSelector.tsx around lines 117 - 131, The HelpCircle tooltip trigger inside InsuranceSelector.tsx is nested in a selectable button, so clicks bubble and select the insurance; prevent this by adding an onClick handler that calls event.stopPropagation() (and optionally event.preventDefault()) on the HelpCircle/TooltipTrigger element (the element passed asChild to TooltipTrigger) so tooltip interaction does not trigger the parent selection; ensure the handler is attached to the clickable element rendered by TooltipTrigger (the HelpCircle) and covers pointer and keyboard activation if needed.



============================================================================
File: src/components/verification/TrustScore.tsx
Line: 120 to 121
Type: potential_issue

Prompt for AI Agent:
In @src/components/verification/TrustScore.tsx around lines 120 - 121, getBadge fails for out-of-range inputs (score > 100 or < 0) and falls back to BADGES[0]; make it defensive by clamping the incoming score to the 0–100 range before badge lookup (e.g., compute a safeScore = Math.min(Math.max(score, 0), 100)) and use safeScore in the BADGES.find call (referencing getBadge and BADGES). This ensures values above 100 map to the highest badge and negatives to the lowest without changing the BADGES data.



Review completed ✔
