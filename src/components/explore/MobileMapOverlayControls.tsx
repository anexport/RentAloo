import { useState, memo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  ArrowUpDown,
  X,
  Layers,
  Crosshair,
  Loader2,
  Clock,
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

// Glassmorphism base classes for consistent styling
const GLASS_BASE = "bg-background/90 backdrop-blur-lg border border-white/20 dark:border-white/10 shadow-xl";
const GLASS_INTERACTIVE = "transition-all duration-200 active:scale-[0.98] hover:bg-background/95";

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
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
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

  // Handle animation states for smoother transitions
  useEffect(() => {
    if (!controlsVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [controlsVisible]);

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
      return () => document.removeEventListener("mousedown", handleClickOutside);
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
        description: t("search_bar.using_current_location", { defaultValue: "Using your current location." }),
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
            title: t("search_bar.location_denied", { defaultValue: "Location permission denied" }),
            description:
              errorMessage ||
              t("search_bar.location_denied_description", { defaultValue: "Allow location access in your browser settings." }),
            variant: "destructive",
            action: (
              <ToastAction altText="Try again" onClick={() => void handleUseCurrentLocation()}>
                {t("common.try_again", { defaultValue: "Try Again" })}
              </ToastAction>
            ),
          });
          break;
        case "timeout":
          toast({
            title: t("search_bar.location_timeout", { defaultValue: "Location timeout" }),
            description:
              errorMessage ||
              t("search_bar.location_timeout_description", { defaultValue: "Couldn't get your location. Try again." }),
            variant: "destructive",
          });
          break;
        case "insecure_origin": {
          const geoSupport = checkGeolocationSupport();
          toast({
            title: t("search_bar.location_unavailable", { defaultValue: "Location unavailable" }),
            description: `Location requires HTTPS. Current: ${geoSupport.protocol}//${geoSupport.hostname}`,
            variant: "destructive",
          });
          break;
        }
        default:
          toast({
            title: t("search_bar.location_error", { defaultValue: "Location error" }),
            description:
              errorMessage ||
              t("search_bar.location_error_description", { defaultValue: "Try entering a location manually." }),
            variant: "destructive",
          });
      }
    } finally {
      setIsLocating(false);
    }
  };

  const showDropdown = isInputFocused && (
    addressAutocomplete.query.trim().length >= 2 ||
    recentLocations.length > 0
  );

  return (
    <>
      {/* Main controls container - positioned at top with safe area */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-20",
          "transition-all duration-300 ease-out",
          controlsVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-full pointer-events-none"
        )}
        style={{ 
          paddingTop: "max(env(safe-area-inset-top), 12px)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {/* Top bar: Location input + Filter/Sort */}
        <div className="px-3 pt-2 pb-2">
          <div className="flex items-center gap-2">
            {/* Location input with autocomplete - glassmorphism style */}
            <div className="flex-1 relative">
              <div
                className={cn(
                  "flex items-center gap-3 min-h-[52px] px-4 py-2 rounded-3xl",
                  GLASS_BASE,
                  "shadow-[0_4px_20px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1)]",
                  isInputFocused && "ring-2 ring-primary/50"
                )}
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {addressAutocomplete.loading ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={isInputFocused ? addressAutocomplete.query : (location || "")}
                    onChange={(e) => addressAutocomplete.setQuery(e.target.value)}
                    onFocus={() => {
                      setIsInputFocused(true);
                      addressAutocomplete.setQuery(location || "");
                    }}
                    placeholder={t("search_bar.where_placeholder", { defaultValue: "Where to?" })}
                    className="w-full bg-transparent border-none outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground"
                    aria-label={t("search_bar.search_location_aria", { defaultValue: "Search location" })}
                    autoComplete="off"
                  />
                  {!isInputFocused && location && (
                    <span className="text-xs text-muted-foreground truncate block">
                      {t("search_bar.search_equipment_hint", { defaultValue: "Search equipment..." })}
                    </span>
                  )}
                </div>
                {location && !isInputFocused && (
                  <button
                    type="button"
                    onClick={handleClearLocation}
                    className="h-6 w-6 rounded-full bg-muted/50 flex items-center justify-center shrink-0 hover:bg-muted transition-colors"
                    aria-label={t("common.clear", { defaultValue: "Clear" })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Autocomplete dropdown */}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className={cn(
                    "absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50",
                    GLASS_BASE,
                    "shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
                    "max-h-[60vh] overflow-y-auto"
                  )}
                >
                  {/* Use current location button */}
                  <button
                    type="button"
                    onClick={() => void handleUseCurrentLocation()}
                    disabled={isLocating}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {isLocating ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      ) : (
                        <Crosshair className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {isLocating
                        ? t("search_bar.detecting_location", { defaultValue: "Detecting location..." })
                        : t("search_bar.use_current_location", { defaultValue: "Use current location" })}
                    </span>
                  </button>

                  {/* Recent locations - shown when query is empty */}
                  {addressAutocomplete.query.trim().length < 2 && recentLocations.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t("search_bar.recent", { defaultValue: "Recent" })}
                      </div>
                      {recentLocations.map((loc, idx) => (
                        <button
                          key={`recent-${idx}`}
                          type="button"
                          onClick={() => handleLocationSelect(loc)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm text-foreground truncate">{loc}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Autocomplete suggestions */}
                  {addressAutocomplete.query.trim().length >= 2 && (
                    <div className="py-2">
                      {addressAutocomplete.suggestions.length > 0 ? (
                        <>
                          <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {t("search_bar.suggestions", { defaultValue: "Suggestions" })}
                          </div>
                          {addressAutocomplete.suggestions.map((suggestion, idx) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              onClick={() => handleLocationSelect(suggestion.label)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                            >
                              <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="text-sm text-foreground truncate">
                                {highlightMatchingText(suggestion.label, addressAutocomplete.query)}
                              </span>
                            </button>
                          ))}
                        </>
                      ) : !addressAutocomplete.loading && (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          {addressAutocomplete.error
                            ? t("search_bar.error_loading", { defaultValue: "Error loading suggestions" })
                            : t("search_bar.no_results", { defaultValue: "No locations found" })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category selector - compact chip */}
            <CategorySheet
              activeCategoryId={categoryId}
              onCategoryChange={onCategoryChange}
            />

            {/* Filter button - with glassmorphism wrapper */}
            <div className={cn("rounded-full", GLASS_BASE, "p-0.5")}>
              <FiltersSheet
                value={filterValues}
                onChange={onFilterChange}
                resultCount={resultCount}
                activeFilterCount={activeFilterCount}
              />
            </div>

            {/* Sort dropdown - compact with glassmorphism */}
            <Select
              value={sortBy}
              onValueChange={(value) => onSortChange(value as SortOption)}
            >
              <SelectTrigger
                className={cn(
                  "h-10 w-10 p-0 rounded-full [&>svg:last-child]:hidden justify-center",
                  GLASS_BASE,
                  "hover:bg-background/95"
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

      {/* Toggle FAB - always visible, positioned above bottom sheet */}
      <Button
        variant={controlsVisible ? "secondary" : "default"}
        size="icon"
        onClick={() => setControlsVisible((prev) => !prev)}
        className={cn(
          "absolute z-30 h-14 w-14 rounded-full shadow-xl",
          "transition-all duration-300 ease-out",
          "right-4 bottom-[160px]", // Position above the bottom sheet peek height + safe margin
          controlsVisible
            ? cn(GLASS_BASE, "hover:bg-background/95")
            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25"
        )}
        style={{
          marginRight: "env(safe-area-inset-right)",
        }}
        aria-label={
          controlsVisible
            ? t("common.hide_controls", { defaultValue: "Hide controls" })
            : t("common.show_controls", { defaultValue: "Show controls" })
        }
        aria-expanded={controlsVisible}
      >
        <div className={cn(
          "transition-transform duration-300",
          controlsVisible ? "rotate-0" : "rotate-180"
        )}>
          {controlsVisible ? (
            <X className="h-5 w-5" />
          ) : (
            <Layers className="h-5 w-5" />
          )}
        </div>
      </Button>

      {/* Results count badge - shown when controls are hidden */}
      {!controlsVisible && !isAnimating && (
        <div
          className="absolute z-20 top-0 left-0 right-0 flex justify-center animate-in fade-in-0 slide-in-from-top-4 duration-300"
          style={{ 
            paddingTop: "max(calc(env(safe-area-inset-top) + 8px), 20px)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          }}
        >
          <button
            type="button"
            onClick={() => setControlsVisible(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full",
              GLASS_BASE,
              GLASS_INTERACTIVE
            )}
          >
            <Search className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              {t("browse.items_count", { count: resultCount })}
            </span>
            {activeFilterCount > 0 && (
              <Badge 
                variant="default" 
                className="h-5 min-w-5 rounded-full text-xs px-1.5"
              >
                {activeFilterCount}
              </Badge>
            )}
          </button>
        </div>
      )}
    </>
  );
};

export default memo(MobileMapOverlayControls);
