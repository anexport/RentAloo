import { useState, memo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  ArrowUpDown,
  X,
  Navigation,
  Crosshair,
  Loader2,
  Clock,
  ChevronDown,
} from "lucide-react";
import type { FilterValues } from "@/components/explore/FiltersSheet";
import type { SortOption } from "@/components/explore/ListingsGridHeader";
import FiltersSheet from "@/components/explore/FiltersSheet";
import CategorySheet from "@/components/explore/CategorySheet";
import { cn } from "@/lib/utils";
import { useAddressAutocomplete } from "@/features/location/useAddressAutocomplete";
import { useToast } from "@/hooks/useToast";
import { ToastAction } from "@/components/ui/toast";
import {
  getCurrentPosition,
  checkGeolocationSupport,
  type GeolocationErrorCode,
} from "@/features/location/useGeolocation";
import { reverseGeocode } from "@/features/location/geocoding";
import { highlightMatchingText } from "@/lib/highlightText";

// Recent locations storage
const RECENT_LOCATIONS_KEY = "vaymo_recent_locations";
const MAX_RECENT_LOCATIONS = 3;

const getRecentLocations = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_LOCATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addRecentLocation = (location: string) => {
  try {
    const recent = getRecentLocations();
    const filtered = recent.filter((s) => s !== location);
    const updated = [location, ...filtered].slice(0, MAX_RECENT_LOCATIONS);
    localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Failed to save recent location:", error);
    return [];
  }
};

type Props = {
  location: string;
  onLocationChange: (location: string) => void;
  categoryId: string;
  onCategoryChange: (id: string) => void;
  filterValues: FilterValues;
  onFilterChange: (values: FilterValues) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  activeFilterCount: number;
  resultCount: number;
};

// Glassmorphism base classes - matching filter/category pill styling
const GLASS_BASE =
  "bg-background/90 backdrop-blur-lg border border-white/20 dark:border-white/10 shadow-sm";
const GLASS_INTERACTIVE = "transition-all duration-150 active:scale-[0.98]";

// FAB styling - uses theme background
const FAB_STYLE =
  "bg-background border border-border shadow-[0_2px_6px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15),0_8px_24px_rgba(0,0,0,0.1)]";

