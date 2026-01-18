import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Camera } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import InspectionWizard from "@/components/inspection/InspectionWizard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { getInspectionPath, getInspectionsPath } from "@/lib/user-utils";
import type { InspectionType } from "@/types/inspection";

interface BookingDetails {
  id: string;
  equipment_id: string;
  renter_id: string;
  status: string;
  start_date: string;
  end_date: string;
  damage_deposit_amount: number | null;
  equipment: {
    id: string;
    title: string;
    owner_id: string;
    deposit_refund_timeline_hours: number | null;
    photos?: {
      photo_url: string | null;
      is_primary: boolean | null;
      order_index: number | null;
    }[];
    category: {
      sport_type: string;
    } | null;
  };
}

export default function EquipmentInspectionPage() {
  const { bookingId, type } = useParams<{
    bookingId: string;
    type: "pickup" | "return";
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const inspectionType: InspectionType = type === "return" ? "return" : "pickup";

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId || !user) {
        setError("Invalid booking or not authenticated");
        setLoading(false);
        return;
      }

      // Clear stale errors and show loading when a valid fetch is about to run
      setError("");
      setLoading(true);

      try {
        const { data, error: fetchError } = await supabase
          .from("booking_requests")
          .select(
            `
            id,
            equipment_id,
            renter_id,
            status,
            start_date,
            end_date,
            damage_deposit_amount,
            equipment:equipment(
              id,
              title,
              owner_id,
              deposit_refund_timeline_hours,
              photos:equipment_photos (photo_url, is_primary, order_index),
              category:categories(sport_type)
            )
          `
          )
          .eq("id", bookingId)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Booking not found");
          setLoading(false);
          return;
        }

        // Check if user is owner or renter
        const equipment = data.equipment as BookingDetails["equipment"];
        const isOwner = equipment?.owner_id === user.id;
        const isRenter = data.renter_id === user.id;

        if (!isOwner && !isRenter) {
          setError("You are not authorized to view this inspection");
          setLoading(false);
          return;
        }

        // Only the renter should complete the pickup inspection; redirect owners away
        if (inspectionType === "pickup" && isOwner) {
          void navigate(getInspectionsPath("owner"), { replace: true });
          setLoading(false);
          return;
        }

        // Return inspections are submitted by renters; owners only review/accept or file a claim
        if (inspectionType === "return" && isOwner) {
          const { data: existingReturnInspection, error: inspectionError } = await supabase
            .from("equipment_inspections")
            .select("id")
            .eq("booking_id", bookingId)
            .eq("inspection_type", "return")
            .maybeSingle();

          if (inspectionError) {
            console.error("Error checking return inspection:", inspectionError);
            setError("Failed to check inspection status. Please try again.");
            setLoading(false);
            return;
          }

          if (existingReturnInspection?.id) {
            void navigate(
              getInspectionPath({
                role: "owner",
                bookingId,
                type: "return",
                view: true,
              }),
              { replace: true }
            );
          } else {
            void navigate(getInspectionsPath("owner"), { replace: true });
          }

          setLoading(false);
          return;
        }

        // Check booking status based on inspection type
        // Pickup inspection: booking must be 'approved'
        // Return inspection: booking must be 'active'
        const validPickupStatuses = ["approved"];
        const validReturnStatuses = ["active"];

        if (inspectionType === "pickup" && !validPickupStatuses.includes(data.status)) {
          setError("Booking must be approved before pickup inspection");
          setLoading(false);
          return;
        }

        if (inspectionType === "return" && !validReturnStatuses.includes(data.status)) {
          setError("Rental must be active before return inspection");
          setLoading(false);
          return;
        }

        setBooking({
          ...data,
          equipment,
        } as BookingDetails);
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    void fetchBooking();
  }, [bookingId, inspectionType, navigate, user]);

  const handleSuccess = () => {
    // Navigate back to appropriate dashboard
    const isOwner = booking?.equipment?.owner_id === user?.id;
    void navigate(isOwner ? "/owner/dashboard" : "/renter/dashboard");
  };

  const handleCancel = () => {
    void navigate(-1);
  };

  const handleReviewClick = () => {
    // Navigate to review flow after rental completion
    const isOwner = booking?.equipment?.owner_id === user?.id;
    if (!booking?.id) {
      void navigate(isOwner ? "/owner/dashboard" : "/renter/dashboard");
      return;
    }
    void navigate(`/reviews/${booking.id}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div 
          className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 animate-page-enter"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="sr-only">Loading inspection...</span>
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
              <Camera className="h-8 w-8 text-primary animate-pulse" aria-hidden="true" />
            </div>
            <div className="flex gap-1.5 justify-center" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/60 animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground" aria-hidden="true">Loading inspection...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !booking) {
    return (
      <DashboardLayout>
        <div 
          className="min-h-screen flex items-center justify-center p-4 animate-page-enter"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{error || "Something went wrong"}</AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCancel}
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Go Back
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isOwner = booking.equipment?.owner_id === user?.id;
  const primaryPhoto =
    booking.equipment?.photos?.find((p) => p.is_primary) ||
    booking.equipment?.photos
      ?.slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))[0] ||
    booking.equipment?.photos?.[0];
  const equipmentImageUrl = primaryPhoto?.photo_url ?? undefined;

  // Prepare booking info for the wizard
  const bookingInfo = {
    startDate: booking.start_date,
    endDate: booking.end_date,
    depositAmount: booking.damage_deposit_amount ?? undefined,
    claimWindowHours: booking.equipment.deposit_refund_timeline_hours ?? 48,
  };

  return (
    <DashboardLayout>
      <InspectionWizard
        bookingId={booking.id}
        equipmentTitle={booking.equipment?.title || "Equipment"}
        equipmentImageUrl={equipmentImageUrl || undefined}
        categorySlug={booking.equipment?.category?.sport_type}
        inspectionType={inspectionType}
        isOwner={isOwner}
        bookingInfo={bookingInfo}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        onReviewClick={inspectionType === "return" ? handleReviewClick : undefined}
      />
    </DashboardLayout>
  );
}
