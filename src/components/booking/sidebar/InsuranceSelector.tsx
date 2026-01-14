import { Shield, CheckCircle2, HelpCircle } from "lucide-react";
import { INSURANCE_OPTIONS, calculateInsuranceCost } from "@/lib/booking";
import type { InsuranceType } from "@/types/booking";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InsuranceSelectorProps {
  selectedInsurance: InsuranceType;
  onInsuranceChange: (type: InsuranceType) => void;
  rentalSubtotal: number;
}

const InsuranceSelector = ({
  selectedInsurance,
  onInsuranceChange,
  rentalSubtotal,
}: InsuranceSelectorProps) => {
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    type: InsuranceType
  ) => {
    // Implement keyboard navigation for accessibility
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onInsuranceChange(type);
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const currentIndex = INSURANCE_OPTIONS.findIndex(
        (opt) => opt.type === selectedInsurance
      );
      const nextIndex = (currentIndex + 1) % INSURANCE_OPTIONS.length;
      onInsuranceChange(INSURANCE_OPTIONS[nextIndex].type);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const currentIndex = INSURANCE_OPTIONS.findIndex(
        (opt) => opt.type === selectedInsurance
      );
      const prevIndex =
        (currentIndex - 1 + INSURANCE_OPTIONS.length) %
        INSURANCE_OPTIONS.length;
      onInsuranceChange(INSURANCE_OPTIONS[prevIndex].type);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Protection Plan</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="p-0 bg-transparent border-0 cursor-help"
              aria-label="Protection plan information"
            >
              <HelpCircle className="h-3 w-3 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px]">
            Optional coverage for peace of mind during your rental
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-2" role="radiogroup" aria-label="Protection Plan">
        {INSURANCE_OPTIONS.map((option) => {
          const cost = calculateInsuranceCost(rentalSubtotal, option.type);
          const isSelected = selectedInsurance === option.type;

          return (
            <button
              key={option.type}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${option.label} - ${
                cost > 0 ? `$${cost.toFixed(2)}` : "Free"
              }`}
              onClick={() => onInsuranceChange(option.type)}
              onKeyDown={(e) => handleKeyDown(e, option.type)}
              className={cn(
                "w-full text-left rounded-lg border transition-all",
                "hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isSelected
                  ? "border-foreground bg-muted/50"
                  : "border-border bg-background"
              )}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Radio indicator */}
                <div
                  className={cn(
                    "flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all",
                    "flex items-center justify-center",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40"
                  )}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {cost > 0 ? `+$${cost.toFixed(2)}` : "Free"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed flex items-center gap-1">
                    {option.coverage}
                    {(option.type === "basic" || option.type === "premium") && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            role="button"
                            tabIndex={0}
                            className="inline-flex cursor-help"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            aria-label={`${option.label} details`}
                          >
                            <HelpCircle className="h-3 w-3 text-muted-foreground/70" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">
                          {option.type === "basic"
                            ? "Covers minor scratches and small repairs up to $100"
                            : "Full coverage including major damage, theft protection up to $500"}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </p>
                </div>

                {/* Selected checkmark */}
                {isSelected && (
                  <CheckCircle2 className="flex-shrink-0 h-4 w-4 text-primary" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed flex items-center gap-1">
        Covers accidental damage during your rental period.
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle
              className="h-3 w-3 cursor-help text-muted-foreground/70"
              aria-label="Coverage period details"
            />
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px]">
            Coverage applies only during the agreed rental period
          </TooltipContent>
        </Tooltip>
      </p>
    </div>
  );
};

export default InsuranceSelector;
