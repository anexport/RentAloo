import { Shield, CheckCircle2 } from "lucide-react";
import { INSURANCE_OPTIONS, calculateInsuranceCost } from "@/lib/booking";
import type { InsuranceType } from "@/types/booking";
import { cn } from "@/lib/utils";

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
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {option.coverage}
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

      <p className="text-xs text-muted-foreground leading-relaxed">
        Covers accidental damage during your rental period.
      </p>
    </div>
  );
};

export default InsuranceSelector;
