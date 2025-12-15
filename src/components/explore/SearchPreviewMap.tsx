/// <reference types="google.maps" />
import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";
import {
  loadGoogleMaps,
  importMarkerLibrary,
  geocodeAddress,
} from "@/lib/googleMapsLoader";
import { cn } from "@/lib/utils";
import type { Listing } from "@/components/equipment/services/listings";
import { Button } from "@/components/ui/button";

type Props = {
  location: string | null;
  listings: Listing[];
  onSelectListing?: (listing: Listing) => void;
  onOpenListing?: (listing: Listing) => void;
  onUseCurrentLocation?: () => void;
  isLocating?: boolean;
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

/**
 * Interactive map for the mobile search sheet.
 * Shows equipment listings as pins with mini previews.
 */
const SearchPreviewMap = ({
  location,
  listings,
  onSelectListing,
  onOpenListing,
  onUseCurrentLocation,
  isLocating = false,
  className,
}: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const markerLibraryRef = useRef<{
    AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
    PinElement: typeof google.maps.marker.PinElement;
  } | null>(null);
  const [mapState, setMapState] = useState<MapState>("loading");

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  // Get listings with coordinates
  const listingsWithCoords = listings.filter(
    (l) =>
      typeof l.latitude === "number" &&
      typeof l.longitude === "number" &&
      Number.isFinite(l.latitude) &&
      Number.isFinite(l.longitude)
  );

  const getMarkerLibrary = useCallback(async () => {
    if (markerLibraryRef.current) return markerLibraryRef.current;
    try {
      const lib = await importMarkerLibrary();
      markerLibraryRef.current = lib;
      return lib;
    } catch (error) {
      console.error("Failed to import marker library:", error);
      throw error;
    }
  }, []);

  const createInfoWindowContent = useCallback((listing: Listing) => {
    const safeTitle = escapeHtml(listing.title);
    const safeLocation = escapeHtml(listing.location);
    const photoUrl = listing.photos?.[0]?.photo_url;

    return `
      <div style="max-width: 200px; font-family: system-ui, -apple-system, sans-serif;">
        ${
          photoUrl
            ? `<img src="${escapeHtml(
                photoUrl
              )}" alt="${safeTitle}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />`
            : ""
        }
        <div style="font-weight: 600; font-size: 13px; color: #111; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeTitle}</div>
        <div style="font-size: 11px; color: #666; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeLocation}</div>
        <div style="font-size: 13px; font-weight: 700; color: #111;">$${listing.daily_rate}/day</div>
      </div>
    `;
  }, []);

  const initializeMap = useCallback(async () => {
    if (!apiKey) {
      setMapState("no-api-key");
      return;
    }
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      await loadGoogleMaps({
        apiKey,
        libraries: ["places", "marker"],
      });
      await getMarkerLibrary();

      const map = new google.maps.Map(mapRef.current, {
        center: ITALY_CENTER,
        zoom: ITALY_ZOOM,
        mapId: "search-interactive-map",
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_CENTER,
        },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy", // Allow pan/zoom
        clickableIcons: false,
      });

      mapInstanceRef.current = map;
      setMapState("ready");
    } catch (error) {
      console.error("Failed to initialize interactive map:", error);
      setMapState("error");
    }
  }, [apiKey, getMarkerLibrary]);

  // Initialize map on mount
  useEffect(() => {
    if (mapState === "loading") {
      void initializeMap();
    }
  }, [initializeMap, mapState]);

  // Sync markers with listings
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapState !== "ready") return;

    const syncMarkers = async () => {
      // Remove markers that no longer exist
      const nextIds = new Set(listingsWithCoords.map((l) => l.id));
      for (const [id, entry] of markersRef.current.entries()) {
        if (!nextIds.has(id)) {
          entry.clickListener.remove();
          entry.marker.map = null;
          markersRef.current.delete(id);
        }
      }

      // Add/update markers
      for (const listing of listingsWithCoords) {
        const coords = { lat: listing.latitude!, lng: listing.longitude! };
        const existing = markersRef.current.get(listing.id);
        
        if (existing) {
          existing.coords = coords;
          existing.listing = listing;
          existing.marker.position = coords;
          continue;
        }

        try {
          const { AdvancedMarkerElement, PinElement } = await getMarkerLibrary();
          const pin = new PinElement({
            background: "#ef4444",
            borderColor: "#b91c1c",
            glyphColor: "#ffffff",
            scale: 0.9,
          });
          
          const marker = new AdvancedMarkerElement({
            map,
            position: coords,
            title: listing.title,
            content: pin.element,
          });

          const clickListener = marker.addListener("click", () => {
            onSelectListing?.(listing);
            
            // Show info window
            if (!infoWindowRef.current) {
              infoWindowRef.current = new google.maps.InfoWindow();
            }
            infoWindowRef.current.setContent(createInfoWindowContent(listing));
            infoWindowRef.current.open({ anchor: marker, map });

            // Handle "View" click in info window
            google.maps.event.addListenerOnce(infoWindowRef.current, "domready", () => {
              const viewBtn = document.querySelector<HTMLButtonElement>(
                `button[data-listing-id="${listing.id}"]`
              );
              if (viewBtn) {
                viewBtn.onclick = () => onOpenListing?.(listing);
              }
            });
          });

          markersRef.current.set(listing.id, {
            listing,
            marker,
            coords,
            clickListener,
          });
        } catch (err) {
          console.error("Failed to create marker:", err);
        }
      }

      // Fit bounds to markers if we have any
      if (listingsWithCoords.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        listingsWithCoords.forEach((l) => {
          bounds.extend({ lat: l.latitude!, lng: l.longitude! });
        });
        map.fitBounds(bounds, { top: 60, bottom: 60, left: 20, right: 20 });
      }
    };

    void syncMarkers();
  }, [listingsWithCoords, mapState, getMarkerLibrary, createInfoWindowContent, onSelectListing, onOpenListing]);

  // Pan to location when selected
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapState !== "ready" || !location || !apiKey) return;

    let cancelled = false;

    const panToLocation = async () => {
      const coords = await geocodeAddress(location, apiKey);
      if (cancelled || !coords) return;
      map.panTo(coords);
      map.setZoom(12);
    };

    void panToLocation();

    return () => {
      cancelled = true;
    };
  }, [location, mapState, apiKey]);

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
          "relative bg-muted flex items-center justify-center",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">Map unavailable</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Loading overlay */}
      {mapState === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Error state */}
      {mapState === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <p className="text-sm text-muted-foreground">Failed to load map</p>
        </div>
      )}

      {/* Map container */}
      <div ref={mapRef} className="h-full w-full" aria-label="Equipment map" />

      {/* Current Location FAB */}
      {onUseCurrentLocation && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-3 right-3 h-10 w-10 rounded-full shadow-lg bg-background/95 backdrop-blur-sm z-20"
          onClick={onUseCurrentLocation}
          disabled={isLocating}
          aria-label="Use current location"
        >
          <Crosshair className={cn("h-5 w-5", isLocating && "animate-pulse")} />
        </Button>
      )}

      {/* Listings count badge */}
      {mapState === "ready" && listingsWithCoords.length > 0 && (
        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm z-20">
          <p className="text-xs font-medium">
            {listingsWithCoords.length} available
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchPreviewMap;
