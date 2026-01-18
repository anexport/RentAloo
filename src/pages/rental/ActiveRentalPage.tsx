import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  ChevronRight,
  Clock,
  DollarSign,
  HelpCircle,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
} from "lucide-react";
import { differenceInHours, format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import BookingLifecycleStepper from "@/components/booking/inspection-flow/BookingLifecycleStepper";
import { useActiveRental } from "@/hooks/useActiveRental";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { getInspectionPath } from "@/lib/user-utils";
import { calculateRentalCountdown } from "@/types/rental";

interface ActiveRentalPageProps {
  embedded?: boolean;
}

// Helper to get display name from profile
const getDisplayName = (
  profile: {
    full_name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null
): string => {
  if (!profile) return "User";
  return (
    profile.full_name ||
    profile.username ||
    profile.email?.split("@")[0] ||
    "User"
  );
};

// Helper to get initials for avatar fallback
const getInitials = (name: string): string => {
  if (!name.trim()) return "U";
  return name
    .split(" ")
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function ActiveRentalPage({ embedded = false }: ActiveRentalPageProps) {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { booking, pickupInspection, returnInspection, isLoading, error } =
    useActiveRental(bookingId);
  const isEmbedded = embedded;

  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-background animate-page-enter",
          !isEmbedded && "min-h-screen"
        )}
      >
        <div
          className={cn(
            "mx-auto w-full",
            isEmbedded ? "max-w-6xl" : "pb-24"
          )}
        >
          {isEmbedded ? (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <Skeleton className="h-80 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-72 w-full rounded-2xl" />
                <Skeleton className="h-52 w-full rounded-2xl" />
              </div>
            </div>
          ) : (
            <>
              {/* Skeleton matching mobile layout */}
              <div className="h-64 w-full bg-muted animate-pulse" />
              <div className="p-4 space-y-6">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (error || !booking) {
    const errorMessage =
      error || "This rental doesn't exist or you don't have access to it.";
    const dashboardPath =
      user?.user_metadata?.role === "owner"
        ? "/owner/dashboard"
        : "/renter/dashboard";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center animate-page-enter">
        <Card
          className={cn(
            "w-full mx-4 rounded-2xl",
            isEmbedded ? "max-w-2xl" : ""
          )}
        >
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-title-lg font-semibold mb-2">
              Rental Not Found
            </h2>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            <Button onClick={() => void navigate(dashboardPath)}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const equipment = booking.equipment;
  const primaryPhoto = equipment.equipment_photos?.find((p) => p.is_primary);
  const photoUrl = primaryPhoto?.photo_url || equipment.equipment_photos?.[0]?.photo_url;

  const isRenter = booking.renter_id === user?.id;
  const inspectionRole = isRenter ? "renter" : "owner";

  const countdown = calculateRentalCountdown(
    booking.start_date,
    booking.end_date
  );

  const hoursUntilEnd = differenceInHours(
    new Date(booking.end_date),
    new Date()
  );

  const isEndingSoon = hoursUntilEnd <= 24 && hoursUntilEnd > 0;
  const isOverdue = countdown.isOverdue;
  const isApproved = booking.status === "approved";
  const isActiveStatus = booking.status === "active";

  // Determine sticky bar state
  let ctaConfig = {
    label: "",
    action: () => {},
    variant: "default" as
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link",
    show: false,
    icon: null as React.ReactNode,
  };

  if (isRenter) {
    if (isApproved && !pickupInspection) {
      ctaConfig = {
        label: "Start Pickup Inspection",
        action: () =>
          void navigate(
            getInspectionPath({
              role: inspectionRole,
              bookingId: booking.id,
              type: "pickup",
            })
          ),
        variant: "default",
        show: true,
        icon: <Camera className="h-4 w-4 mr-2" />,
      };
    } else if (isActiveStatus && !returnInspection) {
      if (isOverdue) {
        ctaConfig = {
          label: "Return Required - Start Inspection",
          action: () =>
            void navigate(
              getInspectionPath({
                role: inspectionRole,
                bookingId: booking.id,
                type: "return",
              })
            ),
          variant: "destructive",
          show: true,
          icon: <AlertTriangle className="h-4 w-4 mr-2" />,
        };
      } else if (isEndingSoon) {
        ctaConfig = {
          label: "Start Return Inspection",
          action: () =>
            void navigate(
              getInspectionPath({
                role: inspectionRole,
                bookingId: booking.id,
                type: "return",
              })
            ),
          variant: "default",
          show: true,
          icon: <Camera className="h-4 w-4 mr-2" />,
        };
      } else {
        // Standard active state
        ctaConfig = {
          label: "Message Owner",
          action: () => void navigate(`/messages/${equipment.owner.id}`), // Assuming message route
          variant: "secondary",
          show: true,
          icon: <MessageCircle className="h-4 w-4 mr-2" />,
        };
      }
    }
  } else {
    // Owner View
    ctaConfig = {
      label: "Message Renter",
      action: () => void navigate(`/messages/${booking.renter.id}`),
      variant: "secondary",
      show: true,
      icon: <MessageCircle className="h-4 w-4 mr-2" />,
    };
  }

  // Count down text logic
  const getCountdownText = () => {
    if (isOverdue) return "Rental overdue";
    if (isEndingSoon) return `${hoursUntilEnd} hours remaining`;
    if (countdown.daysRemaining > 0)
      return `${countdown.daysRemaining} days, ${countdown.hoursRemaining} hours remaining`;
    return `${countdown.hoursRemaining} hours remaining`;
  };

  const countdownColor = isOverdue
    ? "text-destructive"
    : isEndingSoon
    ? "text-orange-500"
    : "text-emerald-600";

  const heroSection = (
    <div
      className={cn(
        "relative w-full bg-muted",
        isEmbedded
          ? "h-80 rounded-2xl border overflow-hidden"
          : "h-72 mb-6"
      )}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={equipment.title}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-muted">
          <Package className="h-16 w-16 text-muted-foreground" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

      {/* Title Overlay */}
      <div className="absolute bottom-4 left-4 right-4">
        <h1
          className={cn(
            "font-bold tracking-tight text-foreground mb-2 shadow-sm",
            isEmbedded ? "text-3xl" : "text-2xl"
          )}
        >
          {equipment.title}
        </h1>

        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 border border-border bg-background">
            <AvatarImage
              src={
                isRenter
                  ? equipment.owner?.avatar_url || undefined
                  : booking.renter?.avatar_url || undefined
              }
            />
            <AvatarFallback className="text-[10px]">
              {getInitials(
                getDisplayName(isRenter ? equipment.owner : booking.renter)
              )}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium text-foreground/90 mix-blend-difference">
            {isRenter
              ? `Owner: ${getDisplayName(equipment.owner)}`
              : `Renter: ${getDisplayName(booking.renter)}`}
          </p>
        </div>
      </div>
    </div>
  );

  const progressSection = (
    <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Rental Progress
      </h3>
      <BookingLifecycleStepper
        hasPayment={true}
        hasPickupInspection={!!pickupInspection}
        hasReturnInspection={!!returnInspection}
        startDate={new Date(booking.start_date)}
        endDate={new Date(booking.end_date)}
        bookingStatus={booking.status || "active"}
        compact={!isEmbedded}
      />
    </div>
  );

  const countdownSection = isActiveStatus ? (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
      <Clock className={cn("h-5 w-5", countdownColor)} />
      <div>
        <p className={cn("font-medium", countdownColor)}>
          {getCountdownText()}
        </p>
        <p className="text-xs text-muted-foreground">
          Ends {format(new Date(booking.end_date), "MMM d, h:mm a")}
        </p>
      </div>
    </div>
  ) : null;

  const warningSection =
    isRenter && isEndingSoon && !returnInspection ? (
      <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/30">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <AlertTitle className="text-orange-700 dark:text-orange-400">
          Return Soon
        </AlertTitle>
        <AlertDescription className="text-orange-600 dark:text-orange-300 text-xs">
          Please prepare to return the equipment.
        </AlertDescription>
      </Alert>
    ) : null;

  const detailsSection = (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Rental Details</h3>

      <div className="space-y-0 divide-y">
        {/* Dates */}
        <div className="flex items-center gap-4 py-4">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Dates</p>
            <p className="font-medium">
              {format(new Date(booking.start_date), "MMM d")} -{" "}
              {format(new Date(booking.end_date), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Cost */}
        <div className="flex items-center gap-4 py-4">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="font-medium">
              ${(booking.total_amount ?? 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Location */}
        {equipment.location && (
          <div className="flex items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Pick up / Return
              </p>
              <p className="font-medium text-sm line-clamp-1">
                {equipment.location}
              </p>
            </div>
            <a
              href={`https://maps.google.com/maps?q=${encodeURIComponent(
                equipment.location
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="h-8">
                Directions
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );

  const actionsSection = (
    <div className={cn("space-y-3", !isEmbedded && "pb-8")}>
      <Button
        variant="outline"
        className="w-full justify-between h-12"
        onClick={() => void navigate("/support")}
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Get Help
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Button>

      <Button
        variant="outline"
        className="w-full justify-between h-12"
        onClick={() => {
          // Placeholder for inspection view logic
          if (pickupInspection) {
            void navigate(
              getInspectionPath({
                role: inspectionRole,
                bookingId: booking.id,
                type: "pickup",
                view: true,
              })
            );
          } else if (isRenter && isApproved) {
            void navigate(
              getInspectionPath({
                role: inspectionRole,
                bookingId: booking.id,
                type: "pickup",
              })
            );
          }
        }}
      >
        <span className="flex items-center gap-2">
          <ShieldCheck
            className={cn(
              "h-4 w-4",
              pickupInspection ? "text-emerald-500" : "text-muted-foreground"
            )}
          />
          Pickup Inspection
        </span>
        {pickupInspection ? (
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
          >
            Completed
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Pending</span>
        )}
      </Button>

      <Button
        variant="outline"
        className="w-full justify-between h-12"
        onClick={() => {
          if (returnInspection) {
            void navigate(
              getInspectionPath({
                role: inspectionRole,
                bookingId: booking.id,
                type: "return",
                view: true,
              })
            );
          } else if (isRenter && isActiveStatus) {
            void navigate(
              getInspectionPath({
                role: inspectionRole,
                bookingId: booking.id,
                type: "return",
              })
            );
          }
        }}
      >
        <span className="flex items-center gap-2">
          <ShieldCheck
            className={cn(
              "h-4 w-4",
              returnInspection ? "text-emerald-500" : "text-muted-foreground"
            )}
          />
          Return Inspection
        </span>
        {returnInspection ? (
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
          >
            Completed
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Pending</span>
        )}
      </Button>
    </div>
  );

  const ctaButton = ctaConfig.show ? (
    <Button
      size="lg"
      className="w-full shadow-lg text-base font-semibold h-12"
      variant={ctaConfig.variant}
      onClick={ctaConfig.action}
    >
      {ctaConfig.icon}
      {ctaConfig.label}
    </Button>
  ) : null;

  return (
    <div
      className={cn(
        "bg-background relative",
        isEmbedded ? "pb-10" : "min-h-screen pb-24"
      )}
    >
      {/* Header */}
      <header
        className={cn(
          "bg-transparent",
          isEmbedded
            ? "relative mb-6"
            : "fixed top-0 left-0 right-0 z-50 pointer-events-none"
        )}
      >
        <div
          className={cn(
            "mx-auto py-3 flex items-center",
            isEmbedded
              ? "max-w-6xl justify-end"
              : "px-4 justify-between",
            !isEmbedded && "pointer-events-auto"
          )}
        >
          {!isEmbedded && (
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 bg-background/80 backdrop-blur-md shadow-sm rounded-full"
              onClick={() => void navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Badge
            variant={isActiveStatus ? "default" : "secondary"}
            className={cn(
              !isEmbedded &&
                "bg-background/80 backdrop-blur-md shadow-sm backdrop-saturate-150"
            )}
          >
            {booking.status === "active"
              ? "Active"
              : booking.status === "approved"
              ? "Approved"
              : booking.status}
          </Badge>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto w-full",
          isEmbedded
            ? "max-w-6xl"
            : "bg-background overflow-hidden shadow-2xl shadow-black/5 min-h-screen"
        )}
      >
        {isEmbedded ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              {heroSection}
              {progressSection}
              {countdownSection}
              {warningSection}
            </div>
            <div className="space-y-6">
              {detailsSection}
              <div className="space-y-3">
                {ctaButton}
                {actionsSection}
              </div>
            </div>
          </div>
        ) : (
          <>
            {heroSection}
            <div className="px-4 space-y-6">
              {progressSection}
              {countdownSection}
              {warningSection}
              {detailsSection}
              <Separator className="my-6" />
              {actionsSection}
            </div>
          </>
        )}
      </main>

      {/* Sticky Bottom Action Bar */}
      {!isEmbedded && ctaConfig.show && (
          <div
            className={cn(
              "p-4 bg-background border-t safe-area-bottom z-40",
              "fixed bottom-0 left-0 right-0"
            )}
          >
          <div className="mx-auto">
            <Button
              size="lg"
              className="w-full shadow-lg text-base font-semibold"
              variant={ctaConfig.variant}
              onClick={ctaConfig.action}
            >
              {ctaConfig.icon}
              {ctaConfig.label}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
