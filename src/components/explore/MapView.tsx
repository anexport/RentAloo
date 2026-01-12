import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import type { Listing } from "@/components/equipment/services/listings";
import {
  loadGoogleMaps,
  importMarkerLibrary,
  geocodeAddress,
} from "@/lib/googleMapsLoader";
import { cn } from "@/lib/utils";

type Props = {
  listings: Listing[];
  selectedListingId?: string | null;
  onSelectListing?: (listing: Listing) => void;
  onOpenListing?: (listing: Listing) => void;
  className?: string;
  isMobile?: boolean;
};

type MapState = "loading" | "ready" | "error" | "no-api-key";

type MarkerEntry = {
  listing: Listing;
  marker: google.maps.marker.AdvancedMarkerElement;
  coords: { lat: number; lng: number };
  clickListener: google.maps.MapsEventListener;
};

// Default center: Italy
const ITALY_CENTER = { lat: 42.5, lng: 12.5 };
const ITALY_ZOOM = 6;

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const MapView = ({
  listings,
  selectedListingId,
  onSelectListing,
  onOpenListing,
  className,
  isMobile,
}: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  // Cache for geocoded location text -> coordinates
  const geocodeCacheRef = useRef<
    Map<string, { lat: number; lng: number } | null>
  >(new Map());
  const markerLibraryRef = useRef<{
    AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
    PinElement: typeof google.maps.marker.PinElement;
  } | null>(null);
  // Track previous listing IDs to detect actual listing changes (not just selection changes)
  const prevListingIdsRef = useRef<string>("");
  const [mapState, setMapState] = useState<MapState>("loading");
  const [isGeocoding, setIsGeocoding] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  // Get listings that can be placed on map (have coords OR text location)
  const listingsForMap = useMemo(() => {
    return listings.filter(
      (l) =>
        // Has valid coordinates
        (typeof l.latitude === "number" &&
          typeof l.longitude === "number" &&
          Number.isFinite(l.latitude) &&
          Number.isFinite(l.longitude)) ||
        // OR has a text location that can be geocoded
        (typeof l.location === "string" && l.location.trim().length > 0)
    );
  }, [listings]);

  const hasMapMarkers = listingsForMap.length > 0;

  // Helper to get coordinates for a listing (from data or geocode cache)
  const getListingCoords = useCallback(
    async (listing: Listing): Promise<{ lat: number; lng: number } | null> => {
      // If listing has coordinates, use them
      if (
        typeof listing.latitude === "number" &&
        typeof listing.longitude === "number" &&
        Number.isFinite(listing.latitude) &&
        Number.isFinite(listing.longitude)
      ) {
        return { lat: listing.latitude, lng: listing.longitude };
      }

      // Otherwise, try to geocode the text location
      const locationText = listing.location?.trim();
      if (!locationText || !apiKey) return null;

      // Check cache first
      if (geocodeCacheRef.current.has(locationText)) {
        return geocodeCacheRef.current.get(locationText) ?? null;
      }

      // Geocode and cache
      try {
        const coords = await geocodeAddress(locationText, apiKey);
        geocodeCacheRef.current.set(locationText, coords);
        return coords;
      } catch (err) {
        console.warn(`Failed to geocode "${locationText}":`, err);
        geocodeCacheRef.current.set(locationText, null);
        return null;
      }
    },
    [apiKey]
  );

  const computeInitialCenter = useCallback(async (): Promise<{
    lat: number;
    lng: number;
  }> => {
    // Try to get coords from first listing (with geocoding if needed)
    if (listingsForMap.length > 0) {
      const firstCoords = await getListingCoords(listingsForMap[0]);
      if (firstCoords) return firstCoords;
    }
    return ITALY_CENTER;
  }, [listingsForMap, getListingCoords]);

  const getMarkerLibrary = useCallback(async () => {
    if (markerLibraryRef.current) return markerLibraryRef.current;
    try {
      const lib = await importMarkerLibrary();
      markerLibraryRef.current = lib;
      return lib;
    } catch (error) {
      console.error("Failed to import Google Maps marker library:", error);
      throw error;
    }
  }, []);

  const createInfoWindowContent = useCallback((listing: Listing) => {
    const safeTitle = escapeHtml(listing.title);
    const safeLocation = escapeHtml(listing.location);
    const photoUrl = listing.photos?.[0]?.photo_url;
    const conditionText = listing.condition;

    // Calculate average rating from reviews
    const reviews = listing.reviews ?? [];
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // Detect dark mode - check if html element has 'dark' class
    const isDarkMode = document.documentElement.classList.contains("dark");

    // Theme-aware colors matching our Tailwind system
    const colors = isDarkMode
      ? {
          bg: "#09090b", // zinc-950
          card: "#18181b", // zinc-900
          border: "rgba(63, 63, 70, 0.5)", // zinc-700/50
          text: "#fafafa", // zinc-50
          textMuted: "#a1a1aa", // zinc-400
          shadow: "0 1px 3px 0 rgba(0, 0, 0, 0.5)",
          imageBg: "linear-gradient(135deg, #27272a 0%, #3f3f46 100%)", // zinc-800 to zinc-700
        }
      : {
          bg: "#ffffff",
          card: "#ffffff",
          border: "rgba(228, 228, 231, 0.6)", // zinc-200/60
          text: "#09090b", // zinc-950
          textMuted: "#71717a", // zinc-500
          shadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          imageBg: "linear-gradient(135deg, #f4f4f5 0%, #e4e4e7 100%)", // zinc-100 to zinc-200
        };

    // Generate star rating HTML
    const renderStars = (rating: number) => {
      const stars = [];
      for (let i = 1; i <= 5; i++) {
        const fillPercentage = Math.min(
          100,
          Math.max(0, (rating - (i - 1)) * 100)
        );
        stars.push(`
          <div style="position: relative; width: 14px; height: 14px; display: inline-block;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${colors.textMuted}" stroke-width="2" style="position: absolute;">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <div style="position: absolute; top: 0; left: 0; width: ${fillPercentage}%; height: 100%; overflow: hidden;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
          </div>
        `);
      }
      return stars.join(" ");
    };

    // Card matching ListingCard component
    return `
      <div style="
        width: 280px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; 
        background: ${colors.card};
        border: 1px solid ${colors.border};
        border-radius: 12px;
        overflow: hidden;
        box-shadow: ${colors.shadow};
      ">
        <!-- Image with 4:3 aspect ratio -->
        <div style="
          position: relative;
          width: 100%;
          height: 210px;
          background: ${colors.imageBg};
          overflow: hidden;
        ">
          ${
            photoUrl
              ? `
            <img 
              src="${escapeHtml(photoUrl)}" 
              alt="${safeTitle}" 
              style="width: 100%; height: 100%; object-fit: cover; display: block;" 
            />
          `
              : `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: ${colors.textMuted};">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${colors.textMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5; margin-bottom: 8px;">
                <rect x="3" y="8" width="18" height="12" rx="2"/>
                <path d="M10 8V5a2 2 0 0 1 4 0v3"/>
              </svg>
              <span style="font-size: 13px;">No Image</span>
            </div>
          `
          }
          
          <!-- Close button (matching wishlist button style) -->
          <button
            data-close-infowindow="true"
            style="
              position: absolute;
              top: 8px;
              right: 8px;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: ${
                isDarkMode
                  ? "rgba(39, 39, 42, 0.9)"
                  : "rgba(255, 255, 255, 0.95)"
              };
              border: 1px solid ${
                isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
              };
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
              backdrop-filter: blur(10px);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
              z-index: 10;
            "
            onmouseover="this.style.transform='scale(1.1)';"
            onmouseout="this.style.transform='scale(1)';"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${
              isDarkMode ? "#fafafa" : "#18181b"
            }" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div style="padding: 12px 16px 16px;">
          <!-- Title and Rating Row -->
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 6px;">
            <h3 style="font-weight: 600; font-size: 15px; color: ${
              colors.text
            }; line-height: 1.4; margin: 0; flex: 1; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${safeTitle}</h3>
            
            ${
              avgRating > 0
                ? `
              <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                ${renderStars(avgRating)}
              </div>
            `
                : `
              <span style="font-size: 13px; color: ${colors.textMuted}; flex-shrink: 0;">New</span>
            `
            }
          </div>

          <!-- Location -->
          <p style="font-size: 14px; color: ${
            colors.textMuted
          }; margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeLocation}</p>

          <!-- Category and Condition -->
          ${
            listing.category?.name || conditionText
              ? `
            <p style="font-size: 14px; color: ${
              colors.textMuted
            }; margin: 0 0 8px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${[listing.category?.name || "", conditionText || ""]
                .filter(Boolean)
                .join(" · ")}
            </p>
          `
              : ""
          }

          <!-- Price and Button -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
            <div style="font-size: 14px; color: ${colors.text};">
              <span style="font-weight: 600; tabular-nums;">$${
                listing.daily_rate
              }</span>
              <span style="color: ${
                colors.textMuted
              }; margin-left: 2px;">/day</span>
            </div>
            
            <button 
              data-listing-id="${listing.id}" 
              style="padding: 8px 16px; background: ${
                isDarkMode ? "#fafafa" : "#18181b"
              }; color: ${
      isDarkMode ? "#18181b" : "#fafafa"
    }; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s ease;"
              onmouseover="this.style.opacity='0.9';"
              onmouseout="this.style.opacity='1';"
            >
              View
            </button>
          </div>
        </div>
      </div>
    `;
  }, []);

  const openInfoWindowForListing = useCallback(
    (entry: MarkerEntry) => {
      if (!mapInstanceRef.current) return;
      if (!infoWindowRef.current) {
        infoWindowRef.current = new google.maps.InfoWindow();
      }

      infoWindowRef.current.setContent(createInfoWindowContent(entry.listing));
      infoWindowRef.current.open({
        anchor: entry.marker,
        map: mapInstanceRef.current,
      });

      google.maps.event.addListenerOnce(
        infoWindowRef.current,
        "domready",
        () => {
          // Remove default InfoWindow styling (white background, padding, border)
          const infoWindowContainer = document.querySelector(".gm-style-iw-c");
          const infoWindowContent = document.querySelector(".gm-style-iw-d");
          const closeButton = document.querySelector(".gm-ui-hover-effect");

          if (infoWindowContainer) {
            (infoWindowContainer as HTMLElement).style.background =
              "transparent";
            (infoWindowContainer as HTMLElement).style.boxShadow = "none";
            (infoWindowContainer as HTMLElement).style.padding = "0";
            (infoWindowContainer as HTMLElement).style.borderRadius = "12px";
            (infoWindowContainer as HTMLElement).style.overflow = "visible";
          }

          if (infoWindowContent) {
            (infoWindowContent as HTMLElement).style.overflow = "visible";
            (infoWindowContent as HTMLElement).style.padding = "0";
            (infoWindowContent as HTMLElement).style.maxHeight = "none";
          }

          // Hide the default close button completely
          if (closeButton) {
            (closeButton as HTMLElement).style.display = "none";
          }

          // Attach custom close button handler
          const customCloseButton = document.querySelector<HTMLButtonElement>(
            '[data-close-infowindow="true"]'
          );
          if (customCloseButton) {
            customCloseButton.onclick = () => {
              infoWindowRef.current?.close();
            };
          }

          // Attach View button click handler
          const button = document.querySelector<HTMLButtonElement>(
            `button[data-listing-id="${entry.listing.id}"]`
          );
          if (button) {
            button.onclick = () => onOpenListing?.(entry.listing);
          }
        }
      );
    },
    [createInfoWindowContent, onOpenListing]
  );

  const initializeMap = useCallback(async () => {
    if (!apiKey) {
      setMapState("no-api-key");
      return;
    }
    if (!mapRef.current) return;

    try {
      await loadGoogleMaps({
        apiKey,
        libraries: ["places", "marker"],
      });
      await getMarkerLibrary();

      const center = await computeInitialCenter();
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: ITALY_ZOOM,
        minZoom: 5, // Prevent zooming out beyond country level
        mapId: "explore-map",

        // Use "greedy" on mobile for native full-screen feel (single-finger pan/zoom)
        // Use "cooperative" on desktop to preserve normal page scrolling (requires Ctrl/Cmd+scroll to zoom)
        gestureHandling: isMobile ? "greedy" : "cooperative",

        // UI Controls - hide zoom on mobile
        disableDefaultUI: false,
        zoomControl: !isMobile,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,

        // Additional native-feel options
        clickableIcons: false, // Prevent accidental POI clicks
        keyboardShortcuts: !isMobile, // Disable keyboard shortcuts on mobile
      });

      mapInstanceRef.current = map;
      setMapState("ready");
    } catch (error) {
      console.error("Failed to initialize Explore map:", error);
      setMapState("error");
    }
  }, [apiKey, computeInitialCenter, getMarkerLibrary, isMobile]);

  useEffect(() => {
    if (mapState === "loading") {
      void initializeMap();
    }
  }, [initializeMap, mapState]);

  // Sync markers with listings (with cancellation for cleanup)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const map = mapInstanceRef.current;
      if (!map || mapState !== "ready") return;

      // Remove markers that no longer exist
      const nextIds = new Set(listingsForMap.map((l) => l.id));
      for (const [id, entry] of markersRef.current.entries()) {
        if (!nextIds.has(id)) {
          entry.clickListener.remove();
          entry.marker.map = null;
          markersRef.current.delete(id);
        }
      }

      // Collect all coordinates (geocoding as needed)
      if (!cancelled) setIsGeocoding(true);
      const listingCoordsMap = new Map<string, { lat: number; lng: number }>();
      await Promise.all(
        listingsForMap.map(async (listing) => {
          const coords = await getListingCoords(listing);
          if (coords) {
            listingCoordsMap.set(listing.id, coords);
          }
        })
      );
      if (cancelled) return;
      setIsGeocoding(false);

      // Add/update markers
      for (const listing of listingsForMap) {
        if (cancelled) return;
        const coords = listingCoordsMap.get(listing.id);
        if (!coords) continue;

        const existing = markersRef.current.get(listing.id);
        if (existing) {
          existing.coords = coords;
          existing.listing = listing;
          existing.marker.position = coords;
          existing.marker.title = listing.title;
          continue;
        }

        const { AdvancedMarkerElement, PinElement } = await getMarkerLibrary();
        const isSelected = listing.id === selectedListingId;
        const pin = new PinElement({
          background: isSelected ? "#2563eb" : "#ef4444",
          borderColor: isSelected ? "#1d4ed8" : "#b91c1c",
          glyphColor: "#ffffff",
          scale: isSelected ? 1.3 : 1.1,
        });
        const marker = new AdvancedMarkerElement({
          map,
          position: coords,
          title: listing.title,
          content: pin.element,
        });

        const clickListener = marker.addListener("click", () => {
          onSelectListing?.(listing);
          openInfoWindowForListing({
            listing,
            marker,
            coords,
            clickListener,
          } as MarkerEntry);
        });

        markersRef.current.set(listing.id, {
          listing,
          marker,
          coords,
          clickListener,
        });
      }

      if (listingCoordsMap.size === 0) {
        infoWindowRef.current?.close();
        return;
      }

      // Only fit bounds when listings actually change (not on callback/selection changes)
      const currentListingIds = listingsForMap
        .map((l) => l.id)
        .sort()
        .join(",");
      const listingsChanged = prevListingIdsRef.current !== currentListingIds;

      if (listingsChanged) {
        prevListingIdsRef.current = currentListingIds;

        // Fit bounds to markers when listings change
        const bounds = new google.maps.LatLngBounds();
        listingCoordsMap.forEach((coords) => bounds.extend(coords));
        map.fitBounds(bounds, 64);

        // Ensure we don't zoom out beyond Italy view
        google.maps.event.addListenerOnce(map, "idle", () => {
          const currentZoom = map.getZoom();
          if (currentZoom !== undefined && currentZoom < ITALY_ZOOM) {
            map.setZoom(ITALY_ZOOM);
            map.setCenter(ITALY_CENTER);
          }
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // Note: selectedListingId is intentionally NOT included in dependencies here.
    // Including it would cause fitBounds() to reset the map view on every selection change.
    // Selection changes are handled by the separate effect below (lines 349-377).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    getMarkerLibrary,
    getListingCoords,
    listingsForMap,
    mapState,
    onSelectListing,
    openInfoWindowForListing,
  ]);

  // Update marker styling + pan to selected listing
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapState !== "ready") return;

    const updatePins = async () => {
      const { PinElement } = await getMarkerLibrary();
      for (const [id, entry] of markersRef.current.entries()) {
        const isSelected = id === selectedListingId;
        const pin = new PinElement({
          background: isSelected ? "#2563eb" : "#ef4444",
          borderColor: isSelected ? "#1d4ed8" : "#b91c1c",
          glyphColor: "#ffffff",
          scale: isSelected ? 1.3 : 1.1,
        });
        entry.marker.content = pin.element;
      }

      if (selectedListingId) {
        const selectedEntry = markersRef.current.get(selectedListingId);
        if (selectedEntry) {
          map.panTo(selectedEntry.coords);
          map.setZoom(Math.max(map.getZoom() ?? 12, 14));
          openInfoWindowForListing(selectedEntry);
        }
      }
    };

    void updatePins();
  }, [getMarkerLibrary, mapState, openInfoWindowForListing, selectedListingId]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      for (const entry of markersRef.current.values()) {
        entry.clickListener.remove();
        entry.marker.map = null;
      }
      markersRef.current.clear();
      if (mapInstanceRef.current) {
        google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (mapState === "no-api-key") {
    return (
      <div
        className={cn(
          "h-full w-full bg-muted flex flex-col items-center justify-center text-center p-6",
          className
        )}
      >
        <MapPin className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground max-w-md">
          Map is unavailable. Set <code>VITE_GOOGLE_MAPS_API_KEY</code> to
          enable the interactive map.
        </p>
      </div>
    );
  }

  if (mapState === "error") {
    return (
      <div
        className={cn(
          "h-full w-full bg-muted flex flex-col items-center justify-center text-center p-6",
          className
        )}
      >
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load map.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      {mapState === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div
        ref={mapRef}
        className="h-full w-full"
        role="application"
        aria-label="Map showing available equipment"
      />
      {mapState === "ready" && isGeocoding && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading locations...
            </p>
          </div>
        </div>
      )}
      {mapState === "ready" && !hasMapMarkers && !isGeocoding && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/70 z-10">
          <p className="text-sm text-muted-foreground">
            No listings with map coordinates.
          </p>
        </div>
      )}
    </div>
  );
};

export default MapView;
