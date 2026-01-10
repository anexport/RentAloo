/**
 * SEO meta tag utilities for Vaymo
 *
 * Helper functions to generate optimized meta tags for different page types.
 */

import type { Listing } from "@/components/equipment/services/listings";

const SITE_NAME = "Vaymo";
const BASE_URL = "https://www.vaymo.it";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.svg`;

/**
 * Truncate text to specified length with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Generate SEO meta for home page
 */
export function getHomePageMeta() {
  return {
    title: "Vaymo - Rent Sports Gear, Tools & Equipment Near You",
    description:
      "Discover peer-to-peer equipment rentals. Rent sports gear, outdoor equipment, and tools from verified owners in your area. Safe, affordable, and convenient.",
    canonical: BASE_URL,
    keywords: [
      "equipment rental",
      "peer-to-peer rental",
      "rent sports gear",
      "rent tools",
      "outdoor equipment rental",
      "share economy",
    ],
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: "Vaymo - Peer-to-peer equipment rental marketplace",
  };
}

/**
 * Generate SEO meta for explore/search page
 */
export function getExplorePageMeta(params?: {
  search?: string;
  location?: string;
  category?: string;
}) {
  let title = "Browse Equipment Rentals";
  let description =
    "Explore thousands of equipment rentals from verified owners. Find the perfect gear for your next adventure.";

  if (params?.search) {
    title = `${params.search} Rentals - Vaymo`;
    description = `Find ${params.search.toLowerCase()} rentals near you. Browse equipment from verified owners with instant booking.`;
  } else if (params?.category) {
    const categoryName = params.category.charAt(0).toUpperCase() + params.category.slice(1);
    title = `${categoryName} Equipment Rentals - Vaymo`;
    description = `Rent ${categoryName.toLowerCase()} equipment from trusted owners. Affordable daily rates and verified listings.`;
  }

  if (params?.location) {
    description = description.replace("near you", `in ${params.location}`);
  }

  return {
    title: truncate(title, 60),
    description: truncate(description, 160),
    canonical: `${BASE_URL}/explore`,
    keywords: [
      "equipment rental",
      "rent equipment",
      params?.category || "sports gear",
      params?.location || "local rental",
    ],
    ogImage: DEFAULT_OG_IMAGE,
  };
}

/**
 * Generate SEO meta for equipment detail page
 */
export function getEquipmentDetailMeta(listing: Listing) {
  // Calculate average rating
  const reviews = listing.reviews || [];
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  // Build title (50-60 chars)
  let title = `${listing.title} - $${listing.daily_rate}/day`;
  if (avgRating && reviews.length > 0) {
    title += ` ⭐${avgRating}`;
  }
  title = truncate(title, 60);

  // Build description (150-160 chars)
  let description = listing.description || "";
  if (listing.location) {
    description = `Rent in ${listing.location}. ${description}`;
  }
  if (listing.condition) {
    description += ` ${listing.condition.charAt(0).toUpperCase() + listing.condition.slice(1)} condition.`;
  }
  if (avgRating && reviews.length > 0) {
    description += ` Rated ${avgRating}/5 from ${reviews.length} reviews.`;
  }
  description = truncate(description, 160);

  // Get primary image
  const primaryImage = listing.photos?.find((p) => p.is_primary)?.photo_url || listing.photos?.[0]?.photo_url;

  // Build keywords
  const keywords = [
    listing.title,
    `rent ${listing.title}`,
    listing.category?.name || "equipment",
    listing.location || "",
    listing.condition ? `${listing.condition} condition` : "",
  ].filter(Boolean);

  return {
    title,
    description,
    canonical: `${BASE_URL}/equipment/${listing.id}`,
    keywords,
    ogType: "product" as const,
    ogImage: primaryImage || DEFAULT_OG_IMAGE,
    ogImageAlt: `${listing.title} - Equipment rental on Vaymo`,
  };
}

/**
 * Generate SEO meta for category pages
 */
export function getCategoryPageMeta(categoryName: string, itemCount?: number) {
  const title = `${categoryName} Equipment Rentals - Browse ${itemCount || "Top"} Listings`;
  const description = `Rent ${categoryName.toLowerCase()} equipment from verified owners. Compare prices, read reviews, and book instantly. ${itemCount ? `${itemCount} listings available.` : ""}`;

  return {
    title: truncate(title, 60),
    description: truncate(description, 160),
    canonical: `${BASE_URL}/explore?category=${encodeURIComponent(categoryName.toLowerCase())}`,
    keywords: [
      `${categoryName} rental`,
      `rent ${categoryName}`,
      `${categoryName} equipment`,
      "peer-to-peer rental",
    ],
    ogImage: DEFAULT_OG_IMAGE,
  };
}

/**
 * Generate SEO meta for user profile pages (if public)
 */
export function getUserProfileMeta(userName: string, stats?: { listings?: number; rating?: number }) {
  const title = `${userName} - Equipment Owner on Vaymo`;
  let description = `View ${userName}'s equipment rentals on Vaymo.`;

  if (stats?.listings) {
    description += ` ${stats.listings} listings available.`;
  }
  if (stats?.rating) {
    description += ` Rated ${stats.rating}/5 by renters.`;
  }

  return {
    title: truncate(title, 60),
    description: truncate(description, 160),
    noIndex: true, // User profiles typically shouldn't be indexed
    noFollow: true,
  };
}

/**
 * Generate SEO meta for dashboard pages (protected)
 */
export function getDashboardMeta(pageTitle: string) {
  return {
    title: `${pageTitle} - Vaymo Dashboard`,
    description: "Manage your Vaymo account, bookings, and listings.",
    noIndex: true, // Dashboard pages should not be indexed
    noFollow: true,
  };
}

/**
 * Generate canonical URL with proper handling of query parameters
 * @param path - The path to generate canonical URL for
 * @param preserveParams - Query parameters to preserve from current URL
 * @param currentSearch - Optional search string for SSR contexts (defaults to window.location.search in browser)
 */
export function generateCanonicalUrl(
  path: string,
  preserveParams?: string[],
  currentSearch?: string
) {
  const url = new URL(path, BASE_URL);

  if (preserveParams && preserveParams.length > 0) {
    // Use provided currentSearch, or fall back to window.location.search in browser context
    const searchString =
      currentSearch ?? (typeof window !== "undefined" ? window.location.search : "");
    const currentParams = new URLSearchParams(searchString);
    preserveParams.forEach((param) => {
      const value = currentParams.get(param);
      if (value) {
        url.searchParams.set(param, value);
      }
    });
  }

  return url.toString();
}
