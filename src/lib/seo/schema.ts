/**
 * Schema.org structured data generators for Vaymo
 *
 * Generates JSON-LD markup for various schema types to enhance
 * search engine understanding and enable rich results.
 */

import type { Listing } from "@/components/equipment/services/listings";

/**
 * Generate Organization schema for the Vaymo business
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Vaymo",
    url: "https://www.vaymo.it",
    logo: "https://www.vaymo.it/og-image.svg",
    description:
      "Peer-to-peer equipment rental marketplace connecting renters and owners for sports gear, tools, and outdoor equipment.",
    sameAs: [
      // Add social media profiles when available
      // "https://www.facebook.com/vaymo",
      // "https://twitter.com/vaymo",
      // "https://www.instagram.com/vaymo",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      availableLanguage: ["en", "es", "fr", "de", "it"],
    },
  };
}

/**
 * Generate WebSite schema with search action
 */
export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Vaymo",
    url: "https://www.vaymo.it",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://www.vaymo.it/explore?search={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generate BreadcrumbList schema for navigation
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate Product schema for equipment listing
 */
export function generateProductSchema(listing: Listing, baseUrl = "https://www.vaymo.it") {
  // Calculate average rating from reviews
  const reviews = listing.reviews || [];
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : undefined;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description,
    category: listing.category?.name,
    image: listing.photos?.map((photo) => photo.photo_url) || [],
    offers: {
      "@type": "Offer",
      price: listing.daily_rate.toFixed(2),
      priceCurrency: "EUR",
      availability: listing.is_available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: listing.daily_rate.toFixed(2),
        priceCurrency: "EUR",
        unitCode: "DAY",
        unitText: "per day",
      },
      itemCondition: getConditionUrl(listing.condition),
      seller: listing.owner
        ? {
            "@type": "Person",
            name: listing.owner.full_name || "Equipment Owner",
          }
        : undefined,
    },
    url: `${baseUrl}/equipment/${listing.id}`,
  };

  // Add aggregate rating if reviews exist
  if (avgRating !== undefined && reviews.length > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avgRating.toFixed(1),
      reviewCount: reviews.length,
      bestRating: "5",
      worstRating: "1",
    };
  }

  // Add review schema
  if (reviews.length > 0) {
    schema.review = reviews.slice(0, 5).map((review) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating.toString(),
        bestRating: "5",
        worstRating: "1",
      },
      author: {
        "@type": "Person",
        name: review.reviewer?.full_name || "Verified Renter",
      },
      reviewBody: review.comment || "",
      datePublished: review.created_at,
    }));
  }

  return schema;
}

/**
 * Get Schema.org URL for item condition
 */
function getConditionUrl(condition: string): string {
  const conditionMap: Record<string, string> = {
    new: "https://schema.org/NewCondition",
    excellent: "https://schema.org/NewCondition",
    good: "https://schema.org/UsedCondition",
    fair: "https://schema.org/UsedCondition",
  };
  return conditionMap[condition] || "https://schema.org/UsedCondition";
}

/**
 * Generate ItemList schema for collection of products
 */
export function generateItemListSchema(
  listings: Listing[],
  listName: string,
  baseUrl = "https://www.vaymo.it"
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: listings.length,
    itemListElement: listings.map((listing, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/equipment/${listing.id}`,
      name: listing.title,
      image: listing.photos?.[0]?.photo_url,
    })),
  };
}

/**
 * Generate FAQPage schema (useful for help/support pages)
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate LocalBusiness schema (if Vaymo has physical locations)
 */
export function generateLocalBusinessSchema(location: {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  geo: {
    latitude: number;
    longitude: number;
  };
  phone?: string;
  email?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: location.name,
    url: "https://www.vaymo.it",
    logo: "https://www.vaymo.it/og-image.svg",
    address: {
      "@type": "PostalAddress",
      streetAddress: location.address.street,
      addressLocality: location.address.city,
      addressRegion: location.address.state,
      postalCode: location.address.postalCode,
      addressCountry: location.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: location.geo.latitude,
      longitude: location.geo.longitude,
    },
    telephone: location.phone,
    email: location.email,
  };
}
