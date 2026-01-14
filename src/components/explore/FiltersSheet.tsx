import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Filter, X, Check, ShieldCheck } from "lucide-react";
import { format, startOfDay, addDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { createMinWidthQuery } from "@/config/breakpoints";
import { DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX } from "@/config/pagination";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type EquipmentCondition = Database["public"]["Enums"]["equipment_condition"];

export type FilterValues = {
  priceRange: [number, number];
  conditions: EquipmentCondition[];
  verified: boolean;
  dateRange?: DateRange;
  equipmentType?: string;
  equipmentCategoryId?: string;
  search?: string;
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

  const [localValue, setLocalValue] = useState<FilterValues>(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectingDates, setIsSelectingDates] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const isDesktop = useMediaQuery(createMinWidthQuery("md"));
  const prevValueRef = useRef<FilterValues>(value);

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

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

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
      className="inline-flex items-center gap-1.5 h-10 px-3 rounded-full text-sm font-medium bg-background/90 backdrop-blur-lg border border-white/20 dark:border-white/10 hover:bg-background/95 shadow-sm transition-colors whitespace-nowrap"
    >
      <Filter className="h-4 w-4" />
      <span>{t("filters_sheet.title")}</span>
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
      {/* Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={overlayRef}
            className={cn(
              "fixed left-1/2 -translate-x-1/2 z-50",
              "top-32",
              "w-[calc(100vw-24px)] max-w-[500px]",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
            )}
          >
            <div
              className={cn(
                "rounded-[28px] overflow-hidden flex flex-col max-h-[calc(100vh-160px)]",
                "bg-background/90 backdrop-blur-lg border border-white/20 dark:border-white/10",
                "shadow-[0_4px_30px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.1)]"
              )}
            >
              {/* Header with close button and clear */}
              <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between border-b border-border/30">
                <h2 className="text-lg font-bold">
                  {t("filters_sheet.title")}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={!hasActiveFilters}
                    className={cn(
                      "h-8 px-2 text-xs font-medium rounded-full transition-colors",
                      hasActiveFilters
                        ? "text-primary hover:bg-primary/10"
                        : "text-muted-foreground/50"
                    )}
                  >
                    {t("common.clear", { defaultValue: "Clear" })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div
                className="flex-1 min-h-0 overflow-y-auto px-5 py-6 overscroll-contain scrollbar-hide"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <MobileFiltersContent />
              </div>

              {/* Sticky footer CTA */}
              <div className="flex-shrink-0 px-5 py-4 border-t border-border/30 bg-background/50 backdrop-blur-sm">
                <Button
                  onClick={handleApply}
                  size="lg"
                  className="w-full h-12 text-base font-semibold rounded-xl shadow-lg"
                >
                  {t("filters_sheet.show_results", {
                    count: resultCount,
                    defaultValue: `Show ${resultCount} result${
                      resultCount !== 1 ? "s" : ""
                    }`,
                  })}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default FiltersSheet;
