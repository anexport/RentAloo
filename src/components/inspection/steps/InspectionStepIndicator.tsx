import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InspectionStep {
  id: string;
  title: string;
  description?: string;
}

interface InspectionStepIndicatorProps {
  steps: InspectionStep[];
  currentStep: number;
  className?: string;
}

export function InspectionStepIndicator({
  steps,
  currentStep,
  className,
}: InspectionStepIndicatorProps) {
  const clampedStep = Math.min(
    Math.max(currentStep, 0),
    Math.max(steps.length - 1, 0)
  );
  const progressPercent =
    steps.length > 1 ? (clampedStep / (steps.length - 1)) * 100 : 100;

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile: progress bar + dots */}
      <div className="space-y-2 sm:hidden">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {steps[clampedStep]?.title}
          </span>
          <span>
            Step {clampedStep + 1} of {steps.length}
          </span>
        </div>

        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
            aria-hidden="true"
          />
        </div>

        <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
          {steps.map((step, index) => {
            const isCurrent = index === clampedStep;
            const isComplete = index < clampedStep;
            return (
              <span
                key={step.id}
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-200",
                  isCurrent && "h-2.5 w-2.5 bg-primary shadow-sm",
                  isComplete && !isCurrent && "bg-primary/70",
                  !isCurrent && !isComplete && "bg-muted-foreground/40"
                )}
              />
            );
          })}
        </div>

        {steps[clampedStep]?.description && (
          <p className="text-xs text-muted-foreground text-center">
            {steps[clampedStep].description}
          </p>
        )}
      </div>

      {/* Desktop: keep detailed stepper */}
      <div className="hidden sm:flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < clampedStep;
          const isCurrent = index === clampedStep;
          const isUpcoming = index > clampedStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className={cn("flex flex-col", !isLast && "flex-1")}>
              <div className="flex items-center w-full">
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isCompleted &&
                        "border-primary bg-primary text-primary-foreground",
                      isCurrent &&
                        "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
                      isUpcoming &&
                        "border-muted-foreground/30 bg-muted text-muted-foreground"
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`${step.title}${isCompleted ? " (completed)" : isCurrent ? " (current)" : " (upcoming)"}`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs font-medium text-center line-clamp-1 hidden sm:block w-24",
                      isCompleted && "text-primary",
                      isCurrent && "text-primary font-semibold",
                      isUpcoming && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 mx-3 transition-colors duration-300 self-start mt-5",
                      index < clampedStep ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
