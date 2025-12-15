import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Filter, X, Check, Sparkles, ShieldCheck } from "lucide-react";
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
};

type Props = {
  value: FilterValues;
  onChange: (next: FilterValues) => void;
  resultCount: number;
  activeFilterCount: number;
};

const CONDITIONS: Array<{ value: EquipmentCondition; label: string; description: string }> = [
  { value: "new", label: "condition.new", description: "Brand new, never used" },
  { value: "excellent", label: "condition.excellent", description: "Like new condition" },
  { value: "good", label: "condition.good", description: "Minor signs of use" },
  { value: "fair", label: "condition.fair", description: "Normal wear and tear" },
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
  const isDesktop = useMediaQuery(createMinWidthQuery("md"));
  const prevValueRef = useRef<FilterValues>(value);

  // Sync localValue with prop changes
  useEffect(() => {
    const prev = prevValueRef.current;
    const valueChanged =
      prev.priceRange[0] !== value.priceRange[0] ||
      prev.priceRange[1] !== value.priceRange[1] ||
      prev.conditions.length !== value.conditions.length ||
      prev.verified !== value.verified ||
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
    };
    setLocalValue(cleared);
  };

  const handleConditionToggle = (condition: EquipmentCondition) => {
    const next = localValue.conditions.includes(condition)
      ? localValue.conditions.filter((c) => c !== condition)
      : [...localValue.conditions, condition];
    setLocalValue({ ...localValue, conditions: next });
  };

  // Check if any filters are applied
  const hasActiveFilters = 
    localValue.priceRange[0] !== DEFAULT_PRICE_MIN ||
    localValue.priceRange[1] !== DEFAULT_PRICE_MAX ||
    localValue.conditions.length > 0 ||
    localValue.verified;

  // Mobile filter content - completely redesigned
  const MobileFiltersContent = () => (
    <div className="space-y-8">
      {/* Price Range Section - Quick presets + custom */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold">{t("filters_sheet.price_range")}</h3>
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
                onClick={() => setLocalValue({
                  ...localValue,
                  priceRange: [preset.min, preset.max],
                })}
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
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              type="number"
              inputMode="numeric"
              min={DEFAULT_PRICE_MIN}
              max={localValue.priceRange[1]}
              value={localValue.priceRange[0]}
              onChange={(e) => {
                const val = Math.max(DEFAULT_PRICE_MIN, Math.min(Number(e.target.value), localValue.priceRange[1]));
                setLocalValue({ ...localValue, priceRange: [val, localValue.priceRange[1]] });
              }}
              className="w-full h-12 pl-8 pr-4 rounded-xl border border-border bg-background text-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              placeholder="Min"
            />
            <span className="absolute -bottom-5 left-0 right-0 text-center text-[11px] text-muted-foreground">min</span>
          </div>
          
          <div className="text-muted-foreground text-sm font-medium">to</div>
          
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              type="number"
              inputMode="numeric"
              min={localValue.priceRange[0]}
              max={DEFAULT_PRICE_MAX}
              value={localValue.priceRange[1]}
              onChange={(e) => {
                const val = Math.min(DEFAULT_PRICE_MAX, Math.max(Number(e.target.value), localValue.priceRange[0]));
                setLocalValue({ ...localValue, priceRange: [localValue.priceRange[0], val] });
              }}
              className="w-full h-12 pl-8 pr-4 rounded-xl border border-border bg-background text-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              placeholder="Max"
            />
            <span className="absolute -bottom-5 left-0 right-0 text-center text-[11px] text-muted-foreground">max</span>
          </div>
        </div>
        
        <div className="text-center text-xs text-muted-foreground pt-4">
          {t("filters_sheet.price_per_day")}
        </div>
      </section>

      {/* Condition Section - Chip/pill selection */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold">{t("filters_sheet.condition")}</h3>
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
                <div className={cn(
                  "absolute top-3 right-3 h-5 w-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                
                <span className={cn(
                  "text-sm font-semibold",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {t(condition.label)}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 pr-6">
                  {condition.description}
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
          <h3 className="text-base font-semibold">{t("filters_sheet.owner_verification")}</h3>
        </div>
        
        <button
          type="button"
          onClick={() => setLocalValue({ ...localValue, verified: !localValue.verified })}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200",
            localValue.verified
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          {/* Toggle switch */}
          <div className={cn(
            "relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0",
            localValue.verified ? "bg-primary" : "bg-muted"
          )}>
            <div className={cn(
              "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
              localValue.verified ? "translate-x-6" : "translate-x-1"
            )} />
          </div>
          
          <div className="flex-1 text-left">
            <div className={cn(
              "text-sm font-semibold",
              localValue.verified ? "text-primary" : "text-foreground"
            )}>
              {t("filters_sheet.verified_owners_only")}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Only show equipment from verified owners
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
              priceRange: [Math.min(min, max), Math.max(min, max)] as [number, number],
            });
          }}
          min={DEFAULT_PRICE_MIN}
          max={DEFAULT_PRICE_MAX}
          step={10}
          className="w-full"
        />
        <div className="text-xs text-muted-foreground">{t("filters_sheet.price_per_day")}</div>
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
          onClick={() => setLocalValue({ ...localValue, verified: !localValue.verified })}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors w-full",
            localValue.verified
              ? "bg-primary/5 border-primary"
              : "bg-background border-border hover:border-primary"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center",
            localValue.verified ? "bg-primary border-primary" : "border-muted-foreground/50"
          )}>
            {localValue.verified && <Check className="h-3 w-3 text-primary-foreground" />}
          </div>
          <span className="text-sm">{t("filters_sheet.verified_owners_only")}</span>
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
        {t("filters_sheet.show_results", { count: resultCount, defaultValue: `Show ${resultCount} result${resultCount !== 1 ? "s" : ""}` })}
      </Button>
    </div>
  );

  const TriggerButton = () => (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
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
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
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
              Clear
            </button>
          </div>

          {/* Scrollable content */}
          <div 
            className="flex-1 min-h-0 overflow-y-auto px-5 pb-6 overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
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
              {resultCount > 0 
                ? `Show ${resultCount} ${resultCount === 1 ? 'result' : 'results'}`
                : 'No results found'
              }
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
