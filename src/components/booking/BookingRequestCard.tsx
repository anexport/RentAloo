import { useState, useEffect, useId } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useMessaging } from "@/hooks/useMessaging";
import { usePayment } from "@/hooks/usePayment";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { BookingRequestWithDetails } from "../../types/booking";
import type { Database } from "@/lib/database.types";
import { formatBookingDuration, getBookingStatusText } from "../../lib/booking";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  User,
  MessageSquare,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import MessagingInterface from "../messaging/MessagingInterface";
import RenterScreening from "../verification/RenterScreening";
import {
  InspectionFlowBanner,
  BookingLifecycleStepper,
  MobileInspectionCard,
} from "./inspection-flow";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isFuture } from "date-fns";

type InspectionRow =
  Database["public"]["Tables"]["equipment_inspections"]["Row"];

type BookingStatus = BookingRequestWithDetails["status"];

interface StatusBadgeConfig {
  className: string;
  text: string;
}

/**
 * Returns the status badge configuration based on booking status and payment state
 */
function getStatusBadgeConfig(
  status: BookingStatus | undefined,
  hasPayment: boolean
): StatusBadgeConfig {
  if (status === "active") {
    return {
      className:
        "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
      text: "In Progress",
    };
  }
  if (status === "approved" && hasPayment) {
    return {
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
      text: "Confirmed",
    };
  }
  if (status === "pending") {
    return {
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      text: getBookingStatusText(status),
    };
  }
  if (status === "cancelled") {
    return {
      className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
      text: getBookingStatusText(status),
    };
  }
  // Default fallback for unknown or undefined status
  return {
    className: "bg-muted text-muted-foreground",
    text: status ? getBookingStatusText(status) : "Unknown",
  };
}

interface BookingRequestCardProps {
  bookingRequest: BookingRequestWithDetails;
  onStatusChange?: () => void;
  showActions?: boolean;
}

