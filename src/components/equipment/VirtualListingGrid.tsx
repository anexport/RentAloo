import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  memo,
} from "react";
import ListingCard from "@/components/equipment/ListingCard";
import ListingCardSkeleton from "@/components/equipment/ListingCardSkeleton";
import type { Listing } from "@/components/equipment/services/listings";
import {
  VIRTUAL_SCROLL_THRESHOLD,
  VIRTUAL_SCROLL_ROOT_MARGIN,
} from "@/config/pagination";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export interface VirtualListingGridHandle {
  /** Scroll to a specific listing by ID. Returns true if successful, false if item not found. */
  scrollToItem: (id: string, behavior?: ScrollBehavior) => boolean;
  /** Get the index of a listing by ID, or -1 if not found */
  getItemIndex: (id: string) => number;
}

// Preload images for upcoming listings
const preloadImages = (urls: string[]) => {
  urls.forEach((url) => {
    if (url) {
      const img = new Image();
      img.src = url;
    }
  });
};

type Props = {
  listings: Listing[];
  onOpenListing?: (listing: Listing) => void;
  threshold?: number; // Number of items to render at once
  /** Currently selected listing ID for highlighting */
  selectedListingId?: string | null;
  /** Callback to track refs for scroll-to-item functionality */
  onItemRef?: (id: string, el: HTMLDivElement | null) => void;
  /** Layout mode: 'grid' for multi-column grid, 'list' for single column */
  layout?: "grid" | "list";
  /** Custom class name for the container */
  className?: string;
};

/**
 * Virtual scrolling grid/list for listing cards
 *
 * IMPORTANT: This component expects pre-fetched listings with all relations
 * (reviews, categories, photos) already loaded to avoid N+1 queries.
 *
 * @param listings - Array of listings with pre-loaded relations
 * @param onOpenListing - Callback when a listing is opened
 * @param threshold - Number of items to load per batch (default: VIRTUAL_SCROLL_THRESHOLD)
 * @param selectedListingId - Optional ID of selected listing for highlighting
 * @param onItemRef - Optional callback to track item refs
 * @param layout - 'grid' (default) or 'list' layout mode
 * @param className - Optional container class name
 */
