import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

import { CalendarIcon, ChevronDown, X } from "lucide-react";
import { format, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import type { FilterValues } from "@/components/explore/FiltersSheet";

type Props = {
  value: FilterValues;
  onChange: (next: FilterValues) => void;
  className?: string;
};

// Glassmorphism styling to match other controls
const GLASS_BASE =
  "bg-background/90 backdrop-blur-lg border border-white/20 dark:border-white/10";

export const DateFilterChip = ({ value, onChange, className }: Props) => {
  const { t } = useTranslation("equipment");
  const [isOpen, setIsOpen] = useState(false);
  const [localRange, setLocalRange] = useState<DateRange | undefined>(
    value.dateRange
  );
  const [isSelectingDates, setIsSelectingDates] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close overlay when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleApply = () => {
    onChange({ ...value, dateRange: localRange });
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalRange(undefined);
    setIsSelectingDates(false);
    onChange({ ...value, dateRange: undefined });
    setIsOpen(false);
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      setLocalRange(undefined);
      setIsSelectingDates(false);
      return;
    }

    if (!isSelectingDates) {
      setIsSelectingDates(true);
      setLocalRange({ from: range.from, to: undefined });
      return;
    }

    if (!range.to) {
      setLocalRange({ from: range.from, to: undefined });
      return;
    }

    setIsSelectingDates(false);
    setLocalRange(range);
  };

  // Label for the chip
  const chipLabel = useMemo(() => {
    if (value.dateRange?.from && value.dateRange?.to) {
      const start = format(value.dateRange.from, "MMM d");
      const end = format(value.dateRange.to, "MMM d");
      return `${start} - ${end}`;
    }
    if (value.dateRange?.from) {
      return format(value.dateRange.from, "MMM d");
    }
    return t("filters_sheet.dates", { defaultValue: "Dates" });
  }, [value.dateRange, t]);

  const isActive = !!value.dateRange?.from;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setLocalRange(value.dateRange);
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
        <CalendarIcon className="h-4 w-4 shrink-0" />
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

      {/* Overlay - mimicking CategorySheet style */}
      {isOpen && (
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
              GLASS_BASE,
              "shadow-[0_4px_30px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.1)]"
            )}
          >
            {/* Header */}
            <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between border-b border-border/30">
              <h2 className="text-lg font-bold">
                {t("filters_sheet.dates", { defaultValue: "Dates" })}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={!localRange?.from}
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
            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
              {/* Selection summary */}
              {localRange?.from && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 animate-in fade-in-0 zoom-in-95 duration-200 mb-4">
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t("filters_sheet.start_date", {
                          defaultValue: "Start",
                        })}
                      </p>
                      <p className="text-sm font-medium truncate">
                        {format(localRange.from, "EEE, MMM d")}
                      </p>
                    </div>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        localRange.to
                          ? "bg-primary/10"
                          : "bg-muted border-2 border-dashed border-muted-foreground/30"
                      )}
                    >
                      <CalendarIcon
                        className={cn(
                          "h-4 w-4",
                          localRange.to
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
                          !localRange.to && "text-muted-foreground"
                        )}
                      >
                        {localRange.to
                          ? format(localRange.to, "EEE, MMM d")
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
                    onClick={() => {
                      setLocalRange(undefined);
                      setIsSelectingDates(false);
                    }}
                    aria-label={t("common.clear", { defaultValue: "Clear" })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="rounded-2xl border bg-card/50 overflow-hidden">
                <Calendar
                  mode="range"
                  selected={localRange}
                  onSelect={handleDateSelect}
                  numberOfMonths={1}
                  disabled={(date) => startOfDay(date) < startOfDay(new Date())}
                  className="w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-cell]:w-[14.28%] [&_.rdp-head_cell]:w-[14.28%] [&_.rdp-day]:h-10 [&_.rdp-day]:w-full"
                />
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