const BookingRequestCard = ({
  bookingRequest,
  onStatusChange,
  showActions = true,
}: BookingRequestCardProps) => {
  const { user } = useAuth();
  const { getOrCreateConversation } = useMessaging();
  const { processRefund } = usePayment();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [isUpdating, setIsUpdating] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasPayment, setHasPayment] = useState(false);
  const [showRenterScreening, setShowRenterScreening] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [pickupInspectionId, setPickupInspectionId] = useState<string | null>(
    null
  );
  const [returnInspection, setReturnInspection] = useState<Pick<
    InspectionRow,
    | "id"
    | "verified_by_owner"
    | "verified_by_renter"
    | "timestamp"
    | "created_at"
  > | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = useId();

  // Check if inspections exist for this booking (initial fetch only)
  // Real-time updates are handled by useBookingSubscriptions in parent component
  useEffect(() => {
    const checkInspections = async () => {
      try {
        // Check for pickup inspection
        const { data: pickupData, error: pickupError } = await supabase
          .from("equipment_inspections")
          .select("id")
          .eq("booking_id", bookingRequest.id)
          .eq("inspection_type", "pickup")
          .maybeSingle();

        if (pickupError) {
          console.error("Error checking pickup inspection:", pickupError);
        } else {
          setPickupInspectionId(pickupData?.id || null);
        }

        // Check for return inspection
        const { data: returnData, error: returnError } = await supabase
          .from("equipment_inspections")
          .select(
            "id, verified_by_owner, verified_by_renter, timestamp, created_at"
          )
          .eq("booking_id", bookingRequest.id)
          .eq("inspection_type", "return")
          .maybeSingle();

        if (returnError) {
          console.error("Error checking return inspection:", returnError);
        } else {
          setReturnInspection(returnData ?? null);
        }
      } catch (error) {
        console.error("Error checking inspection status:", error);
      }
    };

    void checkInspections();
  }, [bookingRequest.id]);

  // Check if payment exists for this booking (initial fetch only)
  // Real-time updates are handled by useBookingSubscriptions in parent component
  useEffect(() => {
    const checkPayment = async () => {
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("id")
          .eq("booking_request_id", bookingRequest.id)
          .eq("payment_status", "succeeded")
          .maybeSingle();

        if (error) {
          console.error("Error checking payment status:", error);
          setHasPayment(false);
          return;
        }

        setHasPayment(!!data);
      } catch (error) {
        console.error("Error checking payment status:", error);
        setHasPayment(false);
      }
    };

    void checkPayment();
  }, [bookingRequest.id]);

  const handleStatusUpdate = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      isOwner
        ? "Are you sure you want to cancel this booking? The renter will receive a full refund."
        : "Are you sure you want to cancel this booking? You will receive a full refund."
    );
    if (!confirmed) return;

    setIsUpdating(true);

    try {
      if (hasPayment) {
        const { data: payment } = await supabase
          .from("payments")
          .select("id, stripe_payment_intent_id")
          .eq("booking_request_id", bookingRequest.id)
          .eq("payment_status", "succeeded")
          .single();

        if (payment) {
          const refundSuccess = await processRefund({
            paymentId: payment.id,
            reason: isOwner
              ? "Booking cancelled by owner"
              : "Booking cancelled by renter",
          });

          if (!refundSuccess) {
            throw new Error(
              "Refund processing failed. Please contact support to cancel this booking."
            );
          }
        }
      }

      const { error } = await supabase
        .from("booking_requests")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingRequest.id);

      if (error) throw error;

      try {
        const otherUserId = isOwner
          ? bookingRequest.renter_id
          : bookingRequest.owner.id;

        const conversation = await getOrCreateConversation(
          [otherUserId],
          bookingRequest.id
        );

        if (conversation) {
          await supabase.from("messages").insert({
            conversation_id: conversation.id,
            sender_id: user.id,
            content: `Booking has been cancelled. ${
              hasPayment ? "A full refund will be processed." : ""
            }`,
            message_type: "booking_cancelled",
          });
        }
      } catch (msgError) {
        console.error("Error sending cancellation message:", msgError);
      }

      onStatusChange?.();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenMessaging = async () => {
    if (!user) return;

    setIsLoadingConversation(true);

    try {
      const otherUserId = isOwner
        ? bookingRequest.renter_id
        : bookingRequest.owner.id;

      const conversation = await getOrCreateConversation(
        [otherUserId],
        bookingRequest.id
      );

      if (conversation) {
        setConversationId(conversation.id);
        setShowMessaging(true);
      } else {
        alert("Failed to start conversation. Please try again.");
      }
    } catch (error) {
      console.error("Error opening messaging:", error);
      alert("Failed to start conversation. Please try again.");
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const isOwner = user?.id === bookingRequest.owner.id;
  const isRenter = user?.id === bookingRequest.renter.id;
  // Can cancel if:
  // - Status is "approved" (before rental starts)
  // - Status is "active" BUT pickup inspection not completed (can still cancel before equipment handoff)
  // - Status is "active" AND pickup inspection completed (requires return flow, not simple cancellation)
  const canCancel =
    (isOwner || isRenter) &&
    (bookingRequest.status === "approved" ||
      (bookingRequest.status === "active" && !pickupInspectionId));

  // Get equipment image
  const equipmentImage =
    bookingRequest.equipment.photos &&
    bookingRequest.equipment.photos.length > 0
      ? bookingRequest.equipment.photos.find((p) => p.is_primary)?.photo_url ||
        bookingRequest.equipment.photos[0]?.photo_url
      : null;

  // Calculate booking timeline
  const startDate = new Date(bookingRequest.start_date);
  const endDate = new Date(bookingRequest.end_date);
  const today = new Date();
  const daysUntilStart = differenceInDays(startDate, today);
  const claimWindowHours =
    bookingRequest.equipment.deposit_refund_timeline_hours || 48;
  const returnInspectionSubmittedAt =
    returnInspection?.timestamp || returnInspection?.created_at;
  const claimDeadlineMs = returnInspectionSubmittedAt
    ? new Date(returnInspectionSubmittedAt).getTime() +
      claimWindowHours * 60 * 60 * 1000
    : null;
  const isClaimWindowExpired =
    typeof claimDeadlineMs === "number" && Date.now() > claimDeadlineMs;
  const needsOwnerReturnReview =
    isOwner &&
    !!returnInspection?.id &&
    !!returnInspection.verified_by_renter &&
    !returnInspection.verified_by_owner &&
    !isClaimWindowExpired;

  // Determine if we should show the inspection flow banner prominently
  // Show for approved (pickup inspection) and active (return inspection) bookings
  const shouldShowInspectionBanner =
    hasPayment &&
    (bookingRequest.status === "approved" ||
      bookingRequest.status === "active" ||
      (bookingRequest.status === "completed" && needsOwnerReturnReview)) &&
    (!isOwner ||
      !!pickupInspectionId ||
      bookingRequest.status === "active" ||
      (bookingRequest.status === "completed" && needsOwnerReturnReview));

  return (
    <div className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20">
      <div className="flex flex-col sm:flex-row">
        {/* Equipment Image - Cleaner proportions */}
        {equipmentImage && (
          <div className="w-full sm:w-40 md:w-48 aspect-[16/10] sm:aspect-auto sm:min-h-[180px] flex-shrink-0 relative overflow-hidden bg-muted">
            <img
              src={equipmentImage}
              alt={bookingRequest.equipment.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Gradient overlay for better text contrast on mobile */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent sm:hidden" />
          </div>
        )}

        <div className="flex-1 p-4 sm:p-5">
          {/* Header - Simplified */}
          <div className="flex justify-between items-start gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base sm:text-lg text-foreground line-clamp-1 mb-1">
                {bookingRequest.equipment.title}
              </h3>
              {bookingRequest.equipment.location && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {bookingRequest.equipment.location}
                  </span>
                </p>
              )}
            </div>
            {(() => {
              const statusConfig = getStatusBadgeConfig(
                bookingRequest.status,
                hasPayment
              );
              return (
                <span
                  className={cn(
                    "shrink-0 px-2.5 py-1 rounded-full text-xs font-medium",
                    statusConfig.className
                  )}
                >
                  {statusConfig.text}
                </span>
              );
            })()}
          </div>

          {/* Date & Price - Clean inline layout */}
          <div className="flex items-center justify-between gap-4 py-3 px-4 -mx-4 sm:-mx-5 bg-muted/30 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">
                  {format(startDate, "MMM d")} – {format(endDate, "MMM d")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBookingDuration(
                    bookingRequest.start_date,
                    bookingRequest.end_date
                  )}
                  {isFuture(startDate) && daysUntilStart <= 7 && (
                    <span className="ml-2 text-primary font-medium">
                      {daysUntilStart === 0
                        ? "Today"
                        : daysUntilStart === 1
                        ? "Tomorrow"
                        : `in ${daysUntilStart}d`}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg text-foreground">
                ${bookingRequest.total_amount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                ${bookingRequest.equipment.daily_rate.toFixed(2)}/day
              </p>
            </div>
          </div>

          {/* Lifecycle Stepper - Desktop only, simplified */}
          {!isMobile && hasPayment && bookingRequest.status !== "cancelled" && (
            <div className="mb-4">
              <BookingLifecycleStepper
                hasPayment={hasPayment}
                hasPickupInspection={!!pickupInspectionId}
                hasReturnInspection={!!returnInspection?.id}
                startDate={startDate}
                endDate={endDate}
                bookingStatus={bookingRequest.status || "approved"}
                compact={true}
              />
            </div>
          )}

          {/* Inspection Flow Banner - Responsive */}
          {shouldShowInspectionBanner && (
            <div className="mb-4">
              {isMobile ? (
                <MobileInspectionCard
                  bookingId={bookingRequest.id}
                  equipmentTitle={bookingRequest.equipment.title}
                  startDate={startDate}
                  endDate={endDate}
                  hasPickupInspection={!!pickupInspectionId}
                  hasReturnInspection={!!returnInspection?.id}
                  isOwner={isOwner}
                  returnInspection={returnInspection}
                  claimWindowHours={claimWindowHours}
                />
              ) : (
                <InspectionFlowBanner
                  bookingId={bookingRequest.id}
                  startDate={startDate}
                  endDate={endDate}
                  hasPickupInspection={!!pickupInspectionId}
                  hasReturnInspection={!!returnInspection?.id}
                  isOwner={isOwner}
                  returnInspection={returnInspection}
                  claimWindowHours={claimWindowHours}
                />
              )}
            </div>
          )}

          {/* Damage Claim Button - Desktop owners only */}
          {!isMobile &&
            shouldShowInspectionBanner &&
            isOwner &&
            !!returnInspection?.id &&
            !isClaimWindowExpired &&
            !returnInspection.verified_by_owner && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void navigate(`/claims/file/${bookingRequest.id}`)}
                className="mb-4"
              >
                <AlertTriangle className="h-4 w-4 mr-1.5" />
                File Damage Claim
              </Button>
            )}

          {/* Cancelled Status Alert */}
          {bookingRequest.status === "cancelled" && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {isRenter
                  ? "You cancelled this booking."
                  : "This booking was cancelled."}
              </AlertDescription>
            </Alert>
          )}

          {/* Expandable Details */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
            aria-expanded={isExpanded}
            aria-controls={detailsId}
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{isExpanded ? "Hide details" : "Show details"}</span>
          </button>

          {isExpanded && (
            <div
              id={detailsId}
              className="space-y-3 pt-3 border-t border-border/50 mb-4"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4 shrink-0" />
                <span>
                  {isOwner ? "Renter:" : "Owner:"}{" "}
                  <span className="text-foreground">
                    {isOwner
                      ? bookingRequest.renter.email
                      : bookingRequest.owner.email}
                  </span>
                </span>
              </div>

              {bookingRequest.message && (
                <div className="flex gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-muted-foreground">
                    {bookingRequest.message}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Requested{" "}
                {bookingRequest.created_at &&
                  format(new Date(bookingRequest.created_at), "MMM d, yyyy")}
              </p>
            </div>
          )}

          {/* Action Buttons - Cleaner layout */}
          {showActions && (
            <div className="flex items-center gap-2 pt-3 border-t border-border/50">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void handleOpenMessaging()}
                disabled={isLoadingConversation}
                className="text-muted-foreground hover:text-foreground"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                Message
              </Button>

              {canCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleStatusUpdate()}
                  disabled={isUpdating}
                  className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  {isUpdating ? "Cancelling..." : "Cancel"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messaging Modal */}
      {showMessaging && conversationId && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            // Close modal when clicking the backdrop
            if (e.target === e.currentTarget) {
              setShowMessaging(false);
              setConversationId(null);
            }
          }}
        >
          <div
            className="max-w-4xl w-full flex flex-col"
            style={{ height: "min(90vh, 800px)" }}
          >
            <MessagingInterface
              initialConversationId={conversationId}
              onClose={() => {
                setShowMessaging(false);
                setConversationId(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Renter Screening Modal */}
      {showRenterScreening && isOwner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-3xl w-full max-h-[90dvh] overflow-y-auto p-6 border shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-headline-lg font-bold">
                Renter Verification Profile
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRenterScreening(false)}
                aria-label="Close renter screening modal"
              >
                ✕
              </Button>
            </div>
            <RenterScreening renterId={bookingRequest.renter_id} />
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingRequestCard;
