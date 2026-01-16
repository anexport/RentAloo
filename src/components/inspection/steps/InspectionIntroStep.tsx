import { Camera, ClipboardCheck, FileCheck, ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { InspectionType } from "@/types/inspection";

interface InspectionIntroStepProps {
  equipmentTitle: string;
  equipmentImageUrl?: string;
  inspectionType: InspectionType;
  isOwner: boolean;
  onContinue: () => void;
  className?: string;
}

const INSPECTION_STEPS = [
  {
    icon: Camera,
    title: "Take Photos",
    description:
      "Capture at least 3 photos of the equipment from different angles",
  },
  {
    icon: ClipboardCheck,
    title: "Check Condition",
    description: "Review each item on the checklist and note any issues",
  },
  {
    icon: FileCheck,
    title: "Confirm & Submit",
    description: "Review your inspection and confirm everything is accurate",
  },
];

export default function InspectionIntroStep({
  equipmentTitle,
  equipmentImageUrl,
  inspectionType,
  isOwner,
  onContinue,
  className,
}: InspectionIntroStepProps) {
  const isPickup = inspectionType === "pickup";
  const role = isOwner ? "owner" : "renter";

  return (
    <div className={cn("py-5 md:py-6", className)}>
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-xl md:text-2xl font-bold tracking-tight">
                  {isPickup ? "Pickup" : "Return"} Inspection
                </CardTitle>
                <Badge variant="secondary" className="shrink-0">
                  {isPickup ? "Pickup" : "Return"}
                </Badge>
              </div>
              <CardDescription className="text-sm">
                {isPickup
                  ? `As the ${role}, document the equipment condition before the rental begins.`
                  : `As the ${role}, document the equipment condition upon return.`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Compact Equipment Row */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-background/70 shadow-sm">
            <div className="h-16 w-20 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border">
              {equipmentImageUrl ? (
                <img
                  src={equipmentImageUrl}
                  alt={equipmentTitle}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <Camera className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">Equipment</p>
              <p className="font-semibold text-sm truncate">{equipmentTitle}</p>
            </div>
          </div>

          {/* Timeline-style Steps List */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold mb-3">What you&apos;ll do</h3>
            <div className="relative pl-8 space-y-0">
              {/* Timeline line - centered on h-8 (32px) icons
                  Icon center = pl-8 (32px) + h-8/2 (16px) = 48px = left-12 */}
              <div className="absolute left-12 top-0 bottom-0 w-px bg-muted" />
              
              {INSPECTION_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === INSPECTION_STEPS.length - 1;
                // Dynamic positioning for timeline dots based on step index
                const dotPositions = [
                  { left: 16, top: 1 }, // Step 0
                  { left: 17, top: 2 }, // Step 1
                  { left: 16, top: 0 }, // Step 2
                ];
                const dotPosition = dotPositions[index] || { left: 16, top: 0 };
                return (
                  <div
                    key={step.title}
                    className={cn(
                      "relative flex gap-3 py-2 rounded-lg hover:bg-muted/60 transition-colors",
                      !isLast && "pb-4"
                    )}
                  >
                    {/* Timeline dot - positioned dynamically per step */}
                    <div 
                      className="absolute h-2 w-2 -translate-x-1/2 rounded-full bg-primary border-2 border-background z-10" 
                      style={{ left: `${dotPosition.left}px`, top: `${dotPosition.top}px` }}
                    />
                    
                    {/* Icon in circle */}
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    
                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Step {index + 1}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Why it matters - Alert style callout */}
          <Alert className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Why this matters
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {isPickup
                ? "This inspection protects both parties by documenting the equipment's condition before the rental. It helps resolve any disputes about damage."
                : "The return inspection confirms the equipment's condition and is required to complete the rental and release the security deposit."}
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex-col gap-2">
          <Button
            onClick={onContinue}
            size="lg"
            className="w-full h-12 text-base font-semibold"
          >
            <Camera className="h-5 w-5 mr-2" />
            Begin Inspection
          </Button>
          <p className="text-xs text-muted-foreground">
            Estimated time: 3-5 minutes
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
