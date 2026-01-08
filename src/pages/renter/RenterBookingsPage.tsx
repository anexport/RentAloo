import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BookingRequestCard from "@/components/booking/BookingRequestCard";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import { useBookingSubscriptions } from "@/hooks/useBookingSubscriptions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
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
  // This replaces individual subscriptions in each BookingRequestCard
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
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("renter.bookings.title", { defaultValue: "My Bookings" })}
          </h1>
          <p className="text-muted-foreground">
            {t("renter.bookings.description", {
              defaultValue: "View and manage your rental bookings",
            })}
          </p>
        </div>

        {bookingsLoading ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground">
                {t("renter.bookings.loading", {
                  defaultValue: "Loading bookings...",
                })}
              </div>
            </CardContent>
          </Card>
        ) : bookingRequests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-12">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {t("renter.bookings.empty_state.title", {
                    defaultValue: "No bookings yet",
                  })}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  {t("renter.bookings.empty_state.description", {
                    defaultValue:
                      "Browse available equipment and make your first booking to get started.",
                  })}
                </p>
                <Link to="/explore">
                  <Button size="lg">
                    {t("renter.bookings.empty_state.button", {
                      defaultValue: "Browse Equipment",
                    })}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookingRequests.map((booking, index) => (
              <div
                key={booking.id}
                className="animate-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 50}ms` }}
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
      </div>
    </DashboardLayout>
  );
};

export default RenterBookingsPage;
