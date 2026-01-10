import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Navigation, Loader2, Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAddressAutocomplete } from "@/features/location/useAddressAutocomplete";
import {
  getCurrentPosition,
  GeolocationError,
} from "@/features/location/useGeolocation";
import { reverseGeocodeGoogle } from "@/features/location/providers/google";
import SmartTip from "../components/SmartTip";
import type { WizardFormData } from "../hooks/useListingWizard";

interface LocationStepProps {
  formData: WizardFormData;
  onUpdate: <K extends keyof WizardFormData>(
    field: K,
    value: WizardFormData[K]
  ) => void;
}

export default function LocationStep({
  formData,
  onUpdate,
}: LocationStepProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mapImageFailed, setMapImageFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isInitialized = useRef(false);

  const { query, setQuery, suggestions, loading, error } =
    useAddressAutocomplete({
      limit: 5,
      debounceMs: 300,
      includeFullAddress: true, // Show full street addresses, not just city names
    });

  // Sync location field with query
  useEffect(() => {
    if (formData.location && !isInitialized.current) {
      setQuery(formData.location);
      isInitialized.current = true;
    }
  }, [formData.location, setQuery]);

  // Reset map preview error when coordinates change
  useEffect(() => {
    setMapImageFailed(false);
  }, [formData.latitude, formData.longitude]);

  const handleSelectSuggestion = (suggestion: {
    label: string;
    lat: number;
    lon: number;
  }) => {
    onUpdate("location", suggestion.label);
    onUpdate("latitude", suggestion.lat);
    onUpdate("longitude", suggestion.lon);
    setQuery(suggestion.label);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onUpdate("location", value);
    setIsOpen(true);
    setSelectedIndex(-1);
    // Clear coordinates when manually typing
    if (formData.latitude || formData.longitude) {
      onUpdate("latitude", "");
      onUpdate("longitude", "");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleUseCurrentLocation = useCallback(async () => {
    setGeoLoading(true);
    setGeoError(null);
    try {
      const position = await getCurrentPosition();
      onUpdate("latitude", position.lat);
      onUpdate("longitude", position.lon);

      // Reverse geocode to get the address
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const result = await reverseGeocodeGoogle(position.lat, position.lon, {
          apiKey,
          language: navigator.language,
        });
        if (result?.label) {
          onUpdate("location", result.label);
          setQuery(result.label);
          return;
        }
      }

      const fallbackLocation = `${position.lat.toFixed(
        4
      )}, ${position.lon.toFixed(4)}`;
      onUpdate("location", fallbackLocation);
      setQuery(fallbackLocation);
    } catch (err) {
      if (err instanceof GeolocationError) {
        setGeoError(err.message);
      } else {
        setGeoError("Failed to get location");
      }
    } finally {
      setGeoLoading(false);
    }
  }, [onUpdate, setQuery]);

  const hasValidCoordinates =
    formData.latitude !== "" &&
    formData.longitude !== "" &&
    typeof formData.latitude === "number" &&
    typeof formData.longitude === "number";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Where is your equipment?
        </h2>
        <p className="text-muted-foreground">
          Enter your location so renters can find equipment near them. Your
          exact address won't be shown publicly.
        </p>
      </div>

      {/* Location Input with Autocomplete */}
      <div className="space-y-4">
        <Label htmlFor="location" className="text-base font-medium">
          Location
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <Input
            ref={inputRef}
            id="location"
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Enter city, neighborhood, or address"
            className="pl-10 pr-10 h-12 text-base"
            autoComplete="off"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
          )}
          {!loading && hasValidCoordinates && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
          )}

          {/* Autocomplete Dropdown */}
          {isOpen && suggestions.length > 0 && (
            <ul
              ref={listRef}
              className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg overflow-hidden"
              role="listbox"
            >
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.id}
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                    index === selectedIndex
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-muted"
                  )}
                  onMouseDown={() => handleSelectSuggestion(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{suggestion.label}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Error State */}
          {error && isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-destructive/50 rounded-lg shadow-lg p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Use Current Location Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          disabled={geoLoading}
          className="w-full sm:w-auto"
        >
          {geoLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 mr-2" />
          )}
          Use my current location
        </Button>

        {geoError && (
          <p className="text-sm text-destructive">
            {geoError === "User denied Geolocation"
              ? "Location access was denied. Please enable location services or enter manually."
              : geoError}
          </p>
        )}
      </div>

      {/* Map Preview */}
      {hasValidCoordinates && (
        <div className="space-y-3">
          <Label className="text-base font-medium">Location preview</Label>
          <div className="aspect-video rounded-lg overflow-hidden border bg-muted relative">
            {/* Google Maps Static API */}
            {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${
                  formData.latitude
                },${
                  formData.longitude
                }&zoom=15&size=600x340&scale=2&maptype=roadmap&markers=color:red%7C${
                  formData.latitude
                },${formData.longitude}&key=${
                  import.meta.env.VITE_GOOGLE_MAPS_API_KEY
                }`}
                alt="Location map preview"
                className={cn(
                  "w-full h-full object-cover",
                  mapImageFailed && "hidden"
                )}
                onLoad={() => setMapImageFailed(false)}
                onError={() => setMapImageFailed(true)}
              />
            ) : null}
            {/* Fallback if no API key or image fails */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-muted transition-opacity",
                import.meta.env.VITE_GOOGLE_MAPS_API_KEY && !mapImageFailed
                  ? "opacity-0"
                  : "opacity-100"
              )}
            >
              <div className="text-center text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{formData.location}</p>
                <p className="text-xs">
                  {Number(formData.latitude).toFixed(4)},{" "}
                  {Number(formData.longitude).toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Tip */}
      <SmartTip variant="info">
        <strong>Privacy note:</strong> Your exact address is never shown to
        renters. They'll only see your general area until a booking is
        confirmed.
      </SmartTip>

      {/* Location Tips */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-medium text-foreground mb-3">Location tips:</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>
              Use your neighborhood or district for better local visibility
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>
              Accurate coordinates help renters estimate travel distance
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>You can arrange specific pickup details after booking</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
