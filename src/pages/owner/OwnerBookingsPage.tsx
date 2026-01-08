import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BookingRequestCard from "@/components/booking/BookingRequestCard";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import { useBookingSubscriptions } from "@/hooks/useBookingSubscriptions";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
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
  }, [bookingRequests]);

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
        title: t("owner.bookings.error_title", { defaultValue: "Error loading bookings" }),
        description: bookingsError,
      });
    }
  }, [bookingsError, toast, t]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("owner.bookings.section_title")}
          </h1>
          <p className="text-muted-foreground">
            {t("owner.bookings.section_description")}
          </p>
        </div>

        {bookingsLoading ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground">
                {t("owner.bookings.loading")}
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
                  {t("owner.bookings.empty_state.title")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {t("owner.bookings.empty_state.description")}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookingRequests.map((request, index) => (
              <div
                key={request.id}
                className="animate-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 50}ms` }}
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
      </div>
    </DashboardLayout>
  );
};

export default OwnerBookingsPage;