const VirtualListingGridInner = forwardRef<VirtualListingGridHandle, Props>(
  (
    {
      listings,
      onOpenListing,
      threshold = VIRTUAL_SCROLL_THRESHOLD,
      selectedListingId,
      onItemRef,
      layout = "grid",
      className,
    },
    ref
  ) => {
    const [visibleCount, setVisibleCount] = useState(threshold);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Internal refs map for scroll-to-item functionality
    const itemRefsMap = useRef<Map<string, HTMLDivElement | null>>(new Map());

    // Responsive skeleton count matching grid layout
    const isDesktop = useMediaQuery("(min-width: 1024px)"); // lg breakpoint
    const isTablet = useMediaQuery("(min-width: 768px)"); // md breakpoint
    const skeletonCount = isDesktop ? 3 : isTablet ? 2 : 1;

    useEffect(() => {
      // Reset visible count when listings change
      setVisibleCount(threshold);
    }, [listings, threshold]);

    useEffect(() => {
      if (!sentinelRef.current) return;
      if (visibleCount >= listings.length) return;

      // IntersectionObserver may not be supported in older browsers
      if (typeof IntersectionObserver === "undefined") {
        // Fallback: show all items if IntersectionObserver is not supported
        setVisibleCount(listings.length);
        return;
      }

      const element = sentinelRef.current;
      let observer: IntersectionObserver | null = null;

      try {
        observer = new IntersectionObserver(
          (entries) => {
            const first = entries[0];
            if (first?.isIntersecting) {
              // Load more items when sentinel comes into view
              setVisibleCount((prev) =>
                Math.min(prev + threshold, listings.length)
              );
            }
          },
          {
            rootMargin: VIRTUAL_SCROLL_ROOT_MARGIN, // Start loading before user reaches the end
          }
        );

        observer.observe(element);
      } catch (error) {
        console.error("Failed to create IntersectionObserver:", error);
        // Fallback: show all items if observer creation fails
        setVisibleCount(listings.length);
        // Don't return - let cleanup handle any partially created observer
      }

      return () => {
        if (observer && element) {
          observer.unobserve(element);
          observer.disconnect();
        }
      };
    }, [visibleCount, listings.length, threshold]);

    const visibleListings = listings.slice(0, visibleCount);
    const hasMore = visibleCount < listings.length;
    const preloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Preload primary images for the next batch of listings (debounced)
    useEffect(() => {
      if (!hasMore) return;

      // Clear previous timeout to debounce rapid scrolling
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }

      // Debounce preloading by 300ms to avoid excessive requests during rapid scroll
      preloadTimeoutRef.current = window.setTimeout(() => {
        const nextBatch = listings.slice(
          visibleCount,
          visibleCount + threshold
        );
        const imageUrls = nextBatch
          .map((listing) => listing.photos?.[0]?.photo_url)
          .filter((url): url is string => !!url);

        if (imageUrls.length > 0) {
          preloadImages(imageUrls);
        }
      }, 300);

      return () => {
        if (preloadTimeoutRef.current) {
          clearTimeout(preloadTimeoutRef.current);
        }
      };
    }, [visibleCount, listings, threshold, hasMore]);

    const containerClassName =
      layout === "grid"
        ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        : "space-y-4";

    // Cached ref callbacks to ensure stable references per ID
    const itemRefCallbacks = useRef<
      Map<string, (el: HTMLDivElement | null) => void>
    >(new Map());
    const onItemRefRef = useRef(onItemRef);

    // Keep onItemRef ref updated
    useEffect(() => {
      onItemRefRef.current = onItemRef;
    }, [onItemRef]);

    // Clean up stale callbacks when listings change
    useEffect(() => {
      const currentIds = new Set(listings.map((l) => l.id));
      
      // Remove callbacks for IDs that are no longer in listings
      for (const id of itemRefCallbacks.current.keys()) {
        if (!currentIds.has(id)) {
          itemRefCallbacks.current.delete(id);
          itemRefsMap.current.delete(id);
        }
      }
    }, [listings]);

    // Get or create a stable ref callback for a given ID
    const getItemRef = useCallback((id: string) => {
      let callback = itemRefCallbacks.current.get(id);
      if (!callback) {
        callback = (el: HTMLDivElement | null) => {
          if (el) {
            itemRefsMap.current.set(id, el);
          } else {
            itemRefsMap.current.delete(id);
          }
          onItemRefRef.current?.(id, el);
        };
        itemRefCallbacks.current.set(id, callback);
      }
      return callback;
    }, []);

    // Expose scrollToItem and getItemIndex via ref
    useImperativeHandle(
      ref,
      () => ({
        scrollToItem: (id: string, behavior: ScrollBehavior = "smooth") => {
          const el = itemRefsMap.current.get(id);
          if (el) {
            el.scrollIntoView({ behavior, block: "nearest" });
            return true;
          }
          // Item not currently rendered - expand visible count to include it
          const index = listings.findIndex((l) => l.id === id);
          if (index !== -1 && index >= visibleCount) {
            // Expand visible count to include this item, then scroll after render
            setVisibleCount(Math.min(index + threshold, listings.length));
            // Return false to indicate caller should retry after render
            return false;
          }
          return false;
        },
        getItemIndex: (id: string) => {
          return listings.findIndex((l) => l.id === id);
        },
      }),
      [listings, visibleCount, threshold]
    );

    return (
      <>
        <div className={cn(containerClassName, className)} role="listbox">
          {visibleListings.map((listing) => {
            const isSelected = selectedListingId === listing.id;
            return (
              <div
                key={listing.id}
                ref={getItemRef(listing.id)}
                role="option"
                aria-selected={isSelected}
              >
                <ListingCard
                  listing={listing}
                  onOpen={onOpenListing}
                  className={cn(isSelected && "ring-2 ring-primary")}
                />
              </div>
            );
          })}
        </div>

        {/* Sentinel element for intersection observer */}
        {hasMore && (
          <div ref={sentinelRef} className="mt-6">
            <div className={containerClassName}>
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}
      </>
    );
  }
);

VirtualListingGridInner.displayName = "VirtualListingGrid";

// Memoize to avoid unnecessary re-renders for expensive large-list renders
const VirtualListingGrid = memo(VirtualListingGridInner);

export default VirtualListingGrid;
