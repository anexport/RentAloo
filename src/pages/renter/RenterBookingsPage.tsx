import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageShell from "@/components/layout/PageShell";
import BookingRequestCard from "@/components/booking/BookingRequestCard";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import { useBookingSubscriptions } from "@/hooks/useBookingSubscriptions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookingCardSkeleton } from "@/components/ui/PageSkeleton";
import { useToast } from "@/hooks/useToast";

const RenterBookingsPage = () => {
  const { t } = useTranslation("dashboard");
  const { toast } = useToast();
  const {
    bookingRequests,
    loading: bookingsLoading,
    error: bookingsError,
    fetchBookingRequests,
  } = useBookingRequests("renter");

  const handleBookingStatusChange = useCallback(async () => {
    try {
      await fetchBookingRequests();
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("renter.bookings.error_title_refresh", {
          defaultValue: "Failed to refresh bookings",
        }),
        description:
          err instanceof Error
            ? err.message
            : "An error occurred while refreshing bookings.",
      });
    }
  }, [fetchBookingRequests, toast, t]);

  // Extract booking IDs for centralized subscriptions
  const bookingIds = useMemo(
    () => bookingRequests.map((b) => b.id),
    [bookingRequests]
  );

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
        title: t("renter.bookings.error_title_load", {
          defaultValue: "Error loading bookings",
        }),
        description: bookingsError,
      });
    }
  }, [bookingsError, toast, t]);

  return (
    <DashboardLayout>
      <PageShell
        title={t("renter.bookings.title", { defaultValue: "My Bookings" })}
        description={t("renter.bookings.description", {
          defaultValue: "View and manage your rental bookings",
        })}
        icon={Calendar}
        iconColor="text-blue-500"
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
            icon={Calendar}
            title={t("renter.bookings.empty_state.title", {
              defaultValue: "No bookings yet",
            })}
            description={t("renter.bookings.empty_state.description", {
              defaultValue:
                "Browse available equipment and make your first booking to get started.",
            })}
            action={
              <Link to="/explore">
                <Button size="lg">
                  {t("renter.bookings.empty_state.button", {
                    defaultValue: "Browse Equipment",
                  })}
                </Button>
              </Link>
            }
          />
        )}

        {/* Bookings List */}
        {!bookingsLoading && bookingRequests.length > 0 && (
          <div className="space-y-4">
            {bookingRequests.map((booking, index) => (
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
          </div>
        )}
      </PageShell>
    </DashboardLayout>
  );
};

export default RenterBookingsPage;
