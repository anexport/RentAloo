import { Camera, ClipboardCheck, FileCheck, ShieldCheck, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { InspectionType } from "@/types/inspection";

interface InspectionIntroStepProps {
  equipmentTitle: string;
  equipmentImageUrl?: string;
  inspectionType: InspectionType;
  className?: string;
}

const INSPECTION_STEPS = [
  {
    icon: Camera,
    title: "Take Photos",
    description: "Capture at least 3 photos from different angles",
  },
  {
    icon: ClipboardCheck,
    title: "Check Condition",
    description: "Review each item on the checklist",
  },
  {
    icon: FileCheck,
    title: "Confirm & Submit",
    description: "Review and confirm your inspection",
  },
];

export default function InspectionIntroStep({
  equipmentTitle,
  equipmentImageUrl,
  inspectionType,
  className,
}: InspectionIntroStepProps) {
  const isPickup = inspectionType === "pickup";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header - centered on mobile */}
      <div className="flex flex-col items-center text-center gap-2">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 shrink-0">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 mb-0.5">
            <h1 className="text-xl font-semibold tracking-tight">
              {isPickup ? "Pickup" : "Return"} Inspection
            </h1>
            <Badge variant="secondary" className="text-xs shrink-0">
              {isPickup ? "Pickup" : "Return"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {isPickup
              ? `Document condition before the rental begins`
              : `Document condition upon return`}
          </p>
        </div>
      </div>

      {/* Compact Equipment Row */}
      <div className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-muted/30">
        <div className="h-12 w-14 rounded-md bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border">
          {equipmentImageUrl ? (
            <img
              src={equipmentImageUrl}
              alt={equipmentTitle}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <Camera className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Equipment</p>
          <p className="font-medium text-sm truncate">{equipmentTitle}</p>
        </div>
      </div>

      {/* Numbered Steps List - Compact */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2.5 text-center">What you'll do</h3>
        <div className="space-y-2.5">
          {INSPECTION_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex items-start gap-3">
                {/* Step number circle */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {index + 1}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="text-sm font-medium">{step.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Why it matters - Compact Alert */}
      <Alert className="py-2.5 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-xs font-medium text-amber-800 dark:text-amber-200">
          Why this matters
        </AlertTitle>
        <AlertDescription className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
          {isPickup
            ? "Documents equipment condition to help resolve any disputes."
            : "Required to complete the rental and release the security deposit."}
        </AlertDescription>
      </Alert>

      {/* Estimated time */}
      <p className="text-[11px] text-muted-foreground text-center">
        ~3 minutes
      </p>
    </div>
  );
}
