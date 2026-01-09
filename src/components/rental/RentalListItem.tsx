import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowRight,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  calculateRentalCountdown,
  formatRentalCountdown,
} from "@/types/rental";
import type { BookingRequestWithDetails } from "@/types/booking";

type RentalListItemProps = {
  booking: BookingRequestWithDetails;
  viewerRole?: "renter" | "owner";
  className?: string;
  showInspectionStatus?: boolean;
  hasPickupInspection?: boolean;
  hasReturnInspection?: boolean;
};

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

export default function RentalListItem({
  booking,
  viewerRole = "renter",
  className,
  showInspectionStatus = false,
  hasPickupInspection = false,
  hasReturnInspection = false,
}: RentalListItemProps) {
  if (!booking.equipment) return null;

  const equipment = booking.equipment;
  const primaryPhoto = equipment.photos?.find((p) => p.is_primary);
  const photoUrl =
    primaryPhoto?.photo_url || equipment.photos?.[0]?.photo_url;

  // Calculate countdown
  const countdown = calculateRentalCountdown(
    booking.start_date,
    booking.end_date
  );

  // Counterparty info
  const counterparty =
    viewerRole === "owner" ? booking.renter : equipment.owner;
  const counterpartyLabel = viewerRole === "owner" ? "Rented by" : "From";

  // Urgency styling based on countdown
  const getUrgencyConfig = () => {
    if (!countdown) return { color: "text-muted-foreground", icon: Clock };
    if (countdown.isOverdue) {
      return {
        color: "text-red-600 dark:text-red-400",
        icon: AlertTriangle,
      };
    }
    if (countdown.progressPercentage >= 90) {
      return {
        color: "text-orange-600 dark:text-orange-400",
        icon: AlertTriangle,
      };
    }
    if (countdown.progressPercentage >= 75) {
      return {
        color: "text-amber-600 dark:text-amber-400",
        icon: Clock,
      };
    }
    return {
      color: "text-emerald-600 dark:text-emerald-400",
      icon: CheckCircle2,
    };
  };

  const urgencyConfig = getUrgencyConfig();
  const UrgencyIcon = urgencyConfig.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl",
        "bg-card border border-border/60",
        "hover:border-border hover:shadow-sm transition-all",
        className
      )}
    >
      {/* Equipment thumbnail */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={equipment.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        {/* Active badge overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-emerald-500 text-white text-[10px] font-medium text-center py-0.5">
          Active
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">
          {equipment.title}
        </p>

        {/* Countdown - prominent */}
        <div className={cn("flex items-center gap-1.5 mt-1", urgencyConfig.color)}>
          <UrgencyIcon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">
            {countdown ? formatRentalCountdown(countdown) : "Calculating..."}
          </span>
        </div>

        {/* Counterparty - subtle */}
        <div className="flex items-center gap-1.5 mt-1">
          <Avatar className="h-4 w-4">
            <AvatarImage src={counterparty?.avatar_url || undefined} />
            <AvatarFallback className="text-[8px]">
              {getInitials(getDisplayName(counterparty))}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {counterpartyLabel} {getDisplayName(counterparty)}
          </span>
        </div>
      </div>

      {/* Right side: Inspection status or View button */}
      <div className="flex items-center gap-2 shrink-0">
        {showInspectionStatus && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                hasPickupInspection ? "bg-emerald-500" : "bg-muted-foreground/30"
              )}
              title={hasPickupInspection ? "Pickup complete" : "Pickup pending"}
            />
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                hasReturnInspection ? "bg-emerald-500" : "bg-muted-foreground/30"
              )}
              title={hasReturnInspection ? "Return complete" : "Return pending"}
            />
          </div>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="px-2"
          asChild
        >
          <Link to={`/rental/${booking.id}`}>
            <ArrowRight className="h-4 w-4" />
            <span className="sr-only">View rental details</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
