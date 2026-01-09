import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Filter,
  X,
  Check,
  Sparkles,
  ShieldCheck,
  CalendarIcon,
  Package,
  Search,
  Loader2,
} from "lucide-react";
import { format, startOfDay, addDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { createMinWidthQuery } from "@/config/breakpoints";
import { DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX } from "@/config/pagination";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";
import { useEquipmentAutocomplete } from "@/hooks/useEquipmentAutocomplete";
import type { EquipmentSuggestion } from "@/components/equipment/services/autocomplete";
import { highlightMatchingText } from "@/lib/highlightText";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";

type EquipmentCondition = Database["public"]["Enums"]["equipment_condition"];
type Category = Database["public"]["Tables"]["categories"]["Row"];

export type FilterValues = {
  priceRange: [number, number];
  conditions: EquipmentCondition[];
  verified: boolean;
  dateRange?: DateRange;
  equipmentType?: string;
  equipmentCategoryId?: string;
  search?: string;
};

const POPULAR_CATEGORIES = [
  "Camping",
  "Hiking",
  "Cycling",
  "Water Sports",
  "Winter Sports",
];

const RECENT_SEARCHES_KEY = "vaymo_recent_equipment_searches";
const MAX_RECENT_SEARCHES = 5;

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
    const filtered = recent.filter((s) => s !== search);
    const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Failed to save recent search:", error);
    return [];
  }
};

type Props = {
  value: FilterValues;
  onChange: (next: FilterValues) => void;
  resultCount: number;
  activeFilterCount: number;
};

const CONDITIONS: Array<{
  value: EquipmentCondition;
  label: string;
  descriptionKey: string;
}> = [
  {
    value: "new",
    label: "condition.new",
    descriptionKey: "condition.new_description",
  },
  {
    value: "excellent",
    label: "condition.excellent",
    descriptionKey: "condition.excellent_description",
  },
  {
    value: "good",
    label: "condition.good",
    descriptionKey: "condition.good_description",
  },
  {
    value: "fair",
    label: "condition.fair",
    descriptionKey: "condition.fair_description",
  },
];

