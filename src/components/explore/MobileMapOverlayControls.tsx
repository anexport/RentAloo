import { useState, memo, useEffect } from "react";
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
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import type { SearchBarFilters } from "@/types/search";
import type { FilterValues } from "@/components/explore/FiltersSheet";
import type { SortOption } from "@/components/explore/ListingsGridHeader";
import FiltersSheet from "@/components/explore/FiltersSheet";
import CategorySheet from "@/components/explore/CategorySheet";
import { cn } from "@/lib/utils";

type Props = {
  searchFilters: SearchBarFilters;
  onSearchClick: () => void;
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
  searchFilters,
  onSearchClick,
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
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle animation states for smoother transitions
  useEffect(() => {
    if (!controlsVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [controlsVisible]);

  const getSearchSummary = () => {
    const parts: string[] = [];
    if (searchFilters.location) parts.push(searchFilters.location);
    if (searchFilters.dateRange?.from) {
      if (searchFilters.dateRange.to) {
        parts.push(
          `${format(searchFilters.dateRange.from, "MMM d")} - ${format(searchFilters.dateRange.to, "MMM d")}`
        );
      } else {
        parts.push(format(searchFilters.dateRange.from, "MMM d"));
      }
    }
    if (searchFilters.equipmentType) parts.push(searchFilters.equipmentType);
    return parts.length > 0 ? parts.join(" · ") : t("search.placeholder");
  };

  const hasActiveSearch = !!(
    searchFilters.location ||
    searchFilters.equipmentType ||
    searchFilters.dateRange?.from
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
        {/* Top bar: Search trigger + Filter/Sort */}
        <div className="px-3 pt-2 pb-2">
          <div className="flex items-center gap-2">
            {/* Search trigger button - glassmorphism style */}
            <button
              type="button"
              onClick={onSearchClick}
              className={cn(
                "flex-1 flex items-center gap-3 min-h-[52px] px-4 py-2 rounded-3xl",
                GLASS_BASE,
                GLASS_INTERACTIVE,
                "shadow-[0_4px_20px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1)]"
              )}
              aria-label={t("search_bar.search_equipment_aria")}
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Search className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-sm font-semibold text-foreground truncate block">
                  {searchFilters.location || t("search_bar.where_placeholder")}
                </span>
                <span className="text-xs text-muted-foreground truncate block">
                  {getSearchSummary()}
                </span>
              </div>
              {hasActiveSearch && (
                <Badge
                  variant="secondary"
                  className="h-6 min-w-6 rounded-full px-1.5 flex items-center justify-center shrink-0 bg-primary/10 text-primary border-0"
                >
                  {searchFilters.dateRange?.from ? (
                    <Calendar className="h-3 w-3" />
                  ) : (
                    <MapPin className="h-3 w-3" />
                  )}
                </Badge>
              )}
            </button>

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
