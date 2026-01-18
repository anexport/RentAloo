import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Camera,
  ClipboardCheck,
  MapPin,
  Clock,
  Loader2,
  PartyPopper,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Star,
  Shield,
  Banknote,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { ChecklistItem, ChecklistItemStatus } from "@/types/inspection";

interface InspectionSummary {
  photosCount: number;
  checklistItemsCount: number;
  checklistPassedCount: number;
  timestamp: string;
  location?: { lat: number; lng: number } | null;
}

interface ConditionComparison {
  pickupInspection: InspectionSummary | null;
  returnInspection: InspectionSummary;
  pickupChecklistItems: ChecklistItem[];
  returnChecklistItems: ChecklistItem[];
}

interface DepositInfo {
  amount: number;
  claimWindowHours: number;
}

interface ReturnConfirmationStepProps {
  bookingId: string;
  equipmentTitle: string;
  conditionComparison: ConditionComparison;
  depositInfo?: DepositInfo;
  onSuccess: () => void;
  onReviewClick?: () => void;
  className?: string;
}

const STATUS_CONFIG = {
  good: {
    icon: CheckCircle2,
    label: "Good",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  fair: {
    icon: AlertTriangle,
    label: "Fair",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  damaged: {
    icon: AlertCircle,
    label: "Damaged",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
};

const getStatusCounts = (items: ChecklistItem[]) => {
  return items.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<ChecklistItemStatus, number>
  );
};

const hasConditionDegraded = (
  pickupItems: ChecklistItem[],
  returnItems: ChecklistItem[]
): boolean => {
  const statusValue: Record<ChecklistItemStatus, number> = {
    good: 3,
    fair: 2,
    damaged: 1,
  };

  return returnItems.some((returnItem) => {
    const pickupItem = pickupItems.find((p) => p.item === returnItem.item);
    if (!pickupItem) return false;
    return statusValue[returnItem.status] < statusValue[pickupItem.status];
  });
};

const getDegradedItems = (
  pickupItems: ChecklistItem[],
  returnItems: ChecklistItem[]
): Array<{
  item: string;
  from: ChecklistItemStatus;
  to: ChecklistItemStatus;
}> => {
  const statusValue: Record<ChecklistItemStatus, number> = {
    good: 3,
    fair: 2,
    damaged: 1,
  };

  return returnItems
    .map((returnItem) => {
      const pickupItem = pickupItems.find((p) => p.item === returnItem.item);
      if (!pickupItem) return null;
      if (statusValue[returnItem.status] < statusValue[pickupItem.status]) {
        return {
          item: returnItem.item,
          from: pickupItem.status,
          to: returnItem.status,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{
    item: string;
    from: ChecklistItemStatus;
    to: ChecklistItemStatus;
  }>;
};

export default function ReturnConfirmationStep({
  bookingId,
  equipmentTitle,
  conditionComparison,
  depositInfo,
  onSuccess,
  onReviewClick,
  className,
}: ReturnConfirmationStepProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const {
    pickupInspection,
    returnInspection,
    pickupChecklistItems,
    returnChecklistItems,
  } = conditionComparison;

  const hasDamage =
    pickupInspection &&
    hasConditionDegraded(pickupChecklistItems, returnChecklistItems);
  const degradedItems = pickupInspection
    ? getDegradedItems(pickupChecklistItems, returnChecklistItems)
    : [];

  const pickupCounts = getStatusCounts(pickupChecklistItems);
  const returnCounts = getStatusCounts(returnChecklistItems);

  const handleSubmitForOwnerReview = async () => {
    setError("");
    setIsCompleting(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Authentication required");

      // First, check current booking status
      const { data: booking, error: fetchError } = await supabase
        .from("booking_requests")
        .select("status")
        .eq("id", bookingId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      // If still in 'active', first initiate the return
      if (booking.status === "active") {
        const { data: initiateResult, error: initiateError } = await supabase.functions.invoke(
          "transition-rental-state",
          {
            body: {
              booking_id: bookingId,
              action: "initiate_return",
            },
          }
        );

        if (initiateError) throw new Error(initiateError.message);
        if (!initiateResult?.success) throw new Error(initiateResult?.error || "Failed to initiate return");
      }

      // Now complete the return inspection to move to pending_owner_review
      const { data: result, error: transitionError } = await supabase.functions.invoke(
        "transition-rental-state",
        {
          body: {
            booking_id: bookingId,
            action: "complete_return_inspection",
          },
        }
      );

      if (transitionError) throw new Error(transitionError.message);
      if (!result?.success) throw new Error(result?.error || "Failed to submit for review");

      // Send system message (non-critical)
      try {
        const { data: conversation } = await supabase
          .from("conversations")
          .select("id")
          .eq("booking_request_id", bookingId)
          .single();

        if (conversation?.id) {
          await supabase.from("messages").insert({
            conversation_id: conversation.id,
            sender_id: user.id,
            content: `📋 Return inspection completed for ${equipmentTitle}. Awaiting owner confirmation.`,
            message_type: "system",
          });
        }
      } catch (msgErr) {
        console.error("Error sending system message:", msgErr);
      }

      setIsComplete(true);
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) onSuccess();
      }, 2500);
    } catch (err) {
      console.error("Error submitting for owner review:", err);
      setError(err instanceof Error ? err.message : "Failed to submit for review.");
    } finally {
      setIsCompleting(false);
    }
  };

  // Success state - Awaiting owner confirmation
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in fade-in duration-500">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
          <UserCheck className="h-8 w-8 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">Submitted for Review!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            The owner will review and confirm the return.
          </p>
        </div>

        {depositInfo && (
          <Card className="w-full max-w-xs border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-3 flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                  Deposit Status
                </p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  ${depositInfo.amount.toFixed(2)} held until owner confirms
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="w-full max-w-xs border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-3 flex items-start gap-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                What happens next?
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Owner reviews the return inspection and confirms completion. You'll be notified once done.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
          <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-lg font-semibold">Return Complete!</h2>
        <p className="text-sm text-muted-foreground">
          Review and complete your rental.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Condition Comparison */}
      {pickupInspection && (
        <Card>
          <CardContent className="p-3 space-y-2.5">
            <h3 className="text-xs font-medium">Condition Comparison</h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-md bg-muted/50 space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase">Pickup</p>
                <div className="flex flex-wrap gap-1">
                  {(["good", "fair", "damaged"] as const).map((status) => {
                    const count = pickupCounts[status] || 0;
                    if (count === 0) return null;
                    const config = STATUS_CONFIG[status];
                    return (
                      <Badge
                        key={status}
                        variant="secondary"
                        className={cn("text-[10px] px-1.5 py-0", config.bgColor, config.color)}
                      >
                        {count}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="p-2 rounded-md bg-muted/50 space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase">Return</p>
                <div className="flex flex-wrap gap-1">
                  {(["good", "fair", "damaged"] as const).map((status) => {
                    const count = returnCounts[status] || 0;
                    if (count === 0) return null;
                    const config = STATUS_CONFIG[status];
                    return (
                      <Badge
                        key={status}
                        variant="secondary"
                        className={cn("text-[10px] px-1.5 py-0", config.bgColor, config.color)}
                      >
                        {count}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            {!hasDamage ? (
              <div className="flex items-center gap-1.5 p-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-800 dark:text-green-200">
                  No damage detected
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    Changes detected
                  </span>
                </div>
                <div className="space-y-1">
                  {degradedItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1.5 text-xs p-1.5 rounded bg-muted/50"
                    >
                      <span className="flex-1 truncate">{item.item}</span>
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px] px-1 py-0", STATUS_CONFIG[item.from].bgColor, STATUS_CONFIG[item.from].color)}
                      >
                        {STATUS_CONFIG[item.from].label}
                      </Badge>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px] px-1 py-0", STATUS_CONFIG[item.to].bgColor, STATUS_CONFIG[item.to].color)}
                      >
                        {STATUS_CONFIG[item.to].label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inspection Summary */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <h3 className="text-xs font-medium flex items-center gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
            Return Inspection
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{returnInspection.photosCount}</p>
                <p className="text-[10px] text-muted-foreground">photos</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {returnInspection.checklistPassedCount}/{returnInspection.checklistItemsCount}
                </p>
                <p className="text-[10px] text-muted-foreground">items</p>
              </div>
            </div>

            {returnInspection.location && (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs">Verified</p>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs">
                {new Date(returnInspection.timestamp).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposit Info */}
      {depositInfo && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-3 flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                Deposit: ${depositInfo.amount.toFixed(2)}
              </p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400">
                Released in {depositInfo.claimWindowHours}h if no claim filed
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fixed bottom action bar */}
      <div className="fixed left-0 right-0 z-40 bottom-16 md:bottom-0 p-3 bg-background/95 backdrop-blur-lg border-t">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={() => void handleCompleteRental()}
            disabled={isCompleting}
            className="w-full h-11 font-medium text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isCompleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-1.5" />
                Submit for Owner Review
              </>
            )}
          </Button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)] md:hidden" />
      </div>
    </div>
  );
}
