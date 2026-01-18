import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInspectionPath } from "@/lib/user-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type InspectionStatusBadgeProps = {
  type: "pickup" | "return";
  completed: boolean;
  bookingId: string;
  bookingStatus?: string;
  isOwner?: boolean;
  className?: string;
};

export default function InspectionStatusBadge({
  type,
  completed,
  bookingId,
  bookingStatus,
  isOwner = false,
  className,
}: InspectionStatusBadgeProps) {
  const navigate = useNavigate();

  const label = type === "pickup" ? "Pickup" : "Return";

  // Determine if the badge should be clickable
  // Owners can only view, renters can start or view
  const canStart = !isOwner && !completed;
  const canView = completed;
  const isClickable = canStart || canView;

  // Determine tooltip text (action-oriented)
  const getTooltipText = () => {
    if (completed) {
      return `View ${label.toLowerCase()} inspection`;
    }
    if (isOwner) {
      return `Awaiting renter's ${label.toLowerCase()} inspection`;
    }
    // Renter can start
    // Support both new status (awaiting_pickup_inspection) and legacy (approved)
    if (type === "pickup" && (bookingStatus === "awaiting_pickup_inspection" || bookingStatus === "approved")) {
      return "Tap to start pickup inspection";
    }
    // Support both new status (awaiting_return_inspection) and legacy (active)
    if (type === "return" && (bookingStatus === "awaiting_return_inspection" || bookingStatus === "active")) {
      return "Tap to start return inspection";
    }
    return `${label} inspection pending`;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isClickable) return;

    const role = isOwner ? "owner" : "renter";

    if (completed) {
      void navigate(
        getInspectionPath({ role, bookingId, type, view: true })
      );
    } else {
      void navigate(getInspectionPath({ role, bookingId, type }));
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            disabled={!isClickable}
            className={cn(
              "flex items-center gap-1.5 py-1 px-2 rounded-md transition-colors",
              isClickable && "hover:bg-muted cursor-pointer",
              !isClickable && "cursor-default opacity-70",
              className
            )}
          >
            {completed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                completed ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {getTooltipText()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
