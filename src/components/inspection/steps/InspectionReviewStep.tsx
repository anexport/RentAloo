import { useState } from "react";
import {
  Camera,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChecklistItem, InspectionType } from "@/types/inspection";

interface InspectionReviewStepProps {
  photos: File[];
  photoPreviews: string[];
  checklistItems: ChecklistItem[];
  conditionNotes: string;
  onConditionNotesChange: (notes: string) => void;
  inspectionType: InspectionType;
  isOwner: boolean;
  confirmed: boolean;
  onConfirmChange: (confirmed: boolean) => void;
  className?: string;
}

const STATUS_CONFIG = {
  good: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  fair: {
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  damaged: {
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
};

export default function InspectionReviewStep({
  photos,
  photoPreviews,
  checklistItems,
  conditionNotes,
  onConditionNotesChange,
  inspectionType,
  isOwner,
  confirmed,
  onConfirmChange,
  className,
}: InspectionReviewStepProps) {
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const safePhotos = photos ?? [];
  const safePhotoPreviews = photoPreviews ?? [];
  const safeChecklistItems = checklistItems ?? [];

  const role = isOwner ? "owner" : "renter";

  // Count statuses
  const statusCounts = safeChecklistItems.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const hasIssues =
    (statusCounts.fair || 0) > 0 || (statusCounts.damaged || 0) > 0;

  const visiblePreviews = showAllPhotos
    ? safePhotoPreviews
    : safePhotoPreviews.slice(0, 4);
  const remainingPhotos = Math.max(
    safePhotoPreviews.length - visiblePreviews.length,
    0
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">
          Review {inspectionType === "pickup" ? "pickup" : "return"} inspection
        </p>
        <h2 className="text-lg font-semibold tracking-tight">
          Review & Confirm
        </h2>
        <p className="text-sm text-muted-foreground">
          Double-check before submitting.
        </p>
      </div>

      {/* Photos Card */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Photos</p>
              <p className="text-xs text-muted-foreground">
                {safePhotos.length} captured
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {visiblePreviews.map((preview, index) => {
              const isLastVisible =
                !showAllPhotos &&
                remainingPhotos > 0 &&
                index === visiblePreviews.length - 1;

              return (
                <div
                  key={`${preview}-${index}`}
                  className="relative aspect-square rounded-md overflow-hidden border bg-muted"
                >
                  <img
                    src={preview}
                    alt={`Photo ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {isLastVisible && (
                    <button
                      type="button"
                      onClick={() => setShowAllPhotos(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs font-medium"
                      aria-label={`Show ${remainingPhotos} more photos`}
                    >
                      +{remainingPhotos}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {safePhotoPreviews.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllPhotos((prev) => !prev)}
              className="h-7 text-xs w-full"
            >
              {showAllPhotos ? "Show less" : `View all ${safePhotoPreviews.length}`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Checklist Card */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Checklist</p>
              <p className="text-xs text-muted-foreground">
                {safeChecklistItems.length} items
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(["good", "fair", "damaged"] as const).map((status) => {
              const count = statusCounts[status] || 0;
              if (count === 0) return null;
              const config = STATUS_CONFIG[status];
              const Icon = config.icon;
              return (
                <div
                  key={status}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                    config.bgColor
                  )}
                >
                  <Icon className={cn("h-3 w-3", config.color)} />
                  <span className={config.color}>{count}</span>
                </div>
              );
            })}
          </div>

          {hasIssues && (
            <div className="space-y-1.5 border-t pt-2">
              <p className="text-xs font-medium text-muted-foreground">
                Issues noted:
              </p>
              {safeChecklistItems
                .filter((item) => item.status !== "good")
                .map((item, index) => {
                  const config = STATUS_CONFIG[item.status];
                  const Icon = config.icon;
                  return (
                    <div
                      key={`${item.item}-${index}`}
                      className={cn(
                        "flex items-start gap-1.5 p-2 rounded-md text-xs",
                        config.bgColor
                      )}
                    >
                      <Icon
                        className={cn("h-3 w-3 mt-0.5 shrink-0", config.color)}
                      />
                      <div>
                        <p className={cn("font-medium", config.color)}>
                          {item.item}
                        </p>
                        {item.notes && (
                          <p className="text-muted-foreground mt-0.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="condition-notes" className="text-xs">Additional Notes (Optional)</Label>
        <Textarea
          id="condition-notes"
          value={conditionNotes}
          onChange={(e) => onConditionNotesChange(e.target.value)}
          placeholder="Any additional observations..."
          rows={2}
          className="resize-none text-sm"
        />
      </div>

      {/* Confirmation */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="p-3">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="confirmation"
              checked={confirmed}
              onCheckedChange={(checked) => onConfirmChange(checked === true)}
              className="mt-0.5 h-5 w-5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="confirmation"
                className="text-sm font-medium cursor-pointer leading-tight"
              >
                I confirm this inspection is accurate
              </Label>
              <p className="text-[11px] text-muted-foreground">
                As the {role}, I certify this accurately represents the
                equipment's state. This may be used to resolve disputes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Note */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
        <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
        <div>
          <p className="text-xs font-medium text-green-800 dark:text-green-200">
            Secure & Protected
          </p>
          <p className="text-[11px] text-green-700 dark:text-green-300">
            Timestamped and securely stored.
          </p>
        </div>
      </div>
    </div>
  );
}
