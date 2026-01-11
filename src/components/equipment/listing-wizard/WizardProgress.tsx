import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS, TOTAL_STEPS } from "./hooks/useListingWizard";

interface WizardProgressProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  completedSteps?: number[];
}

export default function WizardProgress({
  currentStep,
  onStepClick,
  completedSteps = [],
}: WizardProgressProps) {
  return (
    <div className="w-full">
      {/* Desktop Progress */}
      <div className="hidden sm:flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id) || step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = onStepClick && (isCompleted || step.id <= currentStep);

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle + Label */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center gap-2 transition-all",
                  isClickable ? "cursor-pointer" : "cursor-default"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                    isCompleted && !isCurrent
                      ? "bg-primary border-primary text-primary-foreground"
                      : isCurrent
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.id}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isCurrent
                      ? "text-primary"
                      : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.name}
                </span>
              </button>

              {/* Connector Line */}
              {index < TOTAL_STEPS - 1 && (
                <div className="flex-1 mx-3 h-0.5 bg-muted-foreground/20 relative">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 bg-primary transition-all duration-500",
                      step.id < currentStep ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Progress */}
      <div className="sm:hidden">
        {/* Progress Bar */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {currentStep}/{TOTAL_STEPS}
          </span>
        </div>

        {/* Current Step Label */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-semibold text-primary-foreground">{currentStep}</span>
          </div>
          <span className="text-base font-semibold text-foreground">
            {WIZARD_STEPS[currentStep - 1]?.name}
          </span>
        </div>
      </div>
    </div>
  );
}
