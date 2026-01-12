Starting CodeRabbit review in plain text mode...

Connecting to review service
Setting up
Analyzing
Reviewing

============================================================================
File: src/components/explore/EmptyState.tsx
Line: 73 to 74
Type: potential_issue

Prompt for AI Agent:
In @src/components/explore/EmptyState.tsx around lines 73 - 74, In EmptyState, the JSX rendering of the price range inserts a stray space because the $ and the {filters.priceMax ?? DEFAULT_PRICE_MAX} are split across lines; fix by combining them into a single JSX expression so the dollar sign and the value are adjacent (e.g., replace the broken fragment around "Price: ${filters.priceMin ?? DEFAULT_PRICE_MIN} - $ {filters.priceMax ?? DEFAULT_PRICE_MAX}" with a single contiguous string or one JSX expression that renders "$" immediately before filters.priceMax).



Review completed ✔
