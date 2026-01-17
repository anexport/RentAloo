import { useMemo, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Camera,
  ClipboardCheck,
  Clock,
  Eye,
  FileCheck,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import { supabase } from "@/lib/supabase";
import { getInspectionPath, getRentalPath } from "@/lib/user-utils";
import PageShell from "@/components/layout/PageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentCard } from "@/components/ui/ContentCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookingCardSkeleton } from "@/components/ui/PageSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Database } from "@/lib/database.types";
import type { BookingRequestWithDetails } from "@/types/booking";

type InspectionRow =
  Database["public"]["Tables"]["equipment_inspections"]["Row"];

type PendingItem = {
  id: string;
  booking: BookingRequestWithDetails;
  type: "pickup" | "return" | "return-review" | "awaiting-pickup" | "awaiting-return";
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
  actionIcon?: ComponentType<{ className?: string }>;
  badgeLabel: string;
};

type CompletedItem = {
  inspection: InspectionRow;
  booking: BookingRequestWithDetails;
};

const getDisplayName = (
  profile: {
    full_name?: string | null;
    username?: string | null;
    email?: string | null;
    avatar_url?: string | null;
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

const getInspectionTimestamp = (inspection: InspectionRow): string => {
  return inspection.timestamp || inspection.created_at || new Date().toISOString();
};

const getConfirmationLabel = (inspection: InspectionRow): string => {
  if (inspection.verified_by_owner && inspection.verified_by_renter) {
    return "Confirmed by owner and renter";
  }
  if (inspection.verified_by_owner) {
    return "Confirmed by owner";
  }
  if (inspection.verified_by_renter) {
    if (inspection.inspection_type === "return") {
      return "Awaiting owner confirmation";
    }
    return "Confirmed by renter";
  }
  return "Recorded";
};

const getEquipmentImage = (booking: BookingRequestWithDetails): string | undefined => {
  const photos = booking.equipment?.photos || [];
  const primary = photos.find((photo) => photo.is_primary);
  return primary?.photo_url || photos[0]?.photo_url || undefined;
};

const InspectionsOverview = ({ role }: { role: "renter" | "owner" }) => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const [completedFilter, setCompletedFilter] = useState<"pickup" | "return">(
    "pickup"
  );

  const {
    bookingRequests,
    loading: bookingsLoading,
    error: bookingsError,
  } = useBookingRequests(role);

  const bookingIds = useMemo(
    () => bookingRequests.map((booking) => booking.id),
    [bookingRequests]
  );

  const { data: inspections = [], isLoading: inspectionsLoading, error: inspectionsError } =
    useQuery({
      queryKey: ["inspections", role, bookingIds],
      queryFn: async () => {
        if (bookingIds.length === 0) return [];
        const { data, error } = await supabase
          .from("equipment_inspections")
          .select("*")
          .in("booking_id", bookingIds)
          .order("timestamp", { ascending: false });
        if (error) throw error;
        return data || [];
      },
      enabled: !!user && bookingIds.length > 0,
      staleTime: 1000 * 60 * 5,
    });

  const bookingMap = useMemo(() => {
    const map = new Map<string, BookingRequestWithDetails>();
    bookingRequests.forEach((booking) => {
      map.set(booking.id, booking);
    });
    return map;
  }, [bookingRequests]);

  const inspectionsByBooking = useMemo(() => {
    const map = new Map<
      string,
      { pickup?: InspectionRow; return?: InspectionRow }
    >();
    inspections.forEach((inspection) => {
      const existing = map.get(inspection.booking_id) || {};
      if (inspection.inspection_type === "pickup") {
        existing.pickup = inspection;
      } else {
        existing.return = inspection;
      }
      map.set(inspection.booking_id, existing);
    });
    return map;
  }, [inspections]);

  const pendingItems = useMemo<PendingItem[]>(() => {
    const items: PendingItem[] = [];

    bookingRequests.forEach((booking) => {
      const inspectionState = inspectionsByBooking.get(booking.id);
      const pickupInspection = inspectionState?.pickup;
      const returnInspection = inspectionState?.return;

      if (role === "renter") {
        const needsPickup =
          (booking.status === "approved" || booking.status === "active") &&
          !pickupInspection;
        const needsReturn =
          booking.status === "active" && pickupInspection && !returnInspection;

        if (needsPickup) {
          items.push({
            id: `${booking.id}-pickup`,
            booking,
            type: "pickup",
            title: "Pickup inspection required",
            description:
              "Document the equipment condition before pickup to start your rental.",
            actionLabel: "Start pickup",
            actionPath: getInspectionPath({
              role,
              bookingId: booking.id,
              type: "pickup",
            }),
            actionIcon: Camera,
            badgeLabel: "Pickup",
          });
        } else if (needsReturn) {
          items.push({
            id: `${booking.id}-return`,
            booking,
            type: "return",
            title: "Return inspection required",
            description:
              "Complete the return inspection to finish your rental and release the deposit.",
            actionLabel: "Start return",
            actionPath: getInspectionPath({
              role,
              bookingId: booking.id,
              type: "return",
            }),
            actionIcon: Camera,
            badgeLabel: "Return",
          });
        }
        return;
      }

      if (returnInspection && !returnInspection.verified_by_owner) {
        items.push({
          id: `${booking.id}-return-review`,
          booking,
          type: "return-review",
          title: "Return inspection submitted",
          description: "Review the return inspection and confirm or file a claim.",
          actionLabel: "Review return",
          actionPath: getInspectionPath({
            role,
            bookingId: booking.id,
            type: "return",
            view: true,
          }),
          actionIcon: Eye,
          badgeLabel: "Review",
        });
      }

      if (booking.status === "approved" && !pickupInspection) {
        items.push({
          id: `${booking.id}-awaiting-pickup`,
          booking,
          type: "awaiting-pickup",
          title: "Awaiting renter pickup inspection",
          description:
            "The renter still needs to document the equipment before pickup.",
          actionLabel: "View rental",
          actionPath: getRentalPath({ role, bookingId: booking.id }),
          actionIcon: FileCheck,
          badgeLabel: "Pickup",
        });
      } else if (booking.status === "active" && pickupInspection && !returnInspection) {
        items.push({
          id: `${booking.id}-awaiting-return`,
          booking,
          type: "awaiting-return",
          title: "Awaiting renter return inspection",
          description:
            "The renter will submit a return inspection when the rental ends.",
          actionLabel: "View rental",
          actionPath: getRentalPath({ role, bookingId: booking.id }),
          actionIcon: FileCheck,
          badgeLabel: "Return",
        });
      }
    });

    return items;
  }, [bookingRequests, inspectionsByBooking, role]);

  const completedItems = useMemo<CompletedItem[]>(() => {
    return inspections
      .map((inspection) => {
        const booking = bookingMap.get(inspection.booking_id);
        if (!booking) return null;
        return { inspection, booking };
      })
      .filter((item): item is CompletedItem => item !== null)
      .sort((a, b) => {
        const aTime = new Date(getInspectionTimestamp(a.inspection)).getTime();
        const bTime = new Date(getInspectionTimestamp(b.inspection)).getTime();
        return bTime - aTime;
      });
  }, [inspections, bookingMap]);

  const filteredCompletedItems = useMemo(() => {
    return completedItems.filter(
      (item) => item.inspection.inspection_type === completedFilter
    );
  }, [completedItems, completedFilter]);

  const isLoading = bookingsLoading || inspectionsLoading;
  const errorMessage =
    bookingsError || (inspectionsError instanceof Error ? inspectionsError.message : null);

  const titleKey = `${role}.inspections.title`;
  const descriptionKey = `${role}.inspections.description`;

  return (
    <PageShell
      title={t(titleKey, { defaultValue: "Inspections" })}
      description={t(descriptionKey, {
        defaultValue:
          role === "owner"
            ? "Track pickup and return inspections for your rentals."
            : "Manage your pickup and return inspections.",
      })}
      icon={ClipboardCheck}
      iconColor="text-emerald-500"
    >
      {errorMessage && (
        <ContentCard className="border-destructive/50 bg-destructive/5">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">
                Unable to load inspections
              </p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          </div>
        </ContentCard>
      )}

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">
            Pending
            {pendingItems.length > 0 && (
              <Badge className="ml-2 bg-primary/10 text-primary border border-primary/20">
                {pendingItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <BookingCardSkeleton key={index} />
              ))}
            </div>
          )}

          {!isLoading && pendingItems.length === 0 && (
            <EmptyState
              icon={Clock}
              title="No pending inspections"
              description={
                role === "owner"
                  ? "You're all caught up. Pending inspections will appear here when renters submit or need to complete them."
                  : "You're all caught up. Pending pickup or return inspections will appear here."
              }
            />
          )}

          {!isLoading && pendingItems.length > 0 && (
            <div className="space-y-4">
              {pendingItems.map((item) => {
                const equipmentImage = getEquipmentImage(item.booking);
                const counterparty =
                  role === "owner"
                    ? item.booking.renter
                    : item.booking.equipment.owner;
                const counterpartyLabel = role === "owner" ? "Renter" : "Owner";
                const ActionIcon = item.actionIcon;
                const badgeTone =
                  item.type === "return-review"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";

                return (
                  <ContentCard key={item.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-muted shrink-0">
                        {equipmentImage ? (
                          <img
                            src={equipmentImage}
                            alt={item.booking.equipment.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Camera className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">
                            {item.booking.equipment.title}
                          </h3>
                          <Badge className={badgeTone}>{item.badgeLabel}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar className="h-5 w-5">
                            <AvatarImage
                              src={counterparty?.avatar_url || undefined}
                            />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(getDisplayName(counterparty))}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {counterpartyLabel}: {getDisplayName(counterparty)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {item.actionLabel && item.actionPath && (
                      <Button asChild className="md:self-end">
                        <Link to={item.actionPath}>
                          {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                          {item.actionLabel}
                        </Link>
                      </Button>
                    )}
                  </ContentCard>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          <div className="flex items-center justify-between gap-3 mb-4">
            <Tabs
              value={completedFilter}
              onValueChange={(value) =>
                setCompletedFilter(value as "pickup" | "return")
              }
            >
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="pickup">Pickup</TabsTrigger>
                <TabsTrigger value="return">Return</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <BookingCardSkeleton key={index} />
              ))}
            </div>
          )}

          {!isLoading && filteredCompletedItems.length === 0 && (
            <EmptyState
              icon={ClipboardCheck}
              title={`No ${completedFilter} inspections yet`}
              description="Completed inspections will appear here once they are submitted."
            />
          )}

          {!isLoading && filteredCompletedItems.length > 0 && (
            <div className="space-y-4">
              {filteredCompletedItems.map(({ inspection, booking }) => {
                const equipmentImage = getEquipmentImage(booking);
                const counterparty =
                  role === "owner" ? booking.renter : booking.equipment.owner;
                const counterpartyLabel = role === "owner" ? "Renter" : "Owner";
                const confirmationLabel = getConfirmationLabel(inspection);

                return (
                  <ContentCard
                    key={inspection.id}
                    className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-muted shrink-0">
                        {equipmentImage ? (
                          <img
                            src={equipmentImage}
                            alt={booking.equipment.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Camera className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">
                            {booking.equipment.title}
                          </h3>
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            {inspection.inspection_type === "pickup"
                              ? "Pickup"
                              : "Return"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(
                            new Date(booking.start_date),
                            "MMM d, yyyy"
                          )}{" "}
                          -{" "}
                          {format(new Date(booking.end_date), "MMM d, yyyy")}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>
                            {counterpartyLabel}: {getDisplayName(counterparty)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            Completed{" "}
                            {format(
                              new Date(getInspectionTimestamp(inspection)),
                              "MMM d, yyyy h:mm a"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <Badge variant="secondary">{confirmationLabel}</Badge>
                      <Button asChild variant="outline">
                        <Link
                          to={getInspectionPath({
                            role,
                            bookingId: booking.id,
                            type: inspection.inspection_type,
                            view: true,
                          })}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </ContentCard>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
};

export default InspectionsOverview;
