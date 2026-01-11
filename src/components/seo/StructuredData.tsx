import { useEffect, useRef } from "react";

export type StructuredDataProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/**
 * StructuredData - JSON-LD Schema.org markup component
 *
 * Injects structured data into the page for rich search results.
 * Supports all Schema.org types including:
 * - Product (for equipment listings)
 * - AggregateRating (for reviews)
 * - Organization (for business info)
 * - BreadcrumbList (for navigation)
 * - FAQPage, HowTo, LocalBusiness, etc.
 *
 * @example
 * <StructuredData data={{
 *   "@context": "https://schema.org",
 *   "@type": "Product",
 *   "name": "Mountain Bike",
 *   "offers": {
 *     "@type": "Offer",
 *     "price": "25.00",
 *     "priceCurrency": "USD"
 *   }
 * }} />
 */
export default function StructuredData({ data }: StructuredDataProps) {
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // Create script element
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data); // Compact JSON (no indentation)

    // Append to head
    document.head.appendChild(script);
    scriptRef.current = script;

    // Cleanup on unmount
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, [data]);

  return null;
}
