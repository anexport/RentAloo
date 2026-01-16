import { Link } from "react-router-dom";
import { format, differenceInDays, isPast, differenceInHours } from "date-fns";
import { ChevronRight, Package, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatBookingDuration } from "@/lib/booking";
import InspectionStatusBadge from "./InspectionStatusBadge";
import type { BookingRequestWithDetails } from "@/types/booking";

type BookingCardProps = {
  booking: BookingRequestWithDetails;
  viewerRole: "renter" | "owner";
  showInspectionStatus?: boolean;
  hasPickupInspection?: boolean;
  hasReturnInspection?: boolean;
  className?: string;
};

type StatusConfig = {
  label: string;
  className: string;
};

function getStatusConfig(status: string | null): StatusConfig {
  if (status === "active") {
    return {
      label: "Active",
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
      className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
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

function getDisplayName(
  profile: {
    full_name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null
): string {
  if (!profile) return "User";
  return (
    profile.full_name ||
    profile.username ||
    profile.email?.split("@")[0] ||
    "User"
  );
}

export default function BookingCard({
  booking,
  viewerRole,
  showInspectionStatus = false,
  hasPickupInspection = false,
  hasReturnInspection = false,
  className,
}: BookingCardProps) {
  const startDate = new Date(booking.start_date);
  const endDate = new Date(booking.end_date);
  const today = new Date();
  const daysUntilStart = differenceInDays(startDate, today);
  const hoursUntilEnd = differenceInHours(endDate, today);

  // Get equipment image
  const equipmentImage =
    booking.equipment.photos && booking.equipment.photos.length > 0
      ? booking.equipment.photos.find((p) => p.is_primary)?.photo_url ||
        booking.equipment.photos[0]?.photo_url
      : null;

  // Determine counterparty based on viewer role
  const counterparty = viewerRole === "owner" ? booking.renter : booking.equipment.owner;
  const counterpartyLabel = viewerRole === "owner" ? "Renter" : "Owner";

  // Status configuration
  const statusConfig = getStatusConfig(booking.status);

  // Time indicator for urgency
  const getTimeIndicator = () => {
    if (booking.status === "cancelled" || booking.status === "completed")
      return null;

    // For active rentals, show time remaining
    if (booking.status === "active") {
      if (isPast(endDate)) {
        return { text: "Overdue", icon: AlertTriangle, urgent: true };
      }
      if (hoursUntilEnd <= 24) {
        return { text: `${hoursUntilEnd}h left`, icon: Clock, urgent: true };
      }
      return null;
    }

    // For approved/pending, show when it starts
    if (isPast(startDate)) return { text: "Started", icon: Clock, urgent: false };
    if (daysUntilStart === 0) return { text: "Today", icon: Clock, urgent: true };
    if (daysUntilStart === 1)
      return { text: "Tomorrow", icon: Clock, urgent: true };
    if (daysUntilStart <= 3)
      return { text: `In ${daysUntilStart}d`, icon: Clock, urgent: true };
    return null;
  };

  const timeIndicator = getTimeIndicator();
  const isOwner = viewerRole === "owner";

  // Should show inspection status for approved/active bookings
  const shouldShowInspections =
    showInspectionStatus &&
    booking.status !== "cancelled" &&
    booking.status !== "pending" &&
    booking.status !== "completed";

  return (
    <Link
      to={`/rental/${booking.id}`}
      className={cn(
        "block rounded-xl border border-border/60 bg-card overflow-hidden",
        "hover:border-border hover:shadow-md transition-all duration-200",
        "active:scale-[0.99]",
        className
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Left: Photo thumbnail */}
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
          {equipmentImage ? (
            <img
              src={equipmentImage}
              alt={booking.equipment.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Middle: Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm text-foreground truncate">
              {booking.equipment.title}
            </h3>
            <span className="font-semibold text-sm text-foreground shrink-0">
              ${booking.total_amount.toFixed(2)}
            </span>
          </div>

          {/* Dates + duration */}
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(startDate, "MMM d")} – {format(endDate, "MMM d")} ·{" "}
            {formatBookingDuration(booking.start_date, booking.end_date)}
          </p>

          {/* Counterparty */}
          <div className="flex items-center gap-1.5 mt-1">
            <Avatar className="h-4 w-4">
              <AvatarImage src={counterparty?.avatar_url || undefined} />
              <AvatarFallback className="text-[8px]">
                {getInitials(getDisplayName(counterparty))}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {counterpartyLabel}: {getDisplayName(counterparty)}
            </span>
          </div>

          {/* Inspection Status Row */}
          {shouldShowInspections && (
            <div className="flex items-center gap-2 mt-2 -ml-2">
              <InspectionStatusBadge
                type="pickup"
                completed={hasPickupInspection}
                bookingId={booking.id}
                bookingStatus={booking.status || undefined}
                isOwner={isOwner}
              />
              <InspectionStatusBadge
                type="return"
                completed={hasReturnInspection}
                bookingId={booking.id}
                bookingStatus={booking.status || undefined}
                isOwner={isOwner}
              />
            </div>
          )}
        </div>

        {/* Right: Status + Time indicator + Arrow */}
        <div className="flex flex-col items-end justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            {timeIndicator && (
              <span
                className={cn(
                  "text-xs font-medium flex items-center gap-1",
                  timeIndicator.urgent
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-muted-foreground"
                )}
              >
                <timeIndicator.icon className="h-3 w-3" />
                {timeIndicator.text}
              </span>
            )}
            <Badge
              variant="secondary"
              className={cn("text-xs", statusConfig.className)}
            >
              {statusConfig.label}
            </Badge>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}
