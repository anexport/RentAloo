

============================================================================
File: src/components/equipment/ListingCard.tsx
Line: 319 to 327
Type: potential_issue

Prompt for AI Agent:
In @src/components/equipment/ListingCard.tsx around lines 319 - 327, The single-image branch in ListingCard is using loading="lazy", which delays the above-the-fold primary image; update the  used when listing.photos has only one item (the block rendering listing.photos[0]?.photo_url) to use loading="eager" (matching the carousel's first-image behavior) and keep decoding="async" and existing attributes unchanged so the primary image loads immediately.



============================================================================
File: src/components/equipment/ListingCard.tsx
Line: 461 to 468
Type: potential_issue

Prompt for AI Agent:
In @src/components/equipment/ListingCard.tsx around lines 461 - 468, The price rendering in ListingCard.tsx currently hardcodes the "$" symbol; replace that with a locale-aware formatted string by computing a formattedRate (e.g., in the ListingCard component scope) using Intl.NumberFormat with style: "currency" and currency: listing.currency ?? "USD", then render formattedRate instead of "${listing.daily_rate}"; ensure you still use the existing translation key t("listing_card.per_day") for the per-day text so the UI remains localized.







