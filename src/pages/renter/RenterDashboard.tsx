import { useAuth } from "@/hooks/useAuth";
import { Package, AlertCircle, Calendar, History, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import { useBookingSubscriptions } from "@/hooks/useBookingSubscriptions";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/useToast";
import { MobileInspectionCTA } from "@/components/booking/inspection-flow";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { supabase } from "@/lib/supabase";
import { differenceInDays, isPast } from "date-fns";
import type { BookingRequestWithDetails } from "@/types/booking";
import { useActiveRentals } from "@/hooks/useActiveRental";
import CompactStats from "@/components/dashboard/CompactStats";
import CollapsibleSection from "@/components/dashboard/CollapsibleSection";
import BookingCard from "@/components/booking/BookingCard";
import { formatDateForStorage } from "@/lib/utils";

interface InspectionStatus {
  bookingId: string;
  hasPickup: boolean;
  hasReturn: boolean;
}

type InspectionCandidate = {
  booking: BookingRequestWithDetails;
  status: InspectionStatus | undefined;
  urgencyScore: number;
};

const RenterDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation("dashboard");
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Track inspection status for finding urgent bookings
  const [inspectionStatuses, setInspectionStatuses] = useState<
    Map<string, InspectionStatus>
  >(new Map());

  // Fetch renter bookings
  const {
    bookingRequests: renterBookings,
    loading: renterLoading,
    error: renterError,
    fetchBookingRequests: fetchRenterBookings,
  } = useBookingRequests("renter");

  // Fetch active rentals (only where user is renter)
  const {
    rentals: activeRentals,
    isLoading: activeRentalsLoading,
    error: activeRentalsError,
  } = useActiveRentals("renter");

  const { toast } = useToast();

  // Stable "today" value computed once on mount to avoid date boundary inconsistencies
  const todayRef = useRef(formatDateForStorage(new Date()));

  // Fetch inspection statuses for all approved/active bookings
  useEffect(() => {
    const fetchInspectionStatuses = async () => {
      if (!user) return;

      const relevantBookings = renterBookings.filter(
        (b) => b.status === "approved" || b.status === "active"
      );
      if (relevantBookings.length === 0) return;

      const bookingIds = relevantBookings.map((b) => b.id);

      try {
        const { data, error } = await supabase
          .from("equipment_inspections")
          .select("booking_id, inspection_type")
          .in("booking_id", bookingIds);

        if (error) {
          console.error("Error fetching inspection statuses:", error);
          return;
        }

        const statusMap = new Map<string, InspectionStatus>();

        // Initialize all bookings
        bookingIds.forEach((id) => {
          statusMap.set(id, {
            bookingId: id,
            hasPickup: false,
            hasReturn: false,
          });
        });

        // Update with actual inspection data
        data?.forEach((inspection) => {
          const current = statusMap.get(inspection.booking_id);
          if (current) {
            if (inspection.inspection_type === "pickup") {
              current.hasPickup = true;
            } else if (inspection.inspection_type === "return") {
              current.hasReturn = true;
            }
          }
        });

        setInspectionStatuses(statusMap);
      } catch (err) {
        console.error("Error fetching inspection statuses:", err);
      }
    };

    void fetchInspectionStatuses();
  }, [renterBookings, user]);

  // Find the most urgent booking that needs inspection (for mobile CTA)
  const urgentInspectionBooking = useMemo(() => {
    if (!isMobile) return null;

    const today = new Date();
    const approvedBookings = renterBookings.filter(
      (b) => b.status === "approved"
    );

    const bookingsNeedingInspection = approvedBookings
      .map<InspectionCandidate | null>((booking) => {
        const status = inspectionStatuses.get(booking.id);
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        const daysUntilStart = differenceInDays(startDate, today);
        const daysUntilEnd = differenceInDays(endDate, today);

        const needsPickup = !status?.hasPickup;
        const needsReturn =
          status?.hasPickup &&
          !status?.hasReturn &&
          (daysUntilEnd <= 2 || isPast(endDate));

        if (!needsPickup && !needsReturn) return null;

        let urgencyScore = 100;
        if (needsPickup) {
          if (isPast(startDate)) urgencyScore = 0;
          else if (daysUntilStart === 0) urgencyScore = 1;
          else if (daysUntilStart <= 2) urgencyScore = 2 + daysUntilStart;
          else urgencyScore = 10 + daysUntilStart;
        } else if (needsReturn) {
          if (isPast(endDate)) urgencyScore = 0;
          else if (daysUntilEnd === 0) urgencyScore = 1;
          else if (daysUntilEnd <= 2) urgencyScore = 2 + daysUntilEnd;
          else urgencyScore = 10 + daysUntilEnd;
        }

        return { booking, status, urgencyScore };
      })
      .filter((c): c is InspectionCandidate => c !== null)
      .sort((a, b) => a.urgencyScore - b.urgencyScore);

    return bookingsNeedingInspection[0]?.booking || null;
  }, [renterBookings, inspectionStatuses, isMobile]);

  const urgentBookingStatus = urgentInspectionBooking
    ? inspectionStatuses.get(urgentInspectionBooking.id)
    : null;

  // Memoize the status change callback
  const handleBookingStatusChange = useCallback(async () => {
    try {
      await fetchRenterBookings();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to refresh bookings",
        description: err instanceof Error ? err.message : "An error occurred.",
      });
    }
  }, [fetchRenterBookings, toast]);

  // Stable booking IDs for subscriptions
  const prevBookingIdsRef = useRef<string[]>([]);
  const bookingIds = useMemo(() => {
    const newIds = renterBookings.map((b) => b.id);
    const prevIds = prevBookingIdsRef.current;
    const idsChanged =
      newIds.length !== prevIds.length ||
      newIds.some((id, i) => id !== prevIds[i]);
    if (idsChanged) {
      prevBookingIdsRef.current = newIds;
      return newIds;
    }
    return prevIds;
  }, [renterBookings]);

  // Centralized real-time subscriptions
  useBookingSubscriptions({
    bookingIds,
    onUpdate: handleBookingStatusChange,
    enabled: bookingIds.length > 0,
  });

  // Error handling
  useEffect(() => {
    if (renterError) {
      toast({
        variant: "destructive",
        title: "Failed to load bookings",
        description: renterError,
      });
    }
    if (activeRentalsError) {
      toast({
        variant: "destructive",
        title: "Failed to load active rentals",
        description: activeRentalsError,
      });
    }
  }, [renterError, activeRentalsError, toast]);

  // Categorize bookings
  const {
    pendingBookings,
    upcomingBookings,
    historyBookings,
    needsAttentionCount,
  } = useMemo(() => {
    const today = todayRef.current;

    const pending = renterBookings.filter((b) => b.status === "pending");
    const upcoming = renterBookings.filter(
      (b) => b.status === "approved" && b.start_date >= today
    );
    const history = renterBookings.filter(
      (b) => b.status === "completed" || b.status === "cancelled"
    );

    return {
      pendingBookings: pending,
      upcomingBookings: upcoming,
      historyBookings: history,
      // Count only pending bookings since that's what's rendered in the section
      needsAttentionCount: pending.length,
    };
  }, [renterBookings]);

  return (
    <DashboardLayout>
      <div
        className={`space-y-4 ${
          isMobile && urgentInspectionBooking ? "pb-24" : ""
        }`}
      >
        {/* Compact Stats - Always visible at top */}
        <CompactStats variant="renter" />

        {/* Active Rentals - Expanded by default (primary use case) */}
        <CollapsibleSection
          title={t("renter.active_rentals.title", "Active Rentals")}
          icon={Package}
          count={activeRentals.length}
          defaultExpanded={true}
          emptyMessage={t(
            "renter.active_rentals.empty",
            "No active rentals right now"
          )}
          loading={activeRentalsLoading}
          seeAllHref={activeRentals.length > 5 ? "/renter/rentals" : undefined}
        >
          {activeRentals.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                {t(
                  "renter.active_rentals.empty_cta",
                  "Ready to rent some gear?"
                )}
              </p>
              <Button asChild size="sm">
                <Link to="/equipment">
                  <Search className="h-4 w-4 mr-2" />
                  Browse Equipment
                </Link>
              </Button>
            </div>
          ) : (
            activeRentals.slice(0, 5).map((rental) => {
              const status = inspectionStatuses.get(rental.id);
              return (
                <BookingCard
                  key={rental.id}
                  booking={rental}
                  viewerRole="renter"
                  showInspectionStatus
                  hasPickupInspection={status?.hasPickup}
                  hasReturnInspection={status?.hasReturn}
                />
              );
            })
          )}
        </CollapsibleSection>

        {/* Needs Attention - Pending bookings and items requiring action */}
        {(pendingBookings.length > 0 || needsAttentionCount > 0) && (
          <CollapsibleSection
            title="Needs Attention"
            icon={AlertCircle}
            count={needsAttentionCount}
            defaultExpanded={false}
            emptyMessage="All caught up!"
          >
            {pendingBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                viewerRole="renter"
              />
            ))}
          </CollapsibleSection>
        )}

        {/* Upcoming Bookings - Approved, starting soon */}
        <CollapsibleSection
          title={t("renter.upcoming.title", "Upcoming")}
          icon={Calendar}
          count={upcomingBookings.length}
          defaultExpanded={false}
          emptyMessage={t("renter.upcoming.empty", "No upcoming bookings")}
          loading={renterLoading}
          seeAllHref={
            upcomingBookings.length > 5
              ? "/renter/bookings?status=upcoming"
              : undefined
          }
        >
          {upcomingBookings.slice(0, 5).map((booking) => {
            const status = inspectionStatuses.get(booking.id);
            return (
              <BookingCard
                key={booking.id}
                booking={booking}
                viewerRole="renter"
                showInspectionStatus
                hasPickupInspection={status?.hasPickup}
                hasReturnInspection={status?.hasReturn}
              />
            );
          })}
        </CollapsibleSection>

        {/* History - Completed and cancelled */}
        <CollapsibleSection
          title={t("renter.history.title", "History")}
          icon={History}
          count={historyBookings.length}
          defaultExpanded={false}
          emptyMessage={t("renter.history.empty", "No past bookings yet")}
          loading={renterLoading}
          seeAllHref={
            historyBookings.length > 5
              ? "/renter/bookings?status=history"
              : undefined
          }
        >
          {historyBookings.slice(0, 5).map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              viewerRole="renter"
            />
          ))}
        </CollapsibleSection>
      </div>

      {/* Mobile Inspection CTA - Floating at bottom */}
      {isMobile && urgentInspectionBooking && (
        <MobileInspectionCTA
          bookingId={urgentInspectionBooking.id}
          equipmentTitle={urgentInspectionBooking.equipment.title}
          equipmentLocation={urgentInspectionBooking.equipment.location}
          startDate={new Date(urgentInspectionBooking.start_date)}
          endDate={new Date(urgentInspectionBooking.end_date)}
          hasPickupInspection={urgentBookingStatus?.hasPickup || false}
          hasReturnInspection={urgentBookingStatus?.hasReturn || false}
          isOwner={false}
        />
      )}
    </DashboardLayout>
  );
};

export default RenterDashboard;
