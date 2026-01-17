import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, isFuture, isPast } from "date-fns";
import {
  ChevronDown,
  MapPin,
  MessageSquare,
  XCircle,
  User,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatBookingDuration } from "@/lib/booking";
import { getRentalPath } from "@/lib/user-utils";
import type { BookingRequestWithDetails } from "@/types/booking";

type BookingListItemProps = {
  booking: BookingRequestWithDetails;
  viewerRole: "renter" | "owner";
  onMessage?: () => void;
  onCancel?: () => void;
  onViewDetails?: () => void;
  showInspectionStatus?: boolean;
  hasPickupInspection?: boolean;
  hasReturnInspection?: boolean;
};

type StatusConfig = {
  label: string;
  className: string;
};

function getStatusConfig(status: string | null): StatusConfig {
  if (status === "active") {
    return {
      label: "In Progress",
      className:
        "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
    };
  }
  if (status === "approved") {
    return {
      label: "Approved",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    };
  }
  if (status === "pending") {
    return {
      label: "Pending",
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    };
  }
  if (status === "cancelled") {
    return {
      label: "Cancelled",
      className:
        "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    };
  }
  if (status === "completed") {
    return {
      label: "Completed",
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    };
  }
  return {
    label: status || "Unknown",
    className: "bg-muted text-muted-foreground",
  };
}

function getInitials(name: string): string {
  if (!name.trim()) return "U";
  return name
    .split(" ")
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getDisplayName(profile: {
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
} | null): string {
  if (!profile) return "User";
  return (
    profile.full_name ||
    profile.username ||
    profile.email?.split("@")[0] ||
    "User"
  );
}

export default function BookingListItem({
  booking,
  viewerRole,
  onMessage,
  onCancel,
  onViewDetails,
  showInspectionStatus = false,
  hasPickupInspection = false,
  hasReturnInspection = false,
}: BookingListItemProps) {
  const navigate = useNavigate();
  const [expandedValue, setExpandedValue] = useState("");
  const isExpanded = expandedValue === booking.id;

  const startDate = new Date(booking.start_date);
  const endDate = new Date(booking.end_date);
  const today = new Date();
  const daysUntilStart = differenceInDays(startDate, today);

  // Get equipment image
  const equipmentImage =
    booking.equipment.photos && booking.equipment.photos.length > 0
      ? booking.equipment.photos.find((p) => p.is_primary)?.photo_url ||
        booking.equipment.photos[0]?.photo_url
      : null;

  // Determine counterparty based on viewer role
  const counterparty = viewerRole === "owner" ? booking.renter : booking.owner;
  const counterpartyLabel = viewerRole === "owner" ? "Renter" : "Owner";

  // Status configuration
  const statusConfig = getStatusConfig(booking.status);

  // Time indicator
  const getTimeIndicator = () => {
    if (booking.status === "cancelled" || booking.status === "completed")
      return null;
    if (isPast(endDate)) return { text: "Ended", urgent: false };
    if (isPast(startDate)) return { text: "Active now", urgent: false };
    if (daysUntilStart === 0) return { text: "Today", urgent: true };
    if (daysUntilStart === 1) return { text: "Tomorrow", urgent: true };
    if (daysUntilStart <= 3)
      return { text: `In ${daysUntilStart}d`, urgent: true };
    return null;
  };

  const timeIndicator = getTimeIndicator();

  return (
    <Accordion
      type="single"
      collapsible
      value={expandedValue}
      onValueChange={setExpandedValue}
      className="w-full"
    >
      <AccordionItem
        value={booking.id}
        className="border border-border/60 rounded-xl overflow-hidden bg-card hover:border-border transition-colors data-[state=open]:border-border"
      >
        <AccordionTrigger className="hover:no-underline p-0 [&>svg]:hidden">
          <div className="flex items-center gap-3 p-3 w-full">
            {/* Equipment thumbnail */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
              {equipmentImage ? (
                <img
                  src={equipmentImage}
                  alt={booking.equipment.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  No img
                </div>
              )}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm text-foreground truncate">
                  {booking.equipment.title}
                </p>
                {timeIndicator && (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      timeIndicator.urgent
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {timeIndicator.text}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(startDate, "MMM d")} – {format(endDate, "MMM d")} ·{" "}
                {formatBookingDuration(booking.start_date, booking.end_date)}
              </p>
            </div>

            {/* Right side: Price, Status, Chevron */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-sm text-foreground">
                  ${booking.total_amount.toFixed(2)}
                </p>
              </div>
              <Badge variant="secondary" className={cn("text-xs", statusConfig.className)}>
                {statusConfig.label}
              </Badge>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-3 pb-3">
          <div className="pt-3 border-t border-border/50 space-y-3">
            {/* Price on mobile */}
            <div className="sm:hidden flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-semibold text-foreground">
                ${booking.total_amount.toFixed(2)}
              </span>
            </div>

            {/* Counterparty info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={counterparty?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(getDisplayName(counterparty))}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {getDisplayName(counterparty)}
                </p>
                <p className="text-xs text-muted-foreground">{counterpartyLabel}</p>
              </div>
            </div>

            {/* Location */}
            {booking.equipment.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{booking.equipment.location}</span>
              </div>
            )}

            {/* Inspection status */}
            {showInspectionStatus && booking.status !== "cancelled" && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  {hasPickupInspection ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span
                    className={
                      hasPickupInspection
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    Pickup
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasReturnInspection ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span
                    className={
                      hasReturnInspection
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    Return
                  </span>
                </div>
              </div>
            )}

            {/* Message from booking */}
            {booking.message && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg">
                "{booking.message}"
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              {onMessage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessage();
                  }}
                  className="flex-1 sm:flex-none"
                >
                  <MessageSquare className="h-4 w-4 mr-1.5" />
                  Message
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onViewDetails) {
                    onViewDetails();
                  } else {
                    navigate(
                      getRentalPath({ role: viewerRole, bookingId: booking.id })
                    );
                  }
                }}
                className="flex-1 sm:flex-none"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Details
              </Button>

              {onCancel &&
                (booking.status === "pending" ||
                  booking.status === "approved") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel();
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 ml-auto"
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Cancel
                  </Button>
                )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
