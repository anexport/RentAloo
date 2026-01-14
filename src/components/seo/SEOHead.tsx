import { useEffect, useRef } from "react";

export type SEOProps = {
  title: string;
  description: string;
  canonical?: string;
  ogType?: "website" | "article" | "product";
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  noIndex?: boolean;
  noFollow?: boolean;
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
};

/**
 * SEOHead - Dynamic meta tag management for React SPA
 *
 * Updates document head with SEO-optimized meta tags including:
 * - Title (50-60 characters optimal)
 * - Meta description (150-160 characters optimal)
 * - Open Graph tags for social sharing
 * - Twitter Card tags
 * - Canonical URL for duplicate content prevention
 * - Robots directives (index/noindex, follow/nofollow)
 *
 * @example
 * <SEOHead
 *   title="Mountain Bike Rental - Vaymo"
 *   description="Rent high-quality mountain bikes for your next adventure. Daily rates starting at $25."
 *   ogType="product"
 *   ogImage="https://www.vaymo.it/bikes/mountain-bike-1.jpg"
 * />
 */
export default function SEOHead({
  title,
  description,
  canonical,
  ogType = "website",
  ogImage,
  ogImageAlt,
  twitterCard = "summary_large_image",
  noIndex = false,
  noFollow = false,
  keywords,
  author,
  publishedTime,
  modifiedTime,
}: SEOProps) {
  // Track original title for cleanup
  const originalTitleRef = useRef<string | null>(null);
  // Track elements we created (not updated) for cleanup
  const createdElementsRef = useRef<Element[]>([]);
  // Track original content of updated elements for cleanup
  const originalContentRef = useRef<Map<string, string | null>>(new Map());

  useEffect(() => {
    // Store original title on first render
    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }

    // Reset tracking for this effect run
    const createdElements: Element[] = [];
    const originalContent = new Map<string, string | null>();

    // Update title
    document.title = title;

    // Helper to update or create meta tag with cleanup tracking
    const setMetaTag = (
      selector: string,
      content: string,
      attribute: "name" | "property" = "name"
    ) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, selector.replace(/meta\[(?:name|property)="(.+)"\]/, "$1"));
        document.head.appendChild(element);
        createdElements.push(element);
      } else {
        // Store original content for restoration
        if (!originalContent.has(selector)) {
          originalContent.set(selector, element.getAttribute("content"));
        }
      }
      element.setAttribute("content", content);
    };

    // Update description
    setMetaTag('meta[name="description"]', description);

    // Update keywords if provided
    if (keywords && keywords.length > 0) {
      setMetaTag('meta[name="keywords"]', keywords.join(", "));
    }

    // Update author if provided
    if (author) {
      setMetaTag('meta[name="author"]', author);
    }

    // Update robots meta
    const robotsDirectives: string[] = [];
    if (noIndex) robotsDirectives.push("noindex");
    else robotsDirectives.push("index");
    if (noFollow) robotsDirectives.push("nofollow");
    else robotsDirectives.push("follow");
    setMetaTag('meta[name="robots"]', robotsDirectives.join(", "));

    // Update canonical URL
    const currentUrl =
      canonical ||
      (typeof window !== "undefined" ? window.location.href.split("?")[0] : "");
    let canonicalElement = document.querySelector('link[rel="canonical"]');
    let createdCanonical = false;
    if (!canonicalElement) {
      canonicalElement = document.createElement("link");
      canonicalElement.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalElement);
      createdElements.push(canonicalElement);
      createdCanonical = true;
    } else if (!originalContent.has('link[rel="canonical"]')) {
      originalContent.set('link[rel="canonical"]', canonicalElement.getAttribute("href"));
    }
    canonicalElement.setAttribute("href", currentUrl);

    // Update Open Graph tags
    setMetaTag('meta[property="og:title"]', title, "property");
    setMetaTag('meta[property="og:description"]', description, "property");
    setMetaTag('meta[property="og:type"]', ogType, "property");
    setMetaTag('meta[property="og:url"]', currentUrl, "property");

    if (ogImage) {
      setMetaTag('meta[property="og:image"]', ogImage, "property");
      if (ogImageAlt) {
        setMetaTag('meta[property="og:image:alt"]', ogImageAlt, "property");
      }
    }

    // Article-specific Open Graph tags
    if (ogType === "article") {
      if (publishedTime) {
        setMetaTag('meta[property="article:published_time"]', publishedTime, "property");
      }
      if (modifiedTime) {
        setMetaTag('meta[property="article:modified_time"]', modifiedTime, "property");
      }
      if (author) {
        setMetaTag('meta[property="article:author"]', author, "property");
      }
    }

    // Update Twitter Card tags
    setMetaTag('meta[name="twitter:card"]', twitterCard);
    setMetaTag('meta[name="twitter:title"]', title);
    setMetaTag('meta[name="twitter:description"]', description);
    if (ogImage) {
      setMetaTag('meta[name="twitter:image"]', ogImage);
      if (ogImageAlt) {
        setMetaTag('meta[name="twitter:image:alt"]', ogImageAlt);
      }
    }

    // Store refs for cleanup
    createdElementsRef.current = createdElements;
    originalContentRef.current = originalContent;

    // Cleanup function
    return () => {
      // Restore original title
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current;
      }

      // Remove elements we created
      createdElements.forEach((el) => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });

      // Restore original content for elements we updated
      originalContent.forEach((originalValue, selector) => {
        const element = document.querySelector(selector);
        if (element && originalValue !== null) {
          if (selector.includes('link[rel="canonical"]')) {
            element.setAttribute("href", originalValue);
          } else {
            element.setAttribute("content", originalValue);
          }
        }
      });
    };
  }, [
    title,
    description,
    canonical,
    ogType,
    ogImage,
    ogImageAlt,
    twitterCard,
    noIndex,
    noFollow,
    keywords,
    author,
    publishedTime,
    modifiedTime,
  ]);

  return null; // This component doesn't render anything
}
