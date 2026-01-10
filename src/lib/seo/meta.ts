/**
 * SEO meta tag utilities for Vaymo
 *
 * Helper functions to generate optimized meta tags for different page types.
 */

import type { Listing } from "@/components/equipment/services/listings";

const SITE_NAME = "Vaymo";

const envBaseUrl =
  (typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined" && import.meta.env.VITE_BASE_URL) ||
  (typeof process !== "undefined" && typeof process.env !== "undefined" && process.env.VITE_BASE_URL) ||
  (typeof window !== "undefined" ? window.location.origin : undefined);

const BASE_URL = envBaseUrl && envBaseUrl.trim().length > 0 ? envBaseUrl.trim() : "https://www.vaymo.it";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.svg`;

export interface PageMeta {
  title: string;
  description: string;
  canonical?: string;
  keywords?: string[];
  ogType?: "website" | "article" | "product";
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  noIndex?: boolean;
  noFollow?: boolean;
}

/**
 * Truncate text to specified length with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

function capitalizeFirst(value: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sanitizeMetaInput(value?: string | null, maxLength = 160): string {
  if (!value) return "";
  const normalized = value.replace(/[\r\n]+/g, " ").replace(/[<>\"`]/g, "").trim();
  const collapsed = normalized.replace(/\s+/g, " ");
  return truncate(collapsed, maxLength);
}

/**
 * Generate SEO meta for home page
 */
export function generateHomePageMeta(): PageMeta {
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
export function generateExplorePageMeta(params?: {
  search?: string;
  location?: string;
  category?: string;
}): PageMeta {
  const searchTerm = sanitizeMetaInput(params?.search, 60);
  const categoryTerm = sanitizeMetaInput(params?.category, 60);
  const location = sanitizeMetaInput(params?.location, 60);

  let title = "Browse Equipment Rentals";
  let baseDescription = "Explore thousands of equipment rentals from verified owners.";
  let detailDescription = "Find the perfect gear for your next adventure.";
  const locationSuffix = location ? ` in ${location}` : "";

  if (searchTerm) {
    title = `${searchTerm} Rentals - ${SITE_NAME}`;
    baseDescription = `Find ${searchTerm.toLowerCase()} rentals${locationSuffix}.`;
    detailDescription = "Browse equipment from verified owners with instant booking.";
  } else if (categoryTerm) {
    const categoryName = capitalizeFirst(categoryTerm);
    title = `${categoryName} Equipment Rentals - ${SITE_NAME}`;
    baseDescription = `Rent ${categoryTerm.toLowerCase()} equipment${locationSuffix} from trusted owners.`;
    detailDescription = "Affordable daily rates and verified listings.";
  } else if (location) {
    baseDescription = `Explore thousands of equipment rentals in ${location} from verified owners.`;
  }

  const description = truncate(`${baseDescription} ${detailDescription}`.trim(), 160);

  return {
    title: truncate(title, 60),
    description,
    canonical: `${BASE_URL}/explore`,
    keywords: [
      "equipment rental",
      "rent equipment",
      categoryTerm || "sports gear",
      location || "local rental",
    ].filter(Boolean),
    ogImage: DEFAULT_OG_IMAGE,
  };
}

/**
 * Generate SEO meta for equipment detail page
 */
export function generateEquipmentPageMeta(listing: Listing): PageMeta {
  // Calculate average rating
  const reviews = listing.reviews || [];
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const sanitizedTitle = sanitizeMetaInput(listing.title, 70) || "Equipment Rental";
  const sanitizedDescription = sanitizeMetaInput(listing.description, 160);
  const sanitizedLocation = sanitizeMetaInput(listing.location, 60);
  const sanitizedCondition = sanitizeMetaInput(listing.condition, 20);

  // Build title (50-60 chars)
  let title = `${sanitizedTitle} - $${listing.daily_rate}/day`;
  if (avgRating && reviews.length > 0) {
    title += ` ⭐${avgRating}`;
  }
  title = truncate(title, 60);

  // Build description (150-160 chars)
  const descriptionParts: string[] = [];
  if (sanitizedLocation) {
    descriptionParts.push(`Rent in ${sanitizedLocation}.`);
  }
  if (sanitizedDescription) {
    descriptionParts.push(sanitizedDescription);
  }
  if (sanitizedCondition) {
    descriptionParts.push(`${capitalizeFirst(sanitizedCondition)} condition.`);
  }
  if (avgRating && reviews.length > 0) {
    descriptionParts.push(`Rated ${avgRating}/5 from ${reviews.length} reviews.`);
  }
  const description = truncate(descriptionParts.join(" ").trim() || sanitizedTitle, 160);

  // Get primary image
  const primaryImage = listing.photos?.find((p) => p.is_primary)?.photo_url || listing.photos?.[0]?.photo_url;

  // Build keywords
  const keywords = [
    sanitizedTitle,
    sanitizedTitle ? `rent ${sanitizedTitle}` : "",
    listing.category?.name || "equipment",
    sanitizedLocation || "",
    sanitizedCondition ? `${sanitizedCondition} condition` : "",
  ].filter(Boolean);

  return {
    title,
    description,
    canonical: `${BASE_URL}/equipment/${listing.id}`,
    keywords,
    ogType: "product" as const,
    ogImage: primaryImage || DEFAULT_OG_IMAGE,
    ogImageAlt: `${sanitizedTitle} - Equipment rental on ${SITE_NAME}`,
  };
}

/**
 * Generate SEO meta for category pages
 */
export function getCategoryPageMeta(categoryName: string, itemCount?: number): PageMeta {
  const sanitizedCategory = sanitizeMetaInput(categoryName, 60) || "Category";
  const lowerCategory = sanitizedCategory.toLowerCase();
  const title = `${capitalizeFirst(sanitizedCategory)} Equipment Rentals - Browse ${itemCount || "Top"} Listings`;
  const description = `Rent ${lowerCategory} equipment from verified owners. Compare prices, read reviews, and book instantly. ${itemCount ? `${itemCount} listings available.` : ""}`;

  return {
    title: truncate(title, 60),
    description: truncate(description, 160),
    canonical: `${BASE_URL}/explore?category=${encodeURIComponent(lowerCategory)}`,
    keywords: [
      `${lowerCategory} rental`,
      `rent ${lowerCategory}`,
      `${lowerCategory} equipment`,
      "peer-to-peer rental",
    ],
    ogImage: DEFAULT_OG_IMAGE,
  };
}

/**
 * Generate SEO meta for user profile pages (if public)
 */
export function getUserProfileMeta(userName: string, stats?: { listings?: number; rating?: number }): PageMeta {
  const sanitizedUserName = sanitizeMetaInput(userName, 60) || "User";
  const title = `${sanitizedUserName} - Equipment Owner on ${SITE_NAME}`;
  let description = `View ${sanitizedUserName}'s equipment rentals on ${SITE_NAME}.`;

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
export function getDashboardMeta(pageTitle: string): PageMeta {
  const sanitizedPageTitle = sanitizeMetaInput(pageTitle, 60) || "Dashboard";
  return {
    title: `${sanitizedPageTitle} - ${SITE_NAME} Dashboard`,
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

// Legacy exports maintained for backward compatibility
export { generateHomePageMeta as getHomePageMeta };
export { generateExplorePageMeta as getExplorePageMeta };
export { generateEquipmentPageMeta as getEquipmentDetailMeta };
