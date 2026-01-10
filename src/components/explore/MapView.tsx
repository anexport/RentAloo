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

    // Calculate average rating from reviews
    const reviews = listing.reviews ?? [];
    const avgRating =
      reviews.length > 0
        ? (
            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          ).toFixed(1)
        : null;

    // Google Maps iOS-style info window: larger radius, cleaner design
    return `
      <div style="min-width: 280px; max-width: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 0;">
        ${
          photoUrl
            ? `<img src="${escapeHtml(
                photoUrl
              )}" alt="${safeTitle}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 16px 16px 0 0; display: block;" />`
            : ""
        }
        <div style="padding: 14px 16px 16px;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 6px;">
            <div style="font-weight: 600; font-size: 16px; color: #1f2937; line-height: 1.35; flex: 1; min-width: 0;">${safeTitle}</div>
            ${
              avgRating
                ? `<div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0; background: #fef9c3; padding: 4px 8px; border-radius: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#eab308" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span style="font-size: 13px; font-weight: 600; color: #854d0e;">${avgRating}</span>
            </div>`
                : ""
            }
          </div>
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px; display: flex; align-items: center; gap: 5px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeLocation}</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <div style="font-size: 20px; font-weight: 700; color: #111827;">$${
              listing.daily_rate
            }<span style="font-size: 13px; font-weight: 400; color: #6b7280;">/day</span></div>
            <button data-listing-id="${
              listing.id
            }" style="flex-shrink: 0; min-height: 44px; padding: 10px 20px; background: #111827; color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; transition: background 0.15s;">
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
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "cooperative",
      });

      mapInstanceRef.current = map;
      setMapState("ready");
    } catch (error) {
      console.error("Failed to initialize Explore map:", error);
      setMapState("error");
    }
  }, [apiKey, computeInitialCenter, getMarkerLibrary]);

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
