import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  Calendar,
  Package,
  Clock,
  History,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRoleMode } from "@/contexts/RoleModeContext";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatDateForStorage } from "@/lib/utils";
import { useActiveRentals } from "@/hooks/useActiveRental";
import { PageTransitionLoader } from "@/components/ui/PageSkeleton";
import CompactStats from "@/components/dashboard/CompactStats";
import CollapsibleSection from "@/components/dashboard/CollapsibleSection";
import RentalListItem from "@/components/rental/RentalListItem";
import BookingListItem from "@/components/booking/BookingListItem";
import { useToast } from "@/hooks/useToast";

const OwnerDashboard = () => {
  useAuth(); // Keep hook for authentication guard
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");
  const { isAlsoOwner, isLoading: isCheckingOwner } = useRoleMode();
  const { toast } = useToast();

  const {
    bookingRequests,
    loading: bookingsLoading,
    error: bookingsError,
    fetchBookingRequests,
  } = useBookingRequests("owner");

  const {
    rentals: activeRentals,
    isLoading: activeRentalsLoading,
    error: activeRentalsError,
  } = useActiveRentals("owner");

  // Stable "today" value computed once on mount to avoid date boundary inconsistencies
  const today = useMemo(() => formatDateForStorage(new Date()), []);

  // Redirect non-owners to become-owner page
  useEffect(() => {
    if (!isCheckingOwner && !isAlsoOwner) {
      navigate("/owner/become-owner", { replace: true });
    }
  }, [isAlsoOwner, isCheckingOwner, navigate]);

  // Error handling
  useEffect(() => {
    if (bookingsError) {
      toast({
        variant: "destructive",
        title: "Failed to load booking requests",
        description: bookingsError,
      });
    }
    if (activeRentalsError) {
      toast({
        variant: "destructive",
        title: "Failed to load active rentals",
        description: activeRentalsError,
      });
    }
  }, [bookingsError, activeRentalsError, toast]);

  // Categorize bookings
  const { pendingRequests, upcomingRentals, historyBookings } = useMemo(() => {
    const pending = bookingRequests.filter((b) => b.status === "pending");
    const upcoming = bookingRequests.filter(
      (b) => b.status === "approved" && b.start_date >= today
    );
    const history = bookingRequests.filter(
      (b) => b.status === "completed" || b.status === "cancelled"
    );

    return {
      pendingRequests: pending,
      upcomingRentals: upcoming,
      historyBookings: history,
    };
  }, [bookingRequests]);

  // Memoized handlers
  const handleCreateEquipment = useCallback(() => {
    navigate("/owner/equipment?action=create");
  }, [navigate]);

  const handleBookingStatusChange = useCallback(async () => {
    try {
      await fetchBookingRequests();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to refresh",
        description: err instanceof Error ? err.message : "An error occurred.",
      });
    }
  }, [fetchBookingRequests, toast]);

  // Show loading state while checking owner status
  if (isCheckingOwner || !isAlsoOwner) {
    return (
      <DashboardLayout>
        <PageTransitionLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Compact Stats - Always visible at top */}
        <CompactStats variant="owner" />

        {/* Active Rentals - Expanded by default (items currently rented out) */}
        <CollapsibleSection
          title={t("owner.active_rentals.title", "Active Rentals")}
          icon={Package}
          count={activeRentals.length}
          defaultExpanded={true}
          emptyMessage={t(
            "owner.active_rentals.empty",
            "No equipment currently rented out"
          )}
          loading={activeRentalsLoading}
          seeAllHref={activeRentals.length > 5 ? "/owner/rentals" : undefined}
        >
          {activeRentals.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                List equipment to start earning
              </p>
              <Button onClick={handleCreateEquipment} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            </div>
          ) : (
            activeRentals
              .slice(0, 5)
              .map((rental) => (
                <RentalListItem
                  key={rental.id}
                  booking={rental}
                  viewerRole="owner"
                  showInspectionStatus
                />
              ))
          )}
        </CollapsibleSection>

        {/* Pending Requests - Needs owner action */}
        <CollapsibleSection
          title={t("owner.pending_requests.title", "Pending Requests")}
          icon={Clock}
          count={pendingRequests.length}
          defaultExpanded={pendingRequests.length > 0}
          emptyMessage={t(
            "owner.pending_requests.empty",
            "No pending requests"
          )}
          loading={bookingsLoading}
          seeAllHref={
            pendingRequests.length > 5
              ? "/owner/bookings?status=pending"
              : undefined
          }
        >
          {pendingRequests.length > 0 && (
            <div className="mb-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {pendingRequests.length} request
                {pendingRequests.length !== 1 ? "s" : ""} awaiting your response
              </p>
            </div>
          )}
          {pendingRequests.map((booking) => (
            <BookingListItem
              key={booking.id}
              booking={booking}
              viewerRole="owner"
              onCancel={() => void handleBookingStatusChange()}
            />
          ))}
        </CollapsibleSection>

        {/* Upcoming Rentals - Approved, starting soon */}
        <CollapsibleSection
          title={t("owner.upcoming.title", "Upcoming")}
          icon={Calendar}
          count={upcomingRentals.length}
          defaultExpanded={false}
          emptyMessage={t("owner.upcoming.empty", "No upcoming rentals")}
          loading={bookingsLoading}
          seeAllHref={
            upcomingRentals.length > 5
              ? "/owner/bookings?status=upcoming"
              : undefined
          }
        >
          {upcomingRentals.slice(0, 5).map((booking) => (
            <BookingListItem
              key={booking.id}
              booking={booking}
              viewerRole="owner"
              showInspectionStatus
              onCancel={() => void handleBookingStatusChange()}
            />
          ))}
        </CollapsibleSection>

        {/* History - Completed rentals */}
        <CollapsibleSection
          title={t("owner.history.title", "History")}
          icon={History}
          count={historyBookings.length}
          defaultExpanded={false}
          emptyMessage={t("owner.history.empty", "No completed rentals yet")}
          loading={bookingsLoading}
          seeAllHref={
            historyBookings.length > 5
              ? "/owner/bookings?status=history"
              : undefined
          }
        >
          {historyBookings.slice(0, 5).map((booking) => (
            <BookingListItem
              key={booking.id}
              booking={booking}
              viewerRole="owner"
            />
          ))}
        </CollapsibleSection>
      </div>
    </DashboardLayout>
  );
};

export default OwnerDashboard;