const FiltersSheet = ({
  value,
  onChange,
  resultCount,
  activeFilterCount,
}: Props) => {
  const { t } = useTranslation("equipment");
  const { toast } = useToast();
  const [localValue, setLocalValue] = useState<FilterValues>(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectingDates, setIsSelectingDates] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const isDesktop = useMediaQuery(createMinWidthQuery("md"));
  const prevValueRef = useRef<FilterValues>(value);

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

  // Helper to normalize category names for comparison
  const normalizeForComparison = useCallback(
    (name: string) => name.trim().toLowerCase(),
    []
  );

  // Find a category by normalized name comparison
  const findCategoryByName = useCallback(
    (name: string) => {
      const normalized = normalizeForComparison(name);
      return categories.find(
        (cat) => normalizeForComparison(cat.name) === normalized
      );
    },
    [categories, normalizeForComparison]
  );

  // Validated recent searches - only those matching actual categories
  const validatedRecentSearches = useMemo(() => {
    return recentSearches.filter((search) => findCategoryByName(search));
  }, [recentSearches, findCategoryByName]);

  // Validated popular categories - only those matching actual categories
  const validatedPopularCategories = useMemo(() => {
    return POPULAR_CATEGORIES.filter((name) => findCategoryByName(name));
  }, [findCategoryByName]);

  // Load categories and recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());

    const controller = new AbortController();
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .is("parent_id", null)
          .order("name")
          .abortSignal(controller.signal);

        if (error && !controller.signal.aborted) {
          console.error("Error loading categories", error);
          toast({
            title: t("filters_sheet.error_loading_categories", {
              defaultValue: "Failed to load categories",
            }),
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        if (!controller.signal.aborted) {
          setCategories(data ?? []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Unexpected error loading categories", err);
          toast({
            title: t("filters_sheet.error_loading_categories", {
              defaultValue: "Failed to load categories",
            }),
            description: t("common.try_again_later", {
              defaultValue: "Please try again later",
            }),
            variant: "destructive",
          });
        }
      }
    };

    void loadCategories();
    return () => controller.abort();
  }, [t, toast]);

  // Quick date ranges
  const quickDateRanges = useMemo(() => {
    const today = startOfDay(new Date());
    const dayOfWeek = today.getDay();

    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
    const thisWeekendStart = addDays(today, daysUntilSaturday);
    const thisWeekendEnd = addDays(thisWeekendStart, 1);

    const nextWeekendStart = addDays(thisWeekendStart, 7);
    const nextWeekendEnd = addDays(nextWeekendStart, 1);

    const daysUntilMonday = (1 - dayOfWeek + 7) % 7;
    const nextWeekStart = addDays(
      today,
      daysUntilMonday === 0 ? 7 : daysUntilMonday
    );
    const nextWeekEnd = addDays(nextWeekStart, 4);

    return [
      {
        label: t("filters_sheet.this_weekend", {
          defaultValue: "This weekend",
        }),
        range: {
          from: thisWeekendStart,
          to: thisWeekendEnd,
        } satisfies DateRange,
      },
      {
        label: t("filters_sheet.next_weekend", {
          defaultValue: "Next weekend",
        }),
        range: {
          from: nextWeekendStart,
          to: nextWeekendEnd,
        } satisfies DateRange,
      },
      {
        label: t("filters_sheet.next_week", { defaultValue: "Next week" }),
        range: { from: nextWeekStart, to: nextWeekEnd } satisfies DateRange,
      },
    ];
  }, [t]);

  // Sync localValue with prop changes
  useEffect(() => {
    const prev = prevValueRef.current;
    const valueChanged =
      prev.priceRange[0] !== value.priceRange[0] ||
      prev.priceRange[1] !== value.priceRange[1] ||
      prev.conditions.length !== value.conditions.length ||
      prev.verified !== value.verified ||
      prev.dateRange?.from !== value.dateRange?.from ||
      prev.dateRange?.to !== value.dateRange?.to ||
      prev.equipmentType !== value.equipmentType ||
      prev.equipmentCategoryId !== value.equipmentCategoryId ||
      !prev.conditions.every((c) => value.conditions.includes(c));

    if (valueChanged) {
      setLocalValue(value);
      prevValueRef.current = value;
    }
  }, [value]);

  const handleApply = () => {
    setIsOpen(false);
    onChange(localValue);
  };

  const handleClear = () => {
    const cleared: FilterValues = {
      priceRange: [DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX],
      conditions: [],
      verified: false,
      dateRange: undefined,
      equipmentType: undefined,
      equipmentCategoryId: undefined,
      search: undefined,
    };
    setLocalValue(cleared);
    equipmentAutocomplete.setQuery("");
    setIsSelectingDates(false);
  };

  const handleConditionToggle = useCallback((condition: EquipmentCondition) => {
    setLocalValue((prev) => {
      const next = prev.conditions.includes(condition)
        ? prev.conditions.filter((c) => c !== condition)
        : [...prev.conditions, condition];
      return { ...prev, conditions: next };
    });
  }, []);

  const handleDateSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      setLocalValue({ ...localValue, dateRange: undefined });
      setIsSelectingDates(false);
      return;
    }

    if (!isSelectingDates) {
      setIsSelectingDates(true);
      setLocalValue({
        ...localValue,
        dateRange: { from: range.from, to: undefined },
      });
      return;
    }

    if (!range.to) {
      setLocalValue({
        ...localValue,
        dateRange: { from: range.from, to: undefined },
      });
      return;
    }

    setIsSelectingDates(false);
    setLocalValue({ ...localValue, dateRange: range });
  };

  const handlePresetDateSelect = (range: DateRange) => {
    setLocalValue({ ...localValue, dateRange: range });
    setIsSelectingDates(false);
  };

  const handleEquipmentSuggestionSelect = (suggestion: EquipmentSuggestion) => {
    if (suggestion.type === "category") {
      setLocalValue({
        ...localValue,
        equipmentType: suggestion.label,
        equipmentCategoryId: suggestion.id,
        search: "",
      });
    } else {
      setLocalValue({
        ...localValue,
        equipmentType: suggestion.label,
        equipmentCategoryId: undefined,
        search: suggestion.label,
      });
    }

    addRecentSearch(suggestion.label);
    setRecentSearches(getRecentSearches());
    equipmentAutocomplete.setQuery("");
  };

  // Check if any filters are applied
  const hasActiveFilters = useMemo(
    () =>
      localValue.priceRange[0] !== DEFAULT_PRICE_MIN ||
      localValue.priceRange[1] !== DEFAULT_PRICE_MAX ||
      localValue.conditions.length > 0 ||
      localValue.verified ||
      !!localValue.dateRange?.from ||
      !!localValue.equipmentType,
    [
      localValue.priceRange,
      localValue.conditions.length,
      localValue.verified,
      localValue.dateRange,
      localValue.equipmentType,
    ]
  );

  // Mobile filter content - completely redesigned
  const MobileFiltersContent = () => (
    <div className="space-y-8">
      {/* Price Range Section - Quick presets + custom */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold">
            {t("filters_sheet.price_range")}
          </h3>
        </div>

        {/* Quick preset buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Any", min: DEFAULT_PRICE_MIN, max: DEFAULT_PRICE_MAX },
            { label: "$0-$25", min: 0, max: 25 },
            { label: "$25-$50", min: 25, max: 50 },
            { label: "$50-$100", min: 50, max: 100 },
            { label: "$100+", min: 100, max: DEFAULT_PRICE_MAX },
          ].map((preset) => {
            const isSelected =
              localValue.priceRange[0] === preset.min &&
              localValue.priceRange[1] === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  setLocalValue({
                    ...localValue,
                    priceRange: [preset.min, preset.max],
                  })
                }
                className={cn(
                  "px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-foreground hover:bg-muted"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom range inputs */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={DEFAULT_PRICE_MIN}
              max={localValue.priceRange[1]}
              value={localValue.priceRange[0]}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                const safe = Number.isNaN(parsed) ? DEFAULT_PRICE_MIN : parsed;
                const val = Math.max(
                  DEFAULT_PRICE_MIN,
                  Math.min(safe, localValue.priceRange[1])
                );
                setLocalValue({
                  ...localValue,
                  priceRange: [val, localValue.priceRange[1]],
                });
              }}
              className="w-full h-12 pl-8 pr-4 rounded-xl border border-border bg-background text-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              placeholder="Min"
            />
          </div>

          <div className="text-muted-foreground text-sm font-medium">to</div>

          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={localValue.priceRange[0]}
              max={DEFAULT_PRICE_MAX}
              value={localValue.priceRange[1]}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                const safe = Number.isNaN(parsed) ? DEFAULT_PRICE_MAX : parsed;
                const val = Math.min(
                  DEFAULT_PRICE_MAX,
                  Math.max(safe, localValue.priceRange[0])
                );
                setLocalValue({
                  ...localValue,
                  priceRange: [localValue.priceRange[0], val],
                });
              }}
              className="w-full h-12 pl-8 pr-4 rounded-xl border border-border bg-background text-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              placeholder="Max"
            />
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground mt-3">
          {t("filters_sheet.price_per_day")}
        </div>
      </section>

      {/* Dates Section */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarIcon className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold">
            {t("filters_sheet.dates", { defaultValue: "Dates" })}
          </h3>
        </div>

        {/* Quick date presets */}
        <div className="flex flex-wrap gap-2">
          {quickDateRanges.map((preset) => {
            const isSelected =
              localValue.dateRange?.from?.getTime() ===
                preset.range.from.getTime() &&
              localValue.dateRange?.to?.getTime() === preset.range.to.getTime();
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetDateSelect(preset.range)}
                className={cn(
                  "px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-foreground hover:bg-muted"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Calendar */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <Calendar
            mode="range"
            selected={localValue.dateRange}
            onSelect={handleDateSelect}
            numberOfMonths={1}
            disabled={(date) => startOfDay(date) < startOfDay(new Date())}
            className="w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-cell]:w-[14.28%] [&_.rdp-head_cell]:w-[14.28%] [&_.rdp-day]:h-10 [&_.rdp-day]:w-full"
          />
        </div>

        {/* Selection summary */}
        {localValue.dateRange?.from && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex-1 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t("filters_sheet.start_date", { defaultValue: "Start" })}
                </p>
                <p className="text-sm font-medium truncate">
                  {format(localValue.dateRange.from, "EEE, MMM d")}
                </p>
              </div>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex-1 flex items-center gap-2">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  localValue.dateRange.to
                    ? "bg-primary/10"
                    : "bg-muted border-2 border-dashed border-muted-foreground/30"
                )}
              >
                <CalendarIcon
                  className={cn(
                    "h-4 w-4",
                    localValue.dateRange.to
                      ? "text-primary"
                      : "text-muted-foreground/50"
                  )}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t("filters_sheet.end_date", { defaultValue: "End" })}
                </p>
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    !localValue.dateRange.to && "text-muted-foreground"
                  )}
                >
                  {localValue.dateRange.to
                    ? format(localValue.dateRange.to, "EEE, MMM d")
                    : t("filters_sheet.select_date", {
                        defaultValue: "Select date",
                      })}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full shrink-0"
              onClick={() =>
                setLocalValue({ ...localValue, dateRange: undefined })
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </section>

      {/* Equipment Search Section */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold">
            {t("filters_sheet.equipment", { defaultValue: "Equipment" })}
          </h3>
        </div>

        <Command shouldFilter={false} className="rounded-2xl border">
          <div className="[&_[data-slot='command-input-wrapper']_svg]:hidden">
            <CommandInput
              placeholder={t("filters_sheet.search_equipment_placeholder", {
                defaultValue: "Search equipment or categories...",
              })}
              value={equipmentAutocomplete.query}
              onValueChange={equipmentAutocomplete.setQuery}
              className="h-12 text-base"
            />
          </div>
          <CommandList
            className="max-h-[300px]"
            aria-busy={equipmentAutocomplete.loading}
          >
            <CommandEmpty>
              {equipmentAutocomplete.loading ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {t("common.searching", { defaultValue: "Searching..." })}
                  </span>
                </div>
              ) : equipmentAutocomplete.query.trim().length === 0 ? (
                t("filters_sheet.start_typing", {
                  defaultValue: "Start typing to search.",
                })
              ) : equipmentAutocomplete.error ? (
                `${t("common.error", { defaultValue: "Error" })}: ${
                  equipmentAutocomplete.error
                }`
              ) : (
                t("filters_sheet.no_results", {
                  defaultValue: "No results found.",
                })
              )}
            </CommandEmpty>

            {/* Recent Searches - only show validated entries that match actual categories */}
            {equipmentAutocomplete.query.trim().length === 0 &&
              validatedRecentSearches.length > 0 && (
                <CommandGroup
                  heading={t("filters_sheet.recent", {
                    defaultValue: "Recent",
                  })}
                >
                  {validatedRecentSearches.map((searchTerm, idx) => {
                    const category = findCategoryByName(searchTerm);
                    // This should always be truthy since we filtered, but guard anyway
                    if (!category) return null;
                    return (
                      <CommandItem
                        key={`recent-${idx}`}
                        onSelect={() => {
                          handleEquipmentSuggestionSelect({
                            id: category.id,
                            label: category.name,
                            type: "category",
                          });
                        }}
                        className="cursor-pointer py-3"
                      >
                        <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                        {category.name}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

            {/* Popular Categories - only show validated entries that match actual categories */}
            {equipmentAutocomplete.query.trim().length === 0 &&
              validatedPopularCategories.length > 0 && (
                <CommandGroup
                  heading={t("filters_sheet.popular", {
                    defaultValue: "Popular",
                  })}
                >
                  {validatedPopularCategories.map((categoryName) => {
                    const category = findCategoryByName(categoryName);
                    // This should always be truthy since we filtered, but guard anyway
                    if (!category) return null;
                    return (
                      <CommandItem
                        key={categoryName}
                        onSelect={() => {
                          handleEquipmentSuggestionSelect({
                            id: category.id,
                            label: category.name,
                            type: "category",
                          });
                        }}
                        className="cursor-pointer py-3"
                      >
                        <Package className="mr-2 h-4 w-4" />
                        {category.name}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

            {/* Categories Group */}
            {categorySuggestions.length > 0 && (
              <CommandGroup
                heading={t("filters_sheet.categories", {
                  defaultValue: "Categories",
                })}
              >
                {categorySuggestions.map((s) => (
                  <CommandItem
                    key={s.id}
                    onSelect={() => handleEquipmentSuggestionSelect(s)}
                    className="cursor-pointer py-3"
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
                heading={t("filters_sheet.equipment_items", {
                  defaultValue: "Equipment",
                })}
              >
                {equipmentSuggestions.map((s) => (
                  <CommandItem
                    key={s.id}
                    onSelect={() => handleEquipmentSuggestionSelect(s)}
                    className="cursor-pointer py-3"
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
                          {t("filters_sheet.in_category", {
                            defaultValue: "in",
                          })}{" "}
                          {s.categoryName}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>

        {/* Selected equipment badge */}
        {localValue.equipmentType && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-2 animate-in fade-in-0 zoom-in-95 duration-200">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium flex-1 truncate">
              {localValue.equipmentType}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setLocalValue({
                  ...localValue,
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
      </section>

      {/* Condition Section - Chip/pill selection */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold">
            {t("filters_sheet.condition")}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {CONDITIONS.map((condition) => {
            const isSelected = localValue.conditions.includes(condition.value);
            return (
              <button
                key={condition.value}
                type="button"
                onClick={() => handleConditionToggle(condition.value)}
                className={cn(
                  "relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-200 text-left",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-background hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                {/* Selection indicator */}
                <div
                  className={cn(
                    "absolute top-3 right-3 h-5 w-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isSelected && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>

                <span
                  className={cn(
                    "text-sm font-semibold",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {t(condition.label)}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 pr-6">
                  {t(condition.descriptionKey, {
                    defaultValue:
                      condition.value === "new"
                        ? "Brand new, never used"
                        : condition.value === "excellent"
                        ? "Like new condition"
                        : condition.value === "good"
                        ? "Minor signs of use"
                        : "Normal wear and tear",
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Verified Owners Section - Toggle card */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold">
            {t("filters_sheet.owner_verification")}
          </h3>
        </div>

        <button
          type="button"
          onClick={() =>
            setLocalValue({ ...localValue, verified: !localValue.verified })
          }
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200",
            localValue.verified
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          {/* Toggle switch */}
          <div
            className={cn(
              "relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0",
              localValue.verified ? "bg-primary" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                localValue.verified ? "translate-x-6" : "translate-x-1"
              )}
            />
          </div>

          <div className="flex-1 text-left">
            <div
              className={cn(
                "text-sm font-semibold",
                localValue.verified ? "text-primary" : "text-foreground"
              )}
            >
              {t("filters_sheet.verified_owners_only")}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t("filters_sheet.verified_description", {
                defaultValue: "Only show equipment from verified owners",
              })}
            </div>
          </div>
        </button>
      </section>
    </div>
  );

  // Desktop dialog content (unchanged from before)
  const DesktopFiltersContent = () => (
    <div className="space-y-6">
      {/* Price Range */}
      <div className="space-y-4">
        <h4 className="font-medium">{t("filters_sheet.price_range")}</h4>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>${localValue.priceRange[0]}</span>
          <span>${localValue.priceRange[1]}+</span>
        </div>
        <Slider
          value={localValue.priceRange}
          onValueChange={(val) => {
            const [min, max] = val as [number, number];
            setLocalValue({
              ...localValue,
              priceRange: [Math.min(min, max), Math.max(min, max)] as [
                number,
                number
              ],
            });
          }}
          min={DEFAULT_PRICE_MIN}
          max={DEFAULT_PRICE_MAX}
          step={10}
          className="w-full"
        />
        <div className="text-xs text-muted-foreground">
          {t("filters_sheet.price_per_day")}
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-3">
        <h4 className="font-medium">
          {t("filters_sheet.dates", { defaultValue: "Dates" })}
        </h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {quickDateRanges.map((preset) => {
            const isSelected =
              localValue.dateRange?.from?.getTime() ===
                preset.range.from.getTime() &&
              localValue.dateRange?.to?.getTime() === preset.range.to.getTime();
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetDateSelect(preset.range)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm border transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <Calendar
          mode="range"
          selected={localValue.dateRange}
          onSelect={handleDateSelect}
          numberOfMonths={2}
          disabled={(date) => startOfDay(date) < startOfDay(new Date())}
        />
        {localValue.dateRange?.from && (
          <div className="flex items-center justify-between text-sm">
            <span>
              {format(localValue.dateRange.from, "MMM d")}
              {localValue.dateRange.to &&
                ` - ${format(localValue.dateRange.to, "MMM d")}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setLocalValue({ ...localValue, dateRange: undefined })
              }
            >
              {t("common.clear", { defaultValue: "Clear" })}
            </Button>
          </div>
        )}
      </div>

      {/* Equipment Search */}
      <div className="space-y-3">
        <h4 className="font-medium">
          {t("filters_sheet.equipment", { defaultValue: "Equipment" })}
        </h4>
        <Command shouldFilter={false} className="rounded-lg border">
          <CommandInput
            placeholder={t("filters_sheet.search_equipment_placeholder", {
              defaultValue: "Search equipment or categories...",
            })}
            value={equipmentAutocomplete.query}
            onValueChange={equipmentAutocomplete.setQuery}
          />
          <CommandList
            className="max-h-[200px]"
            aria-busy={equipmentAutocomplete.loading}
          >
            <CommandEmpty>
              {equipmentAutocomplete.loading
                ? t("common.searching", { defaultValue: "Searching..." })
                : equipmentAutocomplete.query.trim().length === 0
                ? t("filters_sheet.start_typing", {
                    defaultValue: "Start typing to search.",
                  })
                : t("filters_sheet.no_results", {
                    defaultValue: "No results found.",
                  })}
            </CommandEmpty>

            {equipmentAutocomplete.query.trim().length === 0 &&
              validatedPopularCategories.length > 0 && (
                <CommandGroup
                  heading={t("filters_sheet.popular", {
                    defaultValue: "Popular",
                  })}
                >
                  {validatedPopularCategories.map((categoryName) => {
                    const category = findCategoryByName(categoryName);
                    if (!category) return null;
                    return (
                      <CommandItem
                        key={categoryName}
                        onSelect={() => {
                          handleEquipmentSuggestionSelect({
                            id: category.id,
                            label: category.name,
                            type: "category",
                          });
                        }}
                        className="cursor-pointer"
                      >
                        <Package className="mr-2 h-4 w-4" />
                        {category.name}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

            {categorySuggestions.length > 0 && (
              <CommandGroup
                heading={t("filters_sheet.categories", {
                  defaultValue: "Categories",
                })}
              >
                {categorySuggestions.map((s) => (
                  <CommandItem
                    key={s.id}
                    onSelect={() => handleEquipmentSuggestionSelect(s)}
                    className="cursor-pointer"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    {highlightMatchingText(
                      s.label,
                      equipmentAutocomplete.query
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {equipmentSuggestions.length > 0 && (
              <CommandGroup
                heading={t("filters_sheet.equipment_items", {
                  defaultValue: "Equipment",
                })}
              >
                {equipmentSuggestions.map((s) => (
                  <CommandItem
                    key={s.id}
                    onSelect={() => handleEquipmentSuggestionSelect(s)}
                    className="cursor-pointer"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    {highlightMatchingText(
                      s.label,
                      equipmentAutocomplete.query
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
        {localValue.equipmentType && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
            <span className="text-sm">{localValue.equipmentType}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setLocalValue({
                  ...localValue,
                  equipmentType: undefined,
                  equipmentCategoryId: undefined,
                  search: "",
                })
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Conditions */}
      <div className="space-y-3">
        <h4 className="font-medium">{t("filters_sheet.condition")}</h4>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((condition) => {
            const isSelected = localValue.conditions.includes(condition.value);
            return (
              <button
                key={condition.value}
                type="button"
                onClick={() => handleConditionToggle(condition.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm border transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary"
                )}
              >
                {t(condition.label)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Verified */}
      <div className="space-y-3">
        <h4 className="font-medium">{t("filters_sheet.owner_verification")}</h4>
        <button
          type="button"
          onClick={() =>
            setLocalValue({ ...localValue, verified: !localValue.verified })
          }
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors w-full",
            localValue.verified
              ? "bg-primary/5 border-primary"
              : "bg-background border-border hover:border-primary"
          )}
        >
          <div
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center",
              localValue.verified
                ? "bg-primary border-primary"
                : "border-muted-foreground/50"
            )}
          >
            {localValue.verified && (
              <Check className="h-3 w-3 text-primary-foreground" />
            )}
          </div>
          <span className="text-sm">
            {t("filters_sheet.verified_owners_only")}
          </span>
        </button>
      </div>
    </div>
  );

  const FiltersFooter = () => (
    <div className="flex items-center justify-between gap-4">
      <Button variant="ghost" onClick={handleClear}>
        {t("filters_sheet.clear_all")}
      </Button>
      <Button onClick={handleApply}>
        {t("filters_sheet.show_results", {
          count: resultCount,
          defaultValue: `Show ${resultCount} result${
            resultCount !== 1 ? "s" : ""
          }`,
        })}
      </Button>
    </div>
  );

  const TriggerButton = () => (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      aria-label={t("filters_sheet.title")}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border border-border bg-background hover:bg-muted transition-colors whitespace-nowrap"
    >
      <Filter className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t("filters_sheet.title")}</span>
      {activeFilterCount > 0 && (
        <Badge
          variant="default"
          className="h-4 min-w-4 rounded-full p-0 flex items-center justify-center text-[10px]"
        >
          {activeFilterCount}
        </Badge>
      )}
    </button>
  );

  if (isDesktop) {
    return (
      <>
        <TriggerButton />
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[80dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("filters_sheet.title")}</DialogTitle>
              <DialogDescription>
                {t("filters_sheet.description")}
              </DialogDescription>
            </DialogHeader>
            <DesktopFiltersContent />
            <DialogFooter>
              <FiltersFooter />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Premium mobile sheet experience
  return (
    <>
      <TriggerButton />
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="bottom"
          hideCloseButton
          className="h-[92dvh] max-h-[92dvh] rounded-t-3xl flex flex-col p-0 bg-background"
        >
          {/* Drag handle indicator */}
          <div className="flex-shrink-0 flex items-center justify-center h-8 pt-3">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header with close button and clear */}
          <div className="flex-shrink-0 px-5 pb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={t("common.close", { defaultValue: "Close" })}
              className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-bold">{t("filters_sheet.title")}</h2>

            <button
              type="button"
              onClick={handleClear}
              disabled={!hasActiveFilters}
              className={cn(
                "text-sm font-medium px-3 py-2 rounded-full transition-colors",
                hasActiveFilters
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground/50"
              )}
            >
              {t("filters_sheet.clear_all")}
            </button>
          </div>

          {/* Scrollable content */}
          <div
            className="flex-1 min-h-0 overflow-y-auto px-5 pb-6 overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <MobileFiltersContent />
          </div>

          {/* Sticky footer CTA */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <Button
              onClick={handleApply}
              size="lg"
              className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg"
            >
              {t("filters_sheet.show_results", {
                count: resultCount,
                defaultValue: `Show ${resultCount} result${
                  resultCount !== 1 ? "s" : ""
                }`,
              })}
            </Button>

            {/* Safe area padding for iPhone */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default FiltersSheet;
