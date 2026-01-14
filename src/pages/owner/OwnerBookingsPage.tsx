import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ListChecks } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageShell from "@/components/layout/PageShell";
import BookingRequestCard from "@/components/booking/BookingRequestCard";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import { useBookingSubscriptions } from "@/hooks/useBookingSubscriptions";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookingCardSkeleton } from "@/components/ui/PageSkeleton";
import { useToast } from "@/hooks/useToast";

const OwnerBookingsPage = () => {
  const { t } = useTranslation("dashboard");
  const { toast } = useToast();
  const {
    bookingRequests,
    loading: bookingsLoading,
    error: bookingsError,
    fetchBookingRequests,
  } = useBookingRequests("owner");

  const handleBookingStatusChange = useCallback(() => {
    void fetchBookingRequests();
  }, [fetchBookingRequests]);

  // Extract booking IDs for centralized subscriptions
  // Use a stable reference that only changes when actual IDs change
  const prevBookingIdsRef = useRef<string[]>([]);
  const bookingIds = useMemo(() => {
    const newIds = bookingRequests.map((b) => b.id);
    const prevIds = prevBookingIdsRef.current;

    const idsChanged =
      newIds.length !== prevIds.length ||
      newIds.some((id, i) => id !== prevIds[i]);

    if (idsChanged) {
      prevBookingIdsRef.current = newIds;
      return newIds;
    }

    return prevIds;
  }, [bookingRequests]);

  // Centralized real-time subscriptions for all booking cards
  useBookingSubscriptions({
    bookingIds,
    onUpdate: handleBookingStatusChange,
    enabled: bookingIds.length > 0,
  });

  useEffect(() => {
    if (bookingsError) {
      toast({
        variant: "destructive",
        title: t("owner.bookings.error_title", { defaultValue: "Error loading bookings" }),
        description: bookingsError,
      });
    }
  }, [bookingsError, toast, t]);

  return (
    <DashboardLayout>
      <PageShell
        title={t("owner.bookings.section_title", { defaultValue: "Booking Requests" })}
        description={t("owner.bookings.section_description", {
          defaultValue: "Manage incoming rental requests for your equipment"
        })}
        icon={ListChecks}
        iconColor="text-violet-500"
      >
        {/* Loading State */}
        {bookingsLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!bookingsLoading && bookingRequests.length === 0 && (
          <EmptyState
            icon={ListChecks}
            title={t("owner.bookings.empty_state.title", {
              defaultValue: "No booking requests"
            })}
            description={t("owner.bookings.empty_state.description", {
              defaultValue: "When renters request your equipment, their bookings will appear here."
            })}
          />
        )}

        {/* Bookings List */}
        {!bookingsLoading && bookingRequests.length > 0 && (
          <div className="space-y-4">
            {bookingRequests.map((request, index) => (
              <div
                key={request.id}
                className="animate-content-reveal"
                style={{ "--stagger-index": index } as React.CSSProperties}
              >
                <BookingRequestCard
                  bookingRequest={request}
                  onStatusChange={handleBookingStatusChange}
                  showActions={true}
                />
              </div>
            ))}
          </div>
        )}
      </PageShell>
    </DashboardLayout>
  );
};

export default OwnerBookingsPage;
