import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar as CalendarIcon,
  MapPin,
  Search,
  Package,
  Crosshair,
  X,
  Wrench,
  Loader2,
  Clock,
} from "lucide-react";
import { format, startOfDay, addDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { SearchBarFilters } from "@/types/search";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { createMinWidthQuery } from "@/config/breakpoints";
import { useToast } from "@/hooks/useToast";
import { reverseGeocode } from "@/features/location/geocoding";
import {
  getCurrentPosition,
  checkGeolocationSupport,
  type GeolocationErrorCode,
} from "@/features/location/useGeolocation";
import { ToastAction } from "@/components/ui/toast";
import { useAddressAutocomplete } from "@/features/location/useAddressAutocomplete";
import { useEquipmentAutocomplete } from "@/hooks/useEquipmentAutocomplete";
import type { EquipmentSuggestion } from "@/components/equipment/services/autocomplete";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { highlightMatchingText } from "@/lib/highlightText";
import SearchPreviewMap from "./SearchPreviewMap";
import { fetchListings } from "@/components/equipment/services/listings";

type Props = {
  value: SearchBarFilters;
  onChange: (next: SearchBarFilters) => void;
  onSubmit: () => void;
};

const FALLBACK_EQUIPMENT_TYPES = [
  "Camping",
  "Hiking",
  "Climbing",
  "Water Sports",
  "Winter Sports",
  "Cycling",
];

const POPULAR_LOCATIONS: Array<{
  name: string;
  type: 'city' | 'park' | 'beach' | 'mountain';
  emoji: string;
  coords: { lat: number; lng: number };
}> = [
  { name: "San Francisco, CA", type: "city", emoji: "🌉", coords: { lat: 37.7749, lng: -122.4194 } },
  { name: "Yosemite National Park", type: "park", emoji: "🏔️", coords: { lat: 37.8651, lng: -119.5383 } },
  { name: "Santa Cruz, CA", type: "beach", emoji: "🌊", coords: { lat: 36.9741, lng: -122.0308 } },
  { name: "Lake Tahoe, CA", type: "mountain", emoji: "⛷️", coords: { lat: 39.0968, lng: -120.0324 } },
  { name: "Big Sur, CA", type: "beach", emoji: "🌅", coords: { lat: 36.2704, lng: -121.8081 } },
  { name: "Joshua Tree, CA", type: "park", emoji: "🌵", coords: { lat: 33.8734, lng: -115.9010 } },
];

const POPULAR_CATEGORIES = [
  "Camping",
  "Hiking",
  "Cycling",
  "Water Sports",
  "Winter Sports",
];

const RECENT_SEARCHES_KEY = "rentaloo_recent_equipment_searches";
const RECENT_LOCATIONS_KEY = "rentaloo_recent_locations";
const MAX_RECENT_SEARCHES = 5;
const MAX_RECENT_LOCATIONS = 3;

// Helper to calculate distance between two coordinates (Haversine formula)
const calculateDistanceMiles = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Helper functions for recent locations
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
  } catch {
    return [];
  }
};

// Helper function to detect macOS using modern API with fallback
const isMacOS = (): boolean => {
  if (typeof navigator === "undefined") return false;

  // Try modern User-Agent Client Hints API first
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ?? navigator.platform;

  return platform.toLowerCase().includes("mac");
};

// Helper to check if a key is a navigation key that should allow focus to move to Command
const isNavigationKey = (key: string): boolean => {
  return (
    key === "ArrowDown" ||
    key === "ArrowUp" ||
    key === "Enter" ||
    key === "Escape"
  );
};

// Helper functions for recent searches
const getRecentSearches = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addRecentSearch = (search: string) => {
  try {
    const recent = getRecentSearches();
    // Remove if already exists (to move it to front)
    const filtered = recent.filter((s) => s !== search);
    // Add to front and limit to MAX
    const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save recent search:", error);
  }
};

type SectionKey = "where" | "when" | "what";

const MOBILE_SECTIONS: Array<{
  key: SectionKey;
  label: string;
  icon: typeof MapPin;
}> = [
  { key: "where", label: "Where", icon: MapPin },
  { key: "when", label: "When", icon: CalendarIcon },
  { key: "what", label: "What", icon: Package },
];

