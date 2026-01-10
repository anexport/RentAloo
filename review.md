

============================================================================
File: src/pages/ExplorePage.tsx
Line: 623
Type: potential_issue

Prompt for AI Agent:
In @src/pages/ExplorePage.tsx at line 623, The layout prop currently uses a redundant ternary in ExplorePage (layout={isMobile ? "list" : "list"}); remove the conditional and set the prop directly to the constant string "list" (i.e., replace the ternary expression with layout="list") to simplify the code and avoid unnecessary branching.




============================================================================
File: src/pages/ExplorePage.tsx
Line: 628 to 638
Type: potential_issue

Prompt for AI Agent:
In @src/pages/ExplorePage.tsx around lines 628 - 638, The renderItem callback for mobile destructures isSelected but doesn't forward it to MobileListingRow, so if selection should be shown you must pass isSelected into MobileListingRow (e.g., add an isSelected={isSelected} prop) and update MobileListingRow's props/type signature if it doesn't accept isSelected yet; locate the renderItem usage in ExplorePage.tsx and the MobileListingRow component to add the prop and any necessary handling for visual state.



============================================================================
File: src/components/equipment/listing-wizard/steps/BasicsStep.tsx
Line: 181
Type: potential_issue

Prompt for AI Agent:
In @src/components/equipment/listing-wizard/steps/BasicsStep.tsx at line 181, The focus indicator is being suppressed on the textarea/input in BasicsStep.tsx via the classes "focus-visible:ring-0 focus-visible:ring-offset-0"; remove those classes (or replace them with an accessible focus-visible style such as a visible ring or outline) so keyboard users regain a visible focus state, ensuring the component (the element with className containing "resize-none text-base leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0") shows a clear focus indicator when focused via keyboard.



============================================================================
File: src/components/explore/MobileListingsBottomSheet.tsx
Line: 421 to 426
Type: potential_issue

Prompt for AI Agent:
In @src/components/explore/MobileListingsBottomSheet.tsx around lines 421 - 426, The carousel lost its edge-to-edge behavior when the container class was changed to "w-full"; update the className passed to the div in MobileListingsBottomSheet (the cn(...) call that currently includes "w-full overflow-x-auto overscroll-x-contain" and uses snap === "peek") to restore the negative margin technique by replacing "w-full" with "-mx-4 px-4" (keep "overflow-x-auto overscroll-x-contain" and the snap-based margin logic unchanged) so the horizontal scrollable area breaks out of the parent's padding while preserving internal item spacing.



============================================================================
File: src/components/explore/filters/PriceFilterChip.tsx
Line: 173 to 203
Type: potential_issue

Prompt for AI Agent:
In @src/components/explore/filters/PriceFilterChip.tsx around lines 173 - 203, Presets currently hardcode mins (e.g., "$0-$25" uses min: 0) which can violate the component's input validation that enforces DEFAULT_PRICE_MIN; update the preset generation in the PriceFilterChip component so each preset's min is clamped to at least DEFAULT_PRICE_MIN (and max to at most DEFAULT_PRICE_MAX) before rendering or feeding setLocalRange, e.g. compute presetMin = Math.max(preset.min, DEFAULT_PRICE_MIN) and presetMax = Math.min(preset.max, DEFAULT_PRICE_MAX) and use those values for isSelected and the onClick that calls setLocalRange([presetMin, presetMax]) to ensure presets cannot bypass validation.



============================================================================
File: src/components/explore/FiltersSheet.tsx
Line: 567 to 647
Type: potential_issue

Prompt for AI Agent:
In @src/components/explore/FiltersSheet.tsx around lines 567 - 647, The mobile overlay opened when isOpen is true lacks keyboard accessibility: add an Escape key handler that calls setIsOpen(false) (attach on mount when overlayRef is shown and remove on unmount), wrap the overlay content with a focus trap (use focus-trap-react or Radix Dialog) so focus stays inside MobileFiltersContent and the footer Button while open, and implement focus restoration by storing a ref to the trigger element before opening and returning focus to that ref when the overlay closes (update wherever setIsOpen(true) is called to capture the triggerRef and on close call triggerRef.current?.focus()). Ensure handlers clean up on unmount and that handleApply/handleClear continue to work inside the trap.



============================================================================
File: src/components/explore/MobileMapOverlayControls.tsx
Line: 465 to 471
Type: potential_issue

Prompt for AI Agent:
In @src/components/explore/MobileMapOverlayControls.tsx around lines 465 - 471, In MobileMapOverlayControls.tsx update the scrollable chips container div: remove the inline WebkitOverflowScrolling style, drop the inline paddingLeft/paddingRight since px-4 already provides those, and remove the justify-center class so horizontal content is left-aligned for scrolling; also simplify the fragile -mx-4 / w-[calc(100%+32px)] pattern by replacing it with a standard container layout (e.g., keep px-4 and use w-full without negative margins) to avoid compensating width calculations.



============================================================================
File: src/components/explore/filters/DateFilterChip.tsx
Line: 228 to 238
Type: potential_issue

Prompt for AI Agent:
In @src/components/explore/filters/DateFilterChip.tsx around lines 228 - 238, The clear button inside DateFilterChip lacks an accessible label for screen readers; update the Button element (the one rendering  and calling setLocalRange(undefined) and setIsSelectingDates(false)) to include an aria-label prop with a descriptive string such as "Clear date selection" (matching the header close button pattern) so assistive technologies announce its purpose.



============================================================================
File: src/components/explore/filters/DateFilterChip.tsx
Line: 161 to 167
Type: potential_issue

Prompt for AI Agent:
In @src/components/explore/filters/DateFilterChip.tsx around lines 161 - 167, The close button in DateFilterChip (the button using onClick={() => setIsOpen(false)} and rendering the X icon) lacks an accessible name; update that button to include an aria-label (e.g., aria-label="Close" or a localized string) or aria-labelledby that describes its purpose so screen readers announce it, keeping the existing onClick and X icon intact.

