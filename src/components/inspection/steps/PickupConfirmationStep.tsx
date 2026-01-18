import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Camera,
  ClipboardCheck,
  MapPin,
  Clock,
  Calendar,
  Loader2,
  PartyPopper,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { formatBookingDate, formatBookingDuration } from "@/lib/booking";
import type { ChecklistItem } from "@/types/inspection";
import { toast } from "sonner";

interface RentalPeriodInfo {
  startDate: string;
  endDate: string;
  returnTime?: string;
}

interface InspectionSummary {
  photosCount: number;
  checklistItemsCount: number;
  checklistPassedCount: number;
  timestamp: string;
  location?: { lat: number; lng: number } | null;
}

interface PickupConfirmationStepProps {
  bookingId: string;
  equipmentTitle: string;
  rentalPeriod: RentalPeriodInfo;
  inspectionSummary: InspectionSummary;
  checklistItems: ChecklistItem[];
  onSuccess: () => void;
  className?: string;
}

export default function PickupConfirmationStep({
  bookingId,
  equipmentTitle,
  rentalPeriod,
  inspectionSummary,
  checklistItems,
  onSuccess,
  className,
}: PickupConfirmationStepProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const isMountedRef = useRef(true);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const handleStartRental = async () => {
    setError("");
    setIsActivating(true);

    try {
      const { error: activateError } = await supabase.rpc("activate_rental", {
        p_booking_id: bookingId,
      });

      if (activateError) {
        throw new Error(activateError.message);
      }

      // Send system message (non-critical)
      try {
        const { data: conversation } = await supabase
          .from("conversations")
          .select("id")
          .eq("booking_request_id", bookingId)
          .single();

        if (conversation?.id) {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            await supabase.from("messages").insert({
              conversation_id: conversation.id,
              sender_id: userData.user.id,
              content: `🎉 Rental started! ${equipmentTitle} is now in the renter's care.`,
              message_type: "system",
            });
          }
        }
      } catch (msgErr) {
        console.error("Error sending system message:", msgErr);
      }

      setIsComplete(true);
      toast.success("Rental Started!");
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          onSuccess();
        }
      }, 2000);
    } catch (err) {
      console.error("Error activating rental:", err);
      setError(err instanceof Error ? err.message : "Failed to start rental.");
    } finally {
      setIsActivating(false);
    }
  };

  const statusCounts = checklistItems.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const allItemsGood = statusCounts.good === checklistItems.length;

  // Success state
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3 animate-in fade-in duration-500">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
          <PartyPopper className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-center">Rental Started!</h2>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Return by {formatBookingDate(rentalPeriod.endDate)}.
        </p>
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
        <h2 className="text-lg font-semibold">Pickup Complete!</h2>
        <p className="text-sm text-muted-foreground">
          Confirm to start your rental.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Inspection Summary */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="p-3 space-y-2.5">
          <h3 className="text-xs font-medium text-green-800 dark:text-green-200 flex items-center gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Inspection Summary
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{inspectionSummary.photosCount}</p>
                <p className="text-[10px] text-muted-foreground">photos</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
              <CheckCircle2
                className={cn(
                  "h-4 w-4",
                  allItemsGood ? "text-green-600" : "text-amber-600"
                )}
              />
              <div>
                <p className="text-sm font-medium">
                  {inspectionSummary.checklistPassedCount}/{inspectionSummary.checklistItemsCount}
                </p>
                <p className="text-[10px] text-muted-foreground">items</p>
              </div>
            </div>

            {inspectionSummary.location && (
              <div className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Location</p>
                  <p className="text-xs">Verified</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Time</p>
                <p className="text-xs">
                  {new Date(inspectionSummary.timestamp).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rental Period */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <h3 className="text-xs font-medium flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Rental Period
          </h3>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between rounded-md bg-muted/50 px-2 py-1.5">
              <span className="text-muted-foreground">Equipment</span>
              <span className="font-medium truncate ml-2 text-right">{equipmentTitle}</span>
            </div>
            <div className="flex justify-between rounded-md bg-muted/50 px-2 py-1.5">
              <span className="text-muted-foreground">Start</span>
              <span className="font-medium">{formatBookingDate(rentalPeriod.startDate)}</span>
            </div>
            <div className="flex justify-between rounded-md bg-muted/50 px-2 py-1.5">
              <span className="text-muted-foreground">End</span>
              <span className="font-medium">{formatBookingDate(rentalPeriod.endDate)}</span>
            </div>
            <div className="flex justify-between rounded-md bg-muted/50 px-2 py-1.5">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">
                {formatBookingDuration(rentalPeriod.startDate, rentalPeriod.endDate)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notice */}
      <p className="text-[11px] text-muted-foreground text-center px-4">
        By starting, you accept responsibility for the equipment. Return it in the same condition.
      </p>

      {/* Fixed bottom action bar */}
      <div className="fixed left-0 right-0 z-40 bottom-16 md:bottom-0 p-3 bg-background/95 backdrop-blur-lg border-t">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={() => void handleStartRental()}
            disabled={isActivating}
            className="w-full h-11 font-medium text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isActivating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <PartyPopper className="h-4 w-4 mr-1.5" />
                Start My Rental
              </>
            )}
          </Button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)] md:hidden" />
      </div>
    </div>
  );
}