const SearchBarPopover = ({ value, onChange, onSubmit }: Props) => {
  type Category = Database["public"]["Tables"]["categories"]["Row"];

  const isDesktop = useMediaQuery(createMinWidthQuery("md"));
  const [locationOpen, setLocationOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("where");
  const [isSelectingDates, setIsSelectingDates] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const equipmentInputRef = useRef<HTMLInputElement>(null);
  const dragStartY = useRef<number | null>(null);
  const { toast } = useToast();
  const addressAutocomplete = useAddressAutocomplete({
    limit: 10,
    minLength: 2,
    debounceMs: 100,
  });

  // Fetch listings for the interactive map preview
  const { data: mapListings = [] } = useQuery({
    queryKey: ["search-preview-listings"],
    queryFn: ({ signal }) => fetchListings({ limit: 100 }, signal),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: sheetOpen, // Only fetch when sheet is open
  });

  const equipmentAutocomplete = useEquipmentAutocomplete({
    minLength: 1,
    debounceMs: 300,
    categoryLimit: 5,
    equipmentLimit: 10,
  });

  const categorySuggestions = useMemo(
    () =>
      equipmentAutocomplete.suggestions.filter((s) => s.type === "category"),
    [equipmentAutocomplete.suggestions]
  );

  const equipmentSuggestions = useMemo(
    () =>
      equipmentAutocomplete.suggestions.filter((s) => s.type === "equipment"),
    [equipmentAutocomplete.suggestions]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (value.location) count++;
    if (value.dateRange?.from) count++;
    if (value.equipmentType) count++;
    return count;
  }, [value.location, value.dateRange, value.equipmentType]);

  const quickDateRanges = useMemo(() => {
    // Current date normalized to start of day
    const today = startOfDay(new Date());
    // Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = today.getDay();

    // Compute days until next Saturday (including today if today is Saturday)
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
    // This weekend: Saturday and Sunday
    const thisWeekendStart = addDays(today, daysUntilSaturday);
    const thisWeekendEnd = addDays(thisWeekendStart, 1);

    // Next weekend: exactly one week later (Saturday and Sunday)
    const nextWeekendStart = addDays(thisWeekendStart, 7);
    const nextWeekendEnd = addDays(nextWeekendStart, 1);

    // Compute days until next Monday (if today is Monday, treat as "next" week)
    const daysUntilMonday = (1 - dayOfWeek + 7) % 7;
    // Next week: Monday through Friday (Monday-as-today counts as "next" week)
    const nextWeekStart = addDays(
      today,
      daysUntilMonday === 0 ? 7 : daysUntilMonday
    );
    // End of next work week (Friday)
    const nextWeekEnd = addDays(nextWeekStart, 4);

    return [
      {
        label: "This weekend",
        range: {
          from: thisWeekendStart,
          to: thisWeekendEnd,
        } satisfies DateRange,
      },
      {
        label: "Next weekend",
        range: {
          from: nextWeekendStart,
          to: nextWeekendEnd,
        } satisfies DateRange,
      },
      {
        label: "Next week",
        range: { from: nextWeekStart, to: nextWeekEnd } satisfies DateRange,
      },
    ];
  }, []);

  const equipmentOptions = useMemo(() => {
    return categories.length > 0
      ? categories.map((cat) => ({ id: cat.id, name: cat.name }))
      : FALLBACK_EQUIPMENT_TYPES.map((name, idx) => ({
          id: `fallback-${idx}`,
          name,
        }));
  }, [categories]);

  // Load recent searches and locations on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
    setRecentLocations(getRecentLocations());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .is("parent_id", null)
          .order("name")
          .abortSignal(controller.signal);

        if (error) {
          if (!controller.signal.aborted) {
            console.error("Error loading categories", error);
            toast({
              title: "Couldn't load categories",
              description: "Please try again shortly.",
              variant: "destructive",
            });
            setCategories([]);
          }
          return;
        }

        if (!controller.signal.aborted) {
          setCategories(data ?? []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Unexpected error loading categories", err);
        }
      }
    };

    void loadCategories();

    return () => controller.abort();
  }, [toast]);

  const handleLocationSelect = (location: string) => {
    onChange({ ...value, location });
    setLocationOpen(false);
    addressAutocomplete.setQuery("");
    locationInputRef.current?.blur();
    // Save to recent locations
    const updated = addRecentLocation(location);
    setRecentLocations(updated);
  };

  // Focus Command input when location popover opens
  useEffect(() => {
    if (locationOpen && isDesktop) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        const commandInput = document.querySelector(
          '[data-slot="command-input"]'
        ) as HTMLInputElement;
        commandInput?.focus();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [locationOpen, isDesktop]);

  // Focus Command input when equipment popover opens
  useEffect(() => {
    if (equipmentOpen && isDesktop) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        const commandInput = document.querySelector(
          '[data-slot="command-input"]'
        ) as HTMLInputElement;
        commandInput?.focus();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [equipmentOpen, isDesktop]);

  useEffect(() => {
    if (!value.equipmentCategoryId || value.equipmentType) return;
    const match = equipmentOptions.find(
      (opt) =>
        !opt.id.startsWith("fallback-") && opt.id === value.equipmentCategoryId
    );
    if (match) {
      onChange({ ...value, equipmentType: match.name });
    }
  }, [equipmentOptions, onChange, value]);

  // Keyboard shortcut: Cmd+K / Ctrl+K to open equipment search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only on desktop (mobile uses sheet, doesn't need keyboard shortcut)
      if (!isDesktop) return;

      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setEquipmentOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDesktop]);

  const renderAutocompleteCommand = (
    placeholder: string,
    options?: {
      className?: string;
    }
  ) => {
    const commandClassName =
      options?.className !== undefined
        ? options.className || undefined
        : "rounded-2xl border";
    return (
      <Command className={commandClassName} shouldFilter={false}>
        <div className="[&_[data-slot='command-input-wrapper']_svg]:hidden">
          <CommandInput
            placeholder={placeholder}
            value={addressAutocomplete.query}
            onValueChange={addressAutocomplete.setQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => {
              // Delay to allow click on suggestion to register
              setTimeout(() => setIsSearchFocused(false), 150);
            }}
            className="h-12 text-base"
          />
        </div>
        {/* Only show dropdown when focused/typing */}
        {(isSearchFocused || addressAutocomplete.query.trim().length > 0) && (
          <CommandList aria-busy={addressAutocomplete.loading}>
            <CommandEmpty>
              {addressAutocomplete.loading
                ? "Searching..."
                : addressAutocomplete.query.trim().length === 0
                ? recentLocations.length > 0 
                  ? null  // Don't show empty message if we have recent locations
                  : "Start typing to search locations."
                : addressAutocomplete.error
                ? `Error: ${addressAutocomplete.error}`
                : "No locations found."}
            </CommandEmpty>

            {/* Recent Locations - shown when focused and query is empty */}
            {addressAutocomplete.query.trim().length === 0 && recentLocations.length > 0 && isSearchFocused && (
              <CommandGroup
                heading="Recent"
                className="animate-suggestions-in"
              >
                {recentLocations.map((loc, idx) => (
                  <CommandItem
                    key={`recent-loc-${loc}`}
                    onSelect={() => {
                      handleLocationSelect(loc);
                      setIsSearchFocused(false);
                    }}
                    className="cursor-pointer animate-suggestion-item"
                    style={{ "--item-index": idx } as React.CSSProperties}
                  >
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{loc}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Google Places Suggestions - shown when typing */}
            {addressAutocomplete.query.trim().length >= 2 &&
              addressAutocomplete.suggestions.length > 0 && (
                <CommandGroup
                  heading="Suggestions"
                  className="animate-suggestions-in"
                >
                  {addressAutocomplete.suggestions.map((s, idx) => (
                    <CommandItem
                      key={s.id}
                      onSelect={() => {
                        handleLocationSelect(s.label);
                        addressAutocomplete.setQuery("");
                        setIsSearchFocused(false);
                      }}
                      className="cursor-pointer animate-suggestion-item"
                      style={{ "--item-index": idx } as React.CSSProperties}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      <span className="truncate">
                        {highlightMatchingText(
                          s.label,
                          addressAutocomplete.query
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
          </CommandList>
        )}
      </Command>
    );
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      onChange({ ...value, dateRange: undefined });
      setIsSelectingDates(false);
      return;
    }

    if (!isSelectingDates) {
      setIsSelectingDates(true);
      onChange({ ...value, dateRange: { from: range.from, to: undefined } });
      return;
    }

    // Handle change start date mid-selection: user is selecting dates but picked a new from date,
    // so reset to a one-sided range (to: undefined) and keep selection mode active
    if (!range.to) {
      onChange({ ...value, dateRange: { from: range.from, to: undefined } });
      return;
    }

    setIsSelectingDates(false);
    onChange({ ...value, dateRange: range });
    setActiveSection("what");
  };

  const handlePresetDateSelect = (range: DateRange) => {
    onChange({ ...value, dateRange: range });
    setIsSelectingDates(false);
    setActiveSection("what");
  };

  const handleEquipmentSuggestionSelect = (suggestion: EquipmentSuggestion) => {
    if (suggestion.type === "category") {
      // Category selection: broad filter
      onChange({
        ...value,
        equipmentType: suggestion.label,
        equipmentCategoryId: suggestion.id,
        search: "", // Clear search
      });
    } else {
      // Equipment item selection: precise search via text search only
      onChange({
        ...value,
        equipmentType: suggestion.label, // Display name
        equipmentCategoryId: undefined, // Don't filter by category
        search: suggestion.label, // Search by exact title
      });
    }

    // Save to recent searches
    addRecentSearch(suggestion.label);
    setRecentSearches(getRecentSearches());

    // Clear input and close popover/sheet
    equipmentAutocomplete.setQuery("");
    setEquipmentOpen(false);
    setSheetOpen(false);
    setActiveSection("where");
    equipmentInputRef.current?.blur();
  };

  const handleSearch = () => {
    onSubmit();
    setSheetOpen(false);
    setActiveSection("where");
  };

  const handleClearAll = () => {
    onChange({
      ...value,
      location: "",
      dateRange: undefined,
      equipmentType: undefined,
      equipmentCategoryId: undefined,
      search: "",
    });
    equipmentAutocomplete.setQuery("");
    addressAutocomplete.setQuery("");
    setActiveSection("where");
    setIsSelectingDates(false);
  };

  const handleSheetOpenChange = (nextOpen: boolean) => {
    setSheetOpen(nextOpen);
    if (!nextOpen) {
      setActiveSection("where");
      setIsSelectingDates(false);
      equipmentAutocomplete.setQuery("");
    } else {
      addressAutocomplete.setQuery("");
    }
  };

  const handleUseCurrentLocation = async () => {
    if (isLocating) return;

    setIsLocating(true);

    try {
      const { lat, lon } = await getCurrentPosition();
      // Save user position for distance badges
      setUserPosition({ lat, lng: lon });
      const controller = new AbortController();
      const label = await reverseGeocode(lat, lon, {
        signal: controller.signal,
        language: navigator.language || "en",
      });
      const place = label ?? "Near you";

      // Use existing location flow
      handleLocationSelect(place);

      toast({
        title: "Location set",
        description: "Using your current location.",
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
            title: "Location permission denied",
            description:
              errorMessage ||
              "You've previously denied location access. Click the location icon (📍) in your browser's address bar to allow access, then try again.",
            variant: "destructive",
            action: (
              <ToastAction altText="Try again" onClick={handleLocationClick}>
                Try Again
              </ToastAction>
            ),
          });
          break;
        case "timeout":
          toast({
            title: "Location timeout",
            description:
              errorMessage ||
              "Couldn't get your location. Check signal and try again.",
            variant: "destructive",
            action: (
              <ToastAction altText="Try again" onClick={handleLocationClick}>
                Try Again
              </ToastAction>
            ),
          });
          break;
        case "insecure_origin": {
          const geoSupport = checkGeolocationSupport();
          toast({
            title: "Location unavailable",
            description: `Location requires HTTPS or localhost. Current: ${geoSupport.protocol}//${geoSupport.hostname}`,
            variant: "destructive",
          });
          break;
        }
        case "unavailable":
          toast({
            title: "Location unavailable",
            description:
              errorMessage ||
              "Location isn't available right now. Try entering a city.",
            variant: "destructive",
          });
          break;
        default:
          toast({
            title: "Location error",
            description:
              errorMessage ||
              "Something went wrong. Try entering a city manually.",
            variant: "destructive",
          });
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleLocationClick = () => {
    void handleUseCurrentLocation();
  };

  const getSearchSummary = () => {
    const parts: string[] = [];
    if (value.location) parts.push(value.location);
    if (value.dateRange?.from) {
      if (value.dateRange.to) {
        parts.push(
          `${format(value.dateRange.from, "MMM d")} - ${format(
            value.dateRange.to,
            "MMM d"
          )}`
        );
      } else {
        parts.push(format(value.dateRange.from, "MMM d"));
      }
    }
    if (value.equipmentType) parts.push(value.equipmentType);
    return parts.length > 0 ? parts.join(" · ") : "Search equipment";
  };

  // Mobile version with Sheet
  if (!isDesktop) {
    return (
      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-16 rounded-full justify-between px-5 py-4 text-left font-normal shadow-sm border-muted"
            aria-label="Search equipment"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Search
                </span>
                <span className="text-sm font-semibold text-foreground truncate">
                  {value.location || "Where to?"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {getSearchSummary()}
                </span>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="ml-3 h-9 w-9 rounded-full p-0 flex items-center justify-center text-xs shrink-0"
            >
              {activeFilterCount > 0 ? (
                activeFilterCount
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Badge>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] p-0" hideCloseButton>
          <div className="flex h-full flex-col">
            {/* Swipe handle - draggable to dismiss */}
            <button
              type="button"
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
              aria-label="Drag down to close"
              onPointerDown={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                dragStartY.current = e.clientY;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (dragStartY.current === null) return;
                const deltaY = e.clientY - dragStartY.current;
                // Visual feedback: translate sheet down as user drags
                const sheet = e.currentTarget.closest('[data-slot="sheet-content"]') as HTMLElement;
                if (sheet && deltaY > 0) {
                  sheet.style.transform = `translateY(${deltaY}px)`;
                  sheet.style.transition = 'none';
                }
              }}
              onPointerUp={(e) => {
                if (dragStartY.current === null) return;
                const deltaY = e.clientY - dragStartY.current;
                const sheet = e.currentTarget.closest('[data-slot="sheet-content"]') as HTMLElement;
                
                if (deltaY > 100) {
                  // Close sheet
                  setSheetOpen(false);
                } else if (sheet) {
                  // Snap back
                  sheet.style.transform = '';
                  sheet.style.transition = 'transform 200ms ease';
                }
                dragStartY.current = null;
              }}
              onPointerCancel={() => {
                dragStartY.current = null;
                // Reset position
                const sheet = document.querySelector('[data-slot="sheet-content"]') as HTMLElement;
                if (sheet) {
                  sheet.style.transform = '';
                  sheet.style.transition = 'transform 200ms ease';
                }
              }}
            >
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
            </button>
            {/* Compact header with integrated tabs */}
            <div className="px-4 pb-3 sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between mb-3">
                <SheetTitle className="text-base font-semibold">
                  Search
                </SheetTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              </div>
              <div className="flex items-center rounded-full bg-muted p-1">
                {MOBILE_SECTIONS.map((section) => {
                  // Use dynamic icon for "What" section based on selection type
                  let Icon = section.icon;
                  if (
                    section.key === "what" &&
                    value.equipmentType &&
                    value.search
                  ) {
                    Icon = Wrench;
                  }
                  const isActive = activeSection === section.key;
                  
                  // Dynamic label based on selection
                  let label = section.label;
                  if (section.key === "when" && value.dateRange?.from) {
                    label = value.dateRange.to
                      ? `${format(value.dateRange.from, "MMM d")}-${format(value.dateRange.to, "d")}`
                      : format(value.dateRange.from, "MMM d");
                  }
                  
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => {
                        setActiveSection(section.key);
                        // Auto-focus input when switching to sections with inputs
                        setTimeout(() => {
                          if (section.key === "where") {
                            const input = document.querySelector(
                              '[data-slot="command-input"]'
                            ) as HTMLInputElement;
                            input?.focus();
                          } else if (section.key === "what") {
                            const input = document.querySelector(
                              '[data-slot="command-input"]'
                            ) as HTMLInputElement;
                            input?.focus();
                          }
                        }, 150);
                      }}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      aria-pressed={isActive}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Map-centric Where section */}
            {activeSection === "where" && (
              <div className="flex-1 flex flex-col animate-in fade-in-0 duration-200">
                {/* Interactive Map - Takes ~50% of sheet height */}
                <div className="relative flex-1 min-h-[280px]">
                  <SearchPreviewMap
                    location={value.location || null}
                    listings={mapListings}
                    onSelectListing={() => {}}
                    onOpenListing={() => {}}
                    onUseCurrentLocation={handleLocationClick}
                    isLocating={isLocating}
                    className="h-full w-full"
                  />
                  
                  {/* Overlaid Search Input - Google Maps style */}
                  <div className="absolute top-3 left-3 right-3 z-20">
                    <div className="relative">
                      <div className="bg-background/95 backdrop-blur-sm rounded-xl shadow-lg border border-border/50 overflow-hidden">
                        {renderAutocompleteCommand("Search location...")}
                      </div>
                      {addressAutocomplete.loading && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected location badge - overlaid on map */}
                  {value.location && (
                    <div className="absolute bottom-3 left-3 right-14 z-20">
                      <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-border/50">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium flex-1 truncate">
                          {value.location}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onChange({ ...value, location: "" })}
                          className="h-6 w-6 p-0 rounded-full hover:bg-muted"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* When and What sections - with scrollable content */}
            {activeSection !== "where" && (
              <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
                {activeSection === "when" && (
                <div className="space-y-3 animate-in fade-in-0 slide-in-from-right-2 duration-200">
                  {/* Always visible calendar - mobile optimized */}
                  <div className="rounded-2xl border bg-card overflow-hidden">
                    <Calendar
                      mode="range"
                      selected={value.dateRange}
                      onSelect={handleDateSelect}
                      numberOfMonths={1}
                      disabled={(date) =>
                        startOfDay(date) < startOfDay(new Date())
                      }
                      className="w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-cell]:w-[14.28%] [&_.rdp-head_cell]:w-[14.28%] [&_.rdp-day]:h-10 [&_.rdp-day]:w-full"
                    />
                  </div>
                  {/* Selection summary */}
                  {value.dateRange?.from ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 animate-in fade-in-0 zoom-in-95 duration-200">
                      {/* Start date */}
                      <div className="flex-1 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <CalendarIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Start</p>
                          <p className="text-sm font-medium truncate">{format(value.dateRange.from, "EEE, MMM d")}</p>
                        </div>
                      </div>
                      {/* Arrow */}
                      <div className="text-muted-foreground">→</div>
                      {/* End date */}
                      <div className="flex-1 flex items-center gap-2">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          value.dateRange.to ? "bg-primary/10" : "bg-muted border-2 border-dashed border-muted-foreground/30"
                        )}>
                          <CalendarIcon className={cn("h-4 w-4", value.dateRange.to ? "text-primary" : "text-muted-foreground/50")} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">End</p>
                          <p className={cn("text-sm font-medium truncate", !value.dateRange.to && "text-muted-foreground")}>
                            {value.dateRange.to ? format(value.dateRange.to, "EEE, MMM d") : "Select date"}
                          </p>
                        </div>
                      </div>
                      {/* Clear button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full shrink-0"
                        onClick={() => onChange({ ...value, dateRange: undefined })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-muted-foreground/30">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tap a date to start
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeSection === "what" && (
                <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-200">
                  <Command shouldFilter={false} className="rounded-2xl border">
                    <div className="[&_[data-slot='command-input-wrapper']_svg]:hidden">
                      <CommandInput
                        placeholder="Search equipment or categories..."
                        value={equipmentAutocomplete.query}
                        onValueChange={equipmentAutocomplete.setQuery}
                        className="h-12 text-base"
                      />
                    </div>
                    <CommandList
                      className="max-h-[400px]"
                      aria-busy={equipmentAutocomplete.loading}
                    >
                      <CommandEmpty>
                        {equipmentAutocomplete.loading ? (
                          <div className="flex items-center justify-center gap-2 py-6">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Searching...</span>
                          </div>
                        ) : equipmentAutocomplete.query.trim().length === 0 ? (
                          "Start typing to search."
                        ) : equipmentAutocomplete.error ? (
                          `Error: ${equipmentAutocomplete.error}`
                        ) : (
                          "No results found."
                        )}
                      </CommandEmpty>

                      {/* Recent Searches (shown when no search query) */}
                      {equipmentAutocomplete.query.trim().length === 0 &&
                        recentSearches.length > 0 && (
                          <CommandGroup
                            heading="Recent"
                            className="animate-suggestions-in"
                          >
                            {recentSearches.map((searchTerm, idx) => (
                              <CommandItem
                                key={`recent-${idx}`}
                                onSelect={() => {
                                  // Find matching category
                                  const category = categories.find(
                                    (cat) => cat.name === searchTerm
                                  );
                                  if (category) {
                                    handleEquipmentSuggestionSelect({
                                      id: category.id,
                                      label: category.name,
                                      type: "category",
                                    });
                                  } else {
                                    // Treat as equipment search
                                    onChange({
                                      ...value,
                                      equipmentType: searchTerm,
                                      equipmentCategoryId: undefined,
                                      search: searchTerm,
                                    });
                                    setSheetOpen(false);
                                  }
                                }}
                                className="cursor-pointer py-3 animate-suggestion-item"
                                style={
                                  { "--item-index": idx } as React.CSSProperties
                                }
                              >
                                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                                {searchTerm}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}

                      {/* Popular Categories (shown when no search query) */}
                      {equipmentAutocomplete.query.trim().length === 0 && (
                        <CommandGroup
                          heading="Popular"
                          className="animate-suggestions-in"
                        >
                          {POPULAR_CATEGORIES.map((categoryName, idx) => (
                            <CommandItem
                              key={categoryName}
                              onSelect={() => {
                                // Find the category ID from loaded categories
                                const category = categories.find(
                                  (cat) => cat.name === categoryName
                                );
                                if (category) {
                                  handleEquipmentSuggestionSelect({
                                    id: category.id,
                                    label: category.name,
                                    type: "category",
                                  });
                                } else {
                                  // Fallback: set as equipmentType without category filter
                                  onChange({
                                    ...value,
                                    equipmentType: categoryName,
                                    equipmentCategoryId: undefined,
                                    search: "",
                                  });
                                  setSheetOpen(false);
                                }
                              }}
                              className="cursor-pointer py-3 animate-suggestion-item"
                              style={
                                { "--item-index": idx } as React.CSSProperties
                              }
                            >
                              <Package className="mr-2 h-4 w-4" />
                              {categoryName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* Categories Group */}
                      {categorySuggestions.length > 0 && (
                        <CommandGroup
                          heading="Categories"
                          className="animate-suggestions-in"
                        >
                          {categorySuggestions.map((s, idx) => (
                            <CommandItem
                              key={s.id}
                              onSelect={() =>
                                handleEquipmentSuggestionSelect(s)
                              }
                              className="cursor-pointer py-3 animate-suggestion-item"
                              style={
                                { "--item-index": idx } as React.CSSProperties
                              }
                            >
                              <Package className="mr-2 h-4 w-4 shrink-0" />
                              <span className="flex-1 truncate">
                                {highlightMatchingText(
                                  s.label,
                                  equipmentAutocomplete.query
                                )}
                              </span>
                              {typeof s.itemCount === "number" && (
                                <span className="text-xs text-muted-foreground ml-auto pl-2 shrink-0">
                                  {s.itemCount}{" "}
                                  {s.itemCount === 1 ? "item" : "items"}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* Equipment Items Group */}
                      {equipmentSuggestions.length > 0 && (
                        <CommandGroup
                          heading="Equipment"
                          className="animate-suggestions-in"
                        >
                          {equipmentSuggestions.map((s, idx) => (
                            <CommandItem
                              key={s.id}
                              onSelect={() =>
                                handleEquipmentSuggestionSelect(s)
                              }
                              className="cursor-pointer py-3 animate-suggestion-item"
                              style={
                                { "--item-index": idx } as React.CSSProperties
                              }
                            >
                              <Search className="mr-2 h-4 w-4 shrink-0" />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="truncate">
                                  {highlightMatchingText(
                                    s.label,
                                    equipmentAutocomplete.query
                                  )}
                                </span>
                                {s.categoryName && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    in {s.categoryName}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                  {/* Selection badge */}
                  {value.equipmentType && (
                    <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-2 animate-in fade-in-0 zoom-in-95 duration-200">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium flex-1 truncate">
                        {value.equipmentType}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onChange({
                            ...value,
                            equipmentType: undefined,
                            equipmentCategoryId: undefined,
                            search: "",
                          })
                        }
                        className="h-7 w-7 p-0 rounded-full"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              </div>
            )}
            <SheetFooter className="mt-auto px-4 pb-6 pt-3 border-t border-border/50 bg-gradient-to-t from-background to-background/80">
              <Button 
                onClick={handleSearch} 
                className="w-full h-12 text-base font-semibold rounded-full shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              >
                <Search className="mr-2 h-5 w-5" />
                Search{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop version with Popover layout
  return (
    <div className="w-full rounded-full border border-input bg-card shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-stretch divide-x divide-border">
        {/* Location Popover */}
          <Popover
            open={locationOpen}
            onOpenChange={(open) => {
              setLocationOpen(open);
              if (open) {
                addressAutocomplete.setQuery(value.location || "");
              }
              if (!open) {
                addressAutocomplete.setQuery("");
              }
            }}
          >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative px-6 py-4 text-left hover:bg-muted/50 transition-colors rounded-l-full focus:outline-none focus:ring-2 focus:ring-ring focus:z-10 w-full"
              aria-label="Select location"
              onClick={(e) => {
                // Focus the input when button is clicked
                e.preventDefault();
                locationInputRef.current?.focus();
              }}
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground mb-1">
                    Where
                  </div>
                    <Input
                      ref={locationInputRef}
                      type="text"
                      placeholder="Search destinations"
                      value={
                        locationOpen
                          ? addressAutocomplete.query
                          : value.location || ""
                      }
                      onChange={(e) => {
                        e.stopPropagation();
                        const nextValue = e.target.value;
                        addressAutocomplete.setQuery(nextValue);
                        if (!locationOpen) {
                          setLocationOpen(true);
                        }
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        if (!locationOpen) {
                          setLocationOpen(true);
                          addressAutocomplete.setQuery(value.location || "");
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    onKeyDown={(e) => {
                      // Allow navigation keys to work when popover is open
                      if (locationOpen && isNavigationKey(e.key)) {
                        // Find and focus the Command input in the popover
                        const commandInput = document.querySelector(
                          '[data-slot="command-input"]'
                        ) as HTMLInputElement;
                        if (commandInput) {
                          // Focus the Command input so it can handle navigation
                          commandInput.focus();
                          // Don't stop propagation - let navigation keys work normally
                          return;
                        }
                      }
                      // Stop propagation for typing keys to prevent unwanted behavior
                      if (!isNavigationKey(e.key)) {
                        e.stopPropagation();
                      }
                    }}
                    className="h-auto p-0 !border-0 !shadow-none focus-visible:ring-0 focus-visible:border-0 text-sm text-foreground placeholder:text-muted-foreground !bg-transparent dark:!bg-transparent pointer-events-auto cursor-text rounded-none"
                    aria-label="Search destinations"
                  />
                </div>
                {value.location && !locationOpen && (
                      <X
                        className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange({ ...value, location: "" });
                          addressAutocomplete.setQuery("");
                        }}
                        aria-label="Clear location"
                      />
                    )}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0"
            align="start"
            onOpenAutoFocus={(e) => {
              // Allow focus to move to Command input, but delay slightly to ensure DOM is ready
              e.preventDefault();
              setTimeout(() => {
                const commandInput = document.querySelector(
                  '[data-slot="command-input"]'
                ) as HTMLInputElement;
                commandInput?.focus();
              }, 0);
            }}
          >
            <div className="p-3 border-b">
              <Button
                variant="ghost"
                className="w-full justify-start h-9"
                onClick={handleLocationClick}
                disabled={isLocating}
                aria-label="Use current location"
                aria-busy={isLocating}
              >
                <Crosshair className="mr-2 h-4 w-4" />
                {isLocating
                  ? "Detecting your location..."
                  : "Use current location"}
              </Button>
            </div>
            {renderAutocompleteCommand("Search locations...", {
              className: undefined,
            })}
          </PopoverContent>
        </Popover>

        {/* Dates Popover */}
        <Popover open={datesOpen} onOpenChange={setDatesOpen}>
          <PopoverTrigger asChild>
            <button
              className="relative px-6 py-4 text-left hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:z-10"
              aria-label="Select dates"
            >
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground">
                    When
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {value.dateRange?.from ? (
                      value.dateRange.to ? (
                        <>
                          {format(value.dateRange.from, "MMM d")} -{" "}
                          {format(value.dateRange.to, "MMM d")}
                        </>
                      ) : (
                        format(value.dateRange.from, "MMM d")
                      )
                    ) : (
                      "Add dates"
                    )}
                  </div>
                </div>
                {value.dateRange?.from && (
                  <X
                    className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({ ...value, dateRange: undefined });
                      setIsSelectingDates(false);
                    }}
                    aria-label="Clear dates"
                  />
                )}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4">
              <Calendar
                mode="range"
                selected={value.dateRange}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                disabled={(date) => startOfDay(date) < startOfDay(new Date())}
              />
              <div className="mt-4 flex justify-between items-center border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...value, dateRange: undefined })}
                >
                  Clear dates
                </Button>
                <Button size="sm" onClick={() => setDatesOpen(false)}>
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Equipment Type Popover */}
        <Popover
          open={equipmentOpen}
          onOpenChange={(open) => {
            setEquipmentOpen(open);
            if (open) {
              equipmentAutocomplete.setQuery(value.equipmentType || "");
            }
            if (!open) {
              equipmentAutocomplete.setQuery("");
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative px-6 py-4 text-left hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:z-10 w-full"
              aria-label="Select equipment type"
              onClick={(e) => {
                e.preventDefault();
                equipmentInputRef.current?.focus();
              }}
            >
              <div className="flex items-center gap-3 w-full">
                {value.equipmentType && value.search ? (
                  <Wrench className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground mb-1">
                    What
                  </div>
                  <Input
                    ref={equipmentInputRef}
                    type="text"
                    placeholder="What are you looking for?"
                    value={
                      equipmentOpen
                        ? equipmentAutocomplete.query
                        : value.equipmentType || ""
                    }
                    onChange={(e) => {
                      e.stopPropagation();
                      const nextValue = e.target.value;
                      equipmentAutocomplete.setQuery(nextValue);
                      if (!equipmentOpen) {
                        setEquipmentOpen(true);
                      }
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                      if (!equipmentOpen) {
                        setEquipmentOpen(true);
                        equipmentAutocomplete.setQuery(value.equipmentType || "");
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                      // Allow navigation keys to work when popover is open
                      if (equipmentOpen && isNavigationKey(e.key)) {
                        // Find and focus the Command input in the popover
                        const commandInput = document.querySelector(
                          '[data-slot="command-input"]'
                        ) as HTMLInputElement;
                        if (commandInput) {
                          // Focus the Command input so it can handle navigation
                          commandInput.focus();
                          // Don't stop propagation - let navigation keys work normally
                          return;
                        }
                      }
                      // Stop propagation for typing keys to prevent unwanted behavior
                      if (!isNavigationKey(e.key)) {
                        e.stopPropagation();
                      }
                    }}
                    className="h-auto p-0 !border-0 !shadow-none focus-visible:ring-0 focus-visible:border-0 text-sm text-foreground placeholder:text-muted-foreground !bg-transparent dark:!bg-transparent pointer-events-auto cursor-text rounded-none"
                    aria-label="What are you looking for?"
                  />
                </div>
                {!value.equipmentType && !equipmentOpen && (
                  <kbd className="hidden xl:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-60 shrink-0">
                    <span className="text-xs">{isMacOS() ? "⌘" : "Ctrl+"}</span>
                    K
                  </kbd>
                )}
                {value.equipmentType && !equipmentOpen && (
                  <X
                    className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({
                        ...value,
                        equipmentType: undefined,
                        equipmentCategoryId: undefined,
                        search: "",
                      });
                      equipmentAutocomplete.setQuery("");
                    }}
                    aria-label="Clear equipment selection"
                  />
                )}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0"
            align="start"
            onOpenAutoFocus={(e) => {
              // Allow focus to move to Command input, but delay slightly to ensure DOM is ready
              e.preventDefault();
              setTimeout(() => {
                const commandInput = document.querySelector(
                  '[data-slot="command-input"]'
                ) as HTMLInputElement;
                commandInput?.focus();
              }, 0);
            }}
          >
            <Command shouldFilter={false}>
              <div className="[&_[data-slot='command-input-wrapper']_svg]:hidden">
                <CommandInput
                  placeholder="What are you looking for?"
                  value={equipmentAutocomplete.query}
                  onValueChange={equipmentAutocomplete.setQuery}
                />
              </div>
              <CommandList aria-busy={equipmentAutocomplete.loading}>
                <CommandEmpty>
                  {equipmentAutocomplete.loading ? (
                    <div className="flex items-center justify-center gap-2 py-6">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Searching...</span>
                    </div>
                  ) : equipmentAutocomplete.query.trim().length === 0 ? (
                    "Start typing to search."
                  ) : equipmentAutocomplete.error ? (
                    `Error: ${equipmentAutocomplete.error}`
                  ) : (
                    "No results found."
                  )}
                </CommandEmpty>

                {/* Recent Searches (shown when no search query) */}
                {equipmentAutocomplete.query.trim().length === 0 &&
                  recentSearches.length > 0 && (
                    <CommandGroup
                      heading="Recent"
                      className="animate-suggestions-in"
                    >
                      {recentSearches.map((searchTerm, idx) => (
                        <CommandItem
                          key={`recent-${idx}`}
                          onSelect={() => {
                            // Find matching category
                            const category = categories.find(
                              (cat) => cat.name === searchTerm
                            );
                            if (category) {
                              handleEquipmentSuggestionSelect({
                                id: category.id,
                                label: category.name,
                                type: "category",
                              });
                            } else {
                              // Treat as equipment search
                              onChange({
                                ...value,
                                equipmentType: searchTerm,
                                equipmentCategoryId: undefined,
                                search: searchTerm,
                              });
                              setEquipmentOpen(false);
                            }
                          }}
                          className="cursor-pointer animate-suggestion-item"
                          style={{ "--item-index": idx } as React.CSSProperties}
                        >
                          <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                          {searchTerm}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                {/* Popular Categories (shown when no search query) */}
                {equipmentAutocomplete.query.trim().length === 0 && (
                  <CommandGroup
                    heading="Popular"
                    className="animate-suggestions-in"
                  >
                    {POPULAR_CATEGORIES.map((categoryName, idx) => (
                      <CommandItem
                        key={categoryName}
                        onSelect={() => {
                          // Find the category ID from loaded categories
                          const category = categories.find(
                            (cat) => cat.name === categoryName
                          );
                          if (category) {
                            handleEquipmentSuggestionSelect({
                              id: category.id,
                              label: category.name,
                              type: "category",
                            });
                          } else {
                            // Fallback: set as equipmentType without category filter
                            onChange({
                              ...value,
                              equipmentType: categoryName,
                              equipmentCategoryId: undefined,
                              search: "",
                            });
                            setEquipmentOpen(false);
                          }
                        }}
                        className="cursor-pointer animate-suggestion-item"
                        style={{ "--item-index": idx } as React.CSSProperties}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        {categoryName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Categories Group */}
                {categorySuggestions.length > 0 && (
                  <CommandGroup
                    heading="Categories"
                    className="animate-suggestions-in"
                  >
                    {categorySuggestions.map((s, idx) => (
                      <CommandItem
                        key={s.id}
                        onSelect={() => handleEquipmentSuggestionSelect(s)}
                        className="cursor-pointer animate-suggestion-item"
                        style={{ "--item-index": idx } as React.CSSProperties}
                      >
                        <Package className="mr-2 h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">
                          {highlightMatchingText(
                            s.label,
                            equipmentAutocomplete.query
                          )}
                        </span>
                        {typeof s.itemCount === "number" && (
                          <span className="text-xs text-muted-foreground ml-auto pl-2 shrink-0">
                            {s.itemCount} {s.itemCount === 1 ? "item" : "items"}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Equipment Items Group */}
                {equipmentSuggestions.length > 0 && (
                  <CommandGroup
                    heading="Equipment"
                    className="animate-suggestions-in"
                  >
                    {equipmentSuggestions.map((s, idx) => (
                      <CommandItem
                        key={s.id}
                        onSelect={() => handleEquipmentSuggestionSelect(s)}
                        className="cursor-pointer animate-suggestion-item"
                        style={{ "--item-index": idx } as React.CSSProperties}
                      >
                        <Search className="mr-2 h-4 w-4 shrink-0" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate">
                            {highlightMatchingText(
                              s.label,
                              equipmentAutocomplete.query
                            )}
                          </span>
                          {s.categoryName && (
                            <span className="text-xs text-muted-foreground truncate">
                              in {s.categoryName}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Search Button */}
        <div className="flex items-center justify-center p-2 rounded-r-full">
          <Button
            onClick={handleSearch}
            className="h-12 w-12 rounded-full"
            size="icon"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SearchBarPopover;
