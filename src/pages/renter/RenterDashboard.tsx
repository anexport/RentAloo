import { useAuth } from "@/hooks/useAuth";
import { Calendar, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import BookingRequestCard from "@/components/booking/BookingRequestCard";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import { useBookingSubscriptions } from "@/hooks/useBookingSubscriptions";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsOverview from "@/components/renter/StatsOverview";
import NotificationsPanel from "@/components/renter/NotificationsPanel";
import WelcomeHero from "@/components/renter/WelcomeHero";
import UpcomingCalendar from "@/components/renter/UpcomingCalendar";
import { useVerification } from "@/hooks/useVerification";
import { getVerificationProgress } from "@/lib/verification";
import { useToast } from "@/hooks/useToast";
import PendingClaimsList from "@/components/claims/PendingClaimsList";
import { MobileInspectionCTA } from "@/components/booking/inspection-flow";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { supabase } from "@/lib/supabase";
import { differenceInDays, isPast } from "date-fns";
import type { BookingRequestWithDetails } from "@/types/booking";
import { useActiveRentals } from "@/hooks/useActiveRental";
import ActiveRentalCard from "@/components/rental/ActiveRentalCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookingCardSkeleton } from "@/components/ui/PageSkeleton";
import VerificationBanner from "@/components/verification/VerificationBanner";

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
  const { profile, loading: verificationLoading } = useVerification();
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

  // Fetch inspection statuses for all approved bookings (for mobile CTA)
  useEffect(() => {
    const fetchInspectionStatuses = async () => {
      if (!user) return;

      const approvedBookings = renterBookings.filter(
        (b) => b.status === "approved"
      );
      if (approvedBookings.length === 0) return;

      const bookingIds = approvedBookings.map((b) => b.id);

      try {
        const { data, error } = await supabase
          .from("equipment_inspections")
          .select("booking_id, inspection_type")
          .in("booking_id", bookingIds);

        if (error) {
          console.error("Error fetching inspection statuses:", error);
          toast({
            variant: "destructive",
            title: "Failed to load inspection statuses",
            description:
              error instanceof Error
                ? error.message
                : "An error occurred while loading inspection statuses.",
          });
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
        toast({
          variant: "destructive",
          title: "Failed to load inspection statuses",
          description:
            err instanceof Error
              ? err.message
              : "An error occurred while loading inspection statuses.",
        });
      }
    };

    void fetchInspectionStatuses();
  }, [renterBookings, toast, user]);

  // Find the most urgent booking that needs inspection (for mobile CTA)
  const urgentInspectionBooking = useMemo(() => {
    if (!isMobile) return null;

    const today = new Date();

    // Filter to approved bookings only
    const approvedBookings = renterBookings.filter(
      (b) => b.status === "approved"
    );

    // Find bookings that need inspection, sorted by urgency
    const bookingsNeedingInspection = approvedBookings
      .map<InspectionCandidate | null>((booking) => {
        const status = inspectionStatuses.get(booking.id);
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        const daysUntilStart = differenceInDays(startDate, today);
        const daysUntilEnd = differenceInDays(endDate, today);

        // Determine what inspection is needed
        const needsPickup = !status?.hasPickup;
        const needsReturn =
          status?.hasPickup &&
          !status?.hasReturn &&
          (daysUntilEnd <= 2 || isPast(endDate));

        if (!needsPickup && !needsReturn) return null;

        // Calculate urgency score (lower = more urgent)
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

        return {
          booking,
          status,
          urgencyScore,
        };
      })
      .filter(
        (candidate): candidate is InspectionCandidate => candidate !== null
      )
      .sort((a, b) => a.urgencyScore - b.urgencyScore);

    return bookingsNeedingInspection[0]?.booking || null;
  }, [renterBookings, inspectionStatuses, isMobile]);

  // Get inspection status for urgent booking
  const urgentBookingStatus = urgentInspectionBooking
    ? inspectionStatuses.get(urgentInspectionBooking.id)
    : null;

  // Memoize the status change callback to prevent effect re-runs
  const handleBookingStatusChange = useCallback(async () => {
    try {
      await fetchRenterBookings();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to refresh bookings",
        description:
          err instanceof Error
            ? err.message
            : "An error occurred while refreshing bookings.",
      });
    }
  }, [fetchRenterBookings, toast]);

  // Extract booking IDs for centralized subscriptions
  // Use a stable reference that only changes when actual IDs change
  const prevBookingIdsRef = useRef<string[]>([]);
  const bookingIds = useMemo(() => {
    const newIds = renterBookings.map((b) => b.id);
    const prevIds = prevBookingIdsRef.current;
    
    // Check if IDs are actually different (same length and same values)
    const idsChanged =
      newIds.length !== prevIds.length ||
      newIds.some((id, i) => id !== prevIds[i]);
    
    if (idsChanged) {
      prevBookingIdsRef.current = newIds;
      return newIds;
    }
    
    // Return previous reference if IDs haven't changed
    return prevIds;
  }, [renterBookings]);

  // Centralized real-time subscriptions for all booking cards
  // This replaces individual subscriptions in each BookingRequestCard
  useBookingSubscriptions({
    bookingIds,
    onUpdate: handleBookingStatusChange,
    enabled: bookingIds.length > 0,
  });

  // Watch for errors from initial/background fetches
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

  const progress = profile ? getVerificationProgress(profile) : 0;

  return (
    <DashboardLayout>
      <div
        className={`space-y-6 animate-page-enter ${
          isMobile && urgentInspectionBooking ? "pb-24" : ""
        }`}
      >
        {/* Welcome Hero */}
        <WelcomeHero />

        {/* Verification Alert */}
        {!verificationLoading && profile && !profile.identityVerified && (
          <VerificationBanner
            progress={progress}
            translationKey="renter.verification.verify_button"
          />
        )}

        {/* Stats Overview */}
        <StatsOverview />

        {/* Notifications & Claims */}
        <div className="space-y-4">
          <NotificationsPanel />
          <PendingClaimsList />
        </div>

        {/* Active Rentals */}
        {!activeRentalsLoading && activeRentals.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-500" />
              {t("renter.active_rentals.title")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeRentals.map((rental, index) => (
                <div
                  key={rental.id}
                  className="animate-content-reveal"
                  style={{ "--stagger-index": index } as React.CSSProperties}
                >
                  <ActiveRentalCard booking={rental} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bookings + Calendar Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Bookings Column */}
          <div className="lg:col-span-2 space-y-4">
            {renterLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <BookingCardSkeleton key={i} />
                ))}
              </div>
            ) : renterBookings.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={t("renter.bookings.empty_state.title")}
                description={t("renter.bookings.empty_state.description")}
                action={
                  <Link to="/equipment">
                    <Button>{t("renter.bookings.empty_state.button")}</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-4">
                {renterBookings.slice(0, 3).map((booking, index) => (
                  <div
                    key={booking.id}
                    className="animate-content-reveal"
                    style={{ "--stagger-index": index } as React.CSSProperties}
                  >
                    <BookingRequestCard
                      bookingRequest={booking}
                      onStatusChange={handleBookingStatusChange}
                      showActions={true}
                    />
                  </div>
                ))}
                {renterBookings.length > 3 && (
                  <div className="text-center pt-2">
                    <Link to="/renter/bookings">
                      <Button variant="ghost" className="text-muted-foreground">
                        View all {renterBookings.length} bookings
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Calendar Sidebar */}
          <div className="lg:col-span-1">
            <UpcomingCalendar />
          </div>
        </div>
      </div>

      {/* Mobile Inspection CTA */}
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
