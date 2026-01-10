import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ChevronDown, X, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterValues } from "@/components/explore/FiltersSheet";
import { DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX } from "@/config/pagination";

type Props = {
  value: FilterValues;
  onChange: (next: FilterValues) => void;
  className?: string;
};

// Glassmorphism styling
const GLASS_BASE =
  "bg-background/90 backdrop-blur-lg border border-white/20 dark:border-white/10";

export const PriceFilterChip = ({ value, onChange, className }: Props) => {
  const { t } = useTranslation("equipment");
  const [isOpen, setIsOpen] = useState(false);
  const [localRange, setLocalRange] = useState<[number, number]>(
    value.priceRange
  );
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle overlay interactions (click outside, escape key, focus)
  useEffect(() => {
    if (!isOpen) return;

    // Focus the overlay when opened
    overlayRef.current?.focus();

    const handleClickOutside = (e: MouseEvent) => {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleApply = () => {
    onChange({ ...value, priceRange: localRange });
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalRange([DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX]);
  };

  // Label for the chip
  const chipLabel = useMemo(() => {
    const [min, max] = value.priceRange;
    if (min === DEFAULT_PRICE_MIN && max === DEFAULT_PRICE_MAX) {
      return t("filters_sheet.price", { defaultValue: "Price" });
    }
    if (max === DEFAULT_PRICE_MAX) {
      return `$${min}+`;
    }
    return `$${min} - $${max}`;
  }, [value.priceRange, t]);

  const isActive =
    value.priceRange[0] !== DEFAULT_PRICE_MIN ||
    value.priceRange[1] !== DEFAULT_PRICE_MAX;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setLocalRange(value.priceRange);
          setIsOpen(!isOpen);
        }}
        className={cn(
          "h-10 rounded-full gap-1.5 px-3",
          GLASS_BASE,
          "hover:bg-background/95 shadow-sm",
          isActive &&
            "bg-foreground text-background border-transparent hover:bg-foreground/90",
          className
        )}
      >
        <DollarSign className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium whitespace-nowrap">
          {chipLabel}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 opacity-60 transition-transform duration-200",
            isOpen && "rotate-180",
            isActive && "opacity-100"
          )}
        />
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-label={t("filters_sheet.price_range", {
            defaultValue: "Price Range",
          })}
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
              GLASS_BASE,
              "shadow-[0_4px_30px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.1)]"
            )}
          >
            {/* Header */}
            <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between border-b border-border/30">
              <h2 className="text-lg font-bold">
                {t("filters_sheet.price_range", {
                  defaultValue: "Price Range",
                })}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={
                    !isActive &&
                    localRange[0] === DEFAULT_PRICE_MIN &&
                    localRange[1] === DEFAULT_PRICE_MAX
                  }
                  className="h-8 px-2 text-xs"
                >
                  {t("common.clear", { defaultValue: "Clear" })}
                </Button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label={t("common.close", { defaultValue: "Close" })}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-hide">
              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: "Any",
                    min: DEFAULT_PRICE_MIN,
                    max: DEFAULT_PRICE_MAX,
                  },
                  { label: "$0-$25", min: 0, max: 25 },
                  { label: "$25-$50", min: 25, max: 50 },
                  { label: "$50-$100", min: 50, max: 100 },
                  { label: "$100+", min: 100, max: DEFAULT_PRICE_MAX },
                ].map((preset) => {
                  const safeMin = Math.max(preset.min, DEFAULT_PRICE_MIN);
                  const safeMax = Math.min(preset.max, DEFAULT_PRICE_MAX);
                  const isSelected =
                    localRange[0] === safeMin && localRange[1] === safeMax;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setLocalRange([safeMin, safeMax])}
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

              {/* Inputs */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    aria-label={t("filters_sheet.min_price", {
                      defaultValue: "Minimum price",
                    })}
                    min={DEFAULT_PRICE_MIN}
                    max={localRange[1]}
                    value={localRange[0]}
                    onChange={(e) => {
                      const parsed = Number(e.target.value);
                      const safe = Number.isNaN(parsed)
                        ? DEFAULT_PRICE_MIN
                        : parsed;
                      const val = Math.max(
                        DEFAULT_PRICE_MIN,
                        Math.min(safe, localRange[1])
                      );
                      setLocalRange([val, localRange[1]]);
                    }}
                    className="w-full h-12 pl-8 pr-4 rounded-xl border border-border bg-background/50 text-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="Min"
                  />
                </div>

                <div className="text-muted-foreground text-sm font-medium">
                  to
                </div>

                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    aria-label={t("filters_sheet.max_price", {
                      defaultValue: "Maximum price",
                    })}
                    min={localRange[0]}
                    max={DEFAULT_PRICE_MAX}
                    value={localRange[1]}
                    onChange={(e) => {
                      const parsed = Number(e.target.value);
                      const safe = Number.isNaN(parsed)
                        ? DEFAULT_PRICE_MAX
                        : parsed;
                      const val = Math.min(
                        DEFAULT_PRICE_MAX,
                        Math.max(safe, localRange[0])
                      );
                      setLocalRange([localRange[0], val]);
                    }}
                    className="w-full h-12 pl-8 pr-4 rounded-xl border border-border bg-background/50 text-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="Max"
                  />
                </div>
              </div>
              <div className="text-center text-xs text-muted-foreground">
                {t("filters_sheet.price_per_day", {
                  defaultValue: "Price per day",
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border/30 bg-background/50 backdrop-blur-sm">
              <Button
                onClick={handleApply}
                size="lg"
                className="w-full h-12 rounded-xl shadow-lg"
              >
                {t("common.apply", { defaultValue: "Apply" })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