const MobileMapOverlayControls = ({
  location,
  onLocationChange,
  categoryId,
  onCategoryChange,
  filterValues,
  onFilterChange,
  sortBy,
  onSortChange,
  activeFilterCount,
  resultCount,
}: Props) => {
  const { t } = useTranslation("equipment");
  const { toast } = useToast();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const addressAutocomplete = useAddressAutocomplete({
    limit: 6,
    minLength: 2,
    debounceMs: 150,
  });

  // Load recent locations on mount
  useEffect(() => {
    setRecentLocations(getRecentLocations());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsInputFocused(false);
      }
    };

    if (isInputFocused) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isInputFocused]);

  const handleLocationSelect = (selectedLocation: string) => {
    onLocationChange(selectedLocation);
    addressAutocomplete.setQuery("");
    setIsInputFocused(false);
    inputRef.current?.blur();
    // Save to recent locations
    const updated = addRecentLocation(selectedLocation);
    setRecentLocations(updated);
  };

  const handleClearLocation = () => {
    onLocationChange("");
    addressAutocomplete.setQuery("");
  };

  const handleUseCurrentLocation = async () => {
    if (isLocating) return;

    setIsLocating(true);

    try {
      const { lat, lon } = await getCurrentPosition();
      const controller = new AbortController();
      const label = await reverseGeocode(lat, lon, {
        signal: controller.signal,
        language: navigator.language || "en",
      });
      const place = label ?? "Near you";

      handleLocationSelect(place);

      toast({
        title: t("search_bar.location_set", { defaultValue: "Location set" }),
        description: t("search_bar.using_current_location", {
          defaultValue: "Using your current location.",
        }),
      });
    } catch (error) {
      const geolocationError = error as
        | GeolocationPositionError
        | { code?: number | GeolocationErrorCode; message?: string };
      const rawCode = geolocationError?.code;
      let errorCode: GeolocationErrorCode | undefined;
      if (typeof rawCode === "string") {
        errorCode = rawCode;
      } else if (typeof rawCode === "number") {
        const codeMap: Record<number, GeolocationErrorCode> = {
          1: "denied",
          2: "timeout",
          3: "unavailable",
        };
        errorCode = codeMap[rawCode];
      }
      const errorMessage = geolocationError?.message;

      switch (errorCode) {
        case "denied":
          toast({
            title: t("search_bar.location_denied", {
              defaultValue: "Location permission denied",
            }),
            description:
              errorMessage ||
              t("search_bar.location_denied_description", {
                defaultValue: "Allow location access in your browser settings.",
              }),
            variant: "destructive",
            action: (
              <ToastAction
                altText="Try again"
                onClick={() => void handleUseCurrentLocation()}
              >
                {t("common.try_again", { defaultValue: "Try Again" })}
              </ToastAction>
            ),
          });
          break;
        case "timeout":
          toast({
            title: t("search_bar.location_timeout", {
              defaultValue: "Location timeout",
            }),
            description:
              errorMessage ||
              t("search_bar.location_timeout_description", {
                defaultValue: "Couldn't get your location. Try again.",
              }),
            variant: "destructive",
          });
          break;
        case "insecure_origin": {
          const geoSupport = checkGeolocationSupport();
          toast({
            title: t("search_bar.location_unavailable", {
              defaultValue: "Location unavailable",
            }),
            description: `Location requires HTTPS. Current: ${geoSupport.protocol}//${geoSupport.hostname}`,
            variant: "destructive",
          });
          break;
        }
        default:
          toast({
            title: t("search_bar.location_error", {
              defaultValue: "Location error",
            }),
            description:
              errorMessage ||
              t("search_bar.location_error_description", {
                defaultValue: "Try entering a location manually.",
              }),
            variant: "destructive",
          });
      }
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <>
      {/* Search bar and controls - fixed at top like Google Maps */}
      <div
        className="absolute top-0 left-0 right-0 z-20"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 12px)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {/* Google Maps style search bar - compact pill */}
        <div className="px-4 pt-2 pb-3">
          <div className="flex items-center gap-2">
            {/* Main search input - Google Maps style */}
            <div className="flex-1 relative">
              <button
                type="button"
                onClick={() => {
                  setIsInputFocused(true);
                  addressAutocomplete.setQuery(location || "");
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className={cn(
                  "w-full flex items-center gap-3 h-12 px-4 rounded-full text-left",
                  GLASS_BASE,
                  GLASS_INTERACTIVE,
                  !isInputFocused && "cursor-pointer"
                )}
              >
                <Search className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  {location ? (
                    <>
                      <div className="text-sm font-medium text-foreground truncate">
                        {location}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("search_bar.search_equipment_hint", {
                          defaultValue: "Search equipment",
                        })}
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t("search_bar.where_placeholder", {
                        defaultValue: "Search here",
                      })}
                    </span>
                  )}
                </div>
                {location && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearLocation();
                    }}
                    className="h-6 w-6 rounded-full bg-muted/60 flex items-center justify-center shrink-0 hover:bg-muted"
                    aria-label={t("common.clear", { defaultValue: "Clear" })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </button>

              {/* Expanded search input */}
              {isInputFocused && (
                <div
                  className={cn(
                    "absolute inset-x-0 top-0 z-50",
                    "rounded-3xl overflow-hidden",
                    GLASS_BASE
                  )}
                >
                  <div className="flex items-center gap-3 h-12 px-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsInputFocused(false);
                        addressAutocomplete.setQuery("");
                      }}
                      className="h-8 w-8 -ml-1 rounded-full flex items-center justify-center hover:bg-muted"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={addressAutocomplete.query}
                      onChange={(e) =>
                        addressAutocomplete.setQuery(e.target.value)
                      }
                      placeholder={t("search_bar.where_placeholder", {
                        defaultValue: "Search here",
                      })}
                      className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
                      autoComplete="off"
                    />
                    {addressAutocomplete.loading && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Dropdown content */}
                  <div
                    ref={dropdownRef}
                    className="max-h-[50vh] overflow-y-auto border-t border-border/30"
                  >
                    {/* Use current location */}
                    <button
                      type="button"
                      onClick={() => void handleUseCurrentLocation()}
                      disabled={isLocating}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {isLocating ? (
                          <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        ) : (
                          <Navigation className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium">
                          {isLocating
                            ? t("search_bar.detecting_location", {
                                defaultValue: "Detecting...",
                              })
                            : t("search_bar.use_current_location", {
                                defaultValue: "Your location",
                              })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("search_bar.use_gps", { defaultValue: "Use GPS" })}
                        </div>
                      </div>
                    </button>

                    {/* Recent locations */}
                    {addressAutocomplete.query.trim().length < 2 &&
                      recentLocations.length > 0 && (
                        <>
                          <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {t("search_bar.recent", { defaultValue: "Recent" })}
                          </div>
                          {recentLocations.map((loc, idx) => (
                            <button
                              key={`recent-${idx}`}
                              type="button"
                              onClick={() => handleLocationSelect(loc)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                            >
                              <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <span className="text-sm text-foreground truncate">
                                {loc}
                              </span>
                            </button>
                          ))}
                        </>
                      )}

                    {/* Autocomplete suggestions */}
                    {addressAutocomplete.query.trim().length >= 2 && (
                      <>
                        {addressAutocomplete.suggestions.length > 0
                          ? addressAutocomplete.suggestions.map(
                              (suggestion) => (
                                <button
                                  key={suggestion.id}
                                  type="button"
                                  onClick={() =>
                                    handleLocationSelect(suggestion.label)
                                  }
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                                >
                                  <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                                    <MapPin className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                  <span className="text-sm text-foreground truncate">
                                    {highlightMatchingText(
                                      suggestion.label,
                                      addressAutocomplete.query
                                    )}
                                  </span>
                                </button>
                              )
                            )
                          : !addressAutocomplete.loading && (
                              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                {addressAutocomplete.error
                                  ? t("search_bar.error_loading", {
                                      defaultValue: "Error loading",
                                    })
                                  : t("search_bar.no_results", {
                                      defaultValue: "No results",
                                    })}
                              </div>
                            )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Category selector pill */}
            <CategorySheet
              activeCategoryId={categoryId}
              onCategoryChange={onCategoryChange}
            />

            {/* Filter button */}
            <FiltersSheet
              value={filterValues}
              onChange={onFilterChange}
              resultCount={resultCount}
              activeFilterCount={activeFilterCount}
            />

            {/* Sort button */}
            <Select
              value={sortBy}
              onValueChange={(value) => onSortChange(value as SortOption)}
            >
              <SelectTrigger
                className={cn(
                  "h-10 w-10 p-0 rounded-full [&>svg:last-child]:hidden justify-center",
                  GLASS_BASE
                )}
                aria-label={t("filters.sort_by")}
              >
                <ArrowUpDown className="h-4 w-4" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl">
                <SelectItem value="recommended">
                  {t("filters.recommended")}
                </SelectItem>
                <SelectItem value="price-low">
                  {t("filters.price_low_high")}
                </SelectItem>
                <SelectItem value="price-high">
                  {t("filters.price_high_low")}
                </SelectItem>
                <SelectItem value="newest">
                  {t("filters.newest_first")}
                </SelectItem>
                <SelectItem value="rating">
                  {t("filters.highest_rated")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Location FAB - Google Maps style, positioned above bottom sheet */}
      <Button
        variant="secondary"
        size="icon"
        onClick={() => void handleUseCurrentLocation()}
        disabled={isLocating}
        className={cn(
          "absolute z-30 h-12 w-12 rounded-full",
          "transition-all duration-200",
          "right-4 bottom-[180px]",
          FAB_STYLE
        )}
        style={{
          marginRight: "env(safe-area-inset-right)",
        }}
        aria-label={t("search_bar.use_current_location", {
          defaultValue: "Use current location",
        })}
      >
        {isLocating ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <Crosshair className="h-5 w-5 text-foreground" />
        )}
      </Button>

      {/* Backdrop when search is focused */}
      {isInputFocused && (
        <div
          className="fixed inset-0 z-10 bg-black/20 backdrop-blur-[2px]"
          onClick={() => {
            setIsInputFocused(false);
            addressAutocomplete.setQuery("");
          }}
        />
      )}
    </>
  );
};

export default memo(MobileMapOverlayControls);
