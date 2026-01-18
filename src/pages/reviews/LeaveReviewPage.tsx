import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Star } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageTransitionLoader } from "@/components/ui/PageSkeleton";
import ReviewForm from "@/components/reviews/ReviewForm";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/lib/supabase";
import { canReviewBooking } from "@/lib/reviews";
import type { BookingRequestWithDetails } from "@/types/booking";

type ReviewEligibility = {
  canReview: boolean;
  reason?: string;
};

type ProfileSummary = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
};

const getDisplayName = (profile: ProfileSummary | null): string => {
  if (!profile) return "User";
  return (
    profile.full_name ||
    profile.username ||
    profile.email?.split("@")[0] ||
    "User"
  );
};

export default function LeaveReviewPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("reviews");
  const { user } = useAuth();
  const { toast } = useToast();

  const [booking, setBooking] = useState<BookingRequestWithDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(
    null
  );

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId || !user) {
        setError("Booking not found or you are not authenticated.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: bookingError } = await supabase
          .from("booking_requests")
          .select(
            `
            *,
            equipment:equipment_id (
              *,
              owner:owner_id (id, email, username, full_name, avatar_url),
              category:category_id (id, name),
              photos:equipment_photos (id, photo_url, is_primary, order_index)
            ),
            renter:renter_id (id, email, username, full_name, avatar_url)
          `
          )
          .eq("id", bookingId)
          .single();

        if (bookingError) throw bookingError;

        if (!data) {
          setError("Booking not found.");
          setLoading(false);
          return;
        }

        const isRenter = data.renter_id === user.id;
        const isOwner = data.equipment?.owner_id === user.id;

        if (!isRenter && !isOwner) {
          setError("You are not authorized to review this booking.");
          setLoading(false);
          return;
        }

        setBooking(data as BookingRequestWithDetails);
      } catch (err) {
        console.error("Error loading booking for review:", err);
        setError("Failed to load booking details.");
      } finally {
        setLoading(false);
      }
    };

    void fetchBooking();
  }, [bookingId, user]);

  useEffect(() => {
    const checkEligibility = async () => {
      if (!booking || !user || !bookingId) return;

      try {
        const { data, error: reviewError } = await supabase
          .from("reviews")
          .select("id")
          .eq("booking_id", bookingId)
          .eq("reviewer_id", user.id)
          .maybeSingle();

        if (reviewError && reviewError.code !== "PGRST116") {
          throw reviewError;
        }

        const alreadyReviewed = !!data;

        if (booking.status !== "completed") {
          setEligibility({
            canReview: false,
            reason: "You can only review after the rental is completed.",
          });
          return;
        }

        setEligibility(canReviewBooking(booking.end_date, alreadyReviewed));
      } catch (err) {
        console.error("Error checking review eligibility:", err);
        setEligibility({
          canReview: false,
          reason: "Unable to verify review eligibility. Please try again.",
        });
      }
    };

    void checkEligibility();
  }, [booking, bookingId, user]);

  const userRole = user?.user_metadata?.role;
  const isRenter = !!booking && !!user && booking.renter_id === user.id;
  const reviewee = useMemo(() => {
    if (!booking) return null;
    return isRenter ? booking.equipment?.owner : booking.renter;
  }, [booking, isRenter]);

  const revieweeName = booking ? getDisplayName(reviewee) : "User";
  const equipmentTitle = booking?.equipment?.title || "Equipment";
  const dashboardPath = booking
    ? isRenter
      ? "/renter/dashboard"
      : "/owner/dashboard"
    : userRole === "owner"
    ? "/owner/dashboard"
    : userRole === "renter"
    ? "/renter/dashboard"
    : "/dashboard";
  const hasReliableDashboard =
    !!booking || userRole === "owner" || userRole === "renter";

  const handleSuccess = async () => {
    if (!booking || !user) return;

    const reviewField = isRenter ? "renter_reviewed_at" : "owner_reviewed_at";

    const { data: updatedBooking, error: updateError } = await supabase
      .from("booking_requests")
      .update({ [reviewField]: new Date().toISOString() })
      .eq("id", booking.id)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedBooking) {
      console.warn(
        "Failed to update review status:",
        updateError ?? "No rows updated."
      );
      toast({
        variant: "destructive",
        title: t("errors.review_update_failed_title"),
        description: t("errors.review_update_failed_description"),
      });
      void navigate(dashboardPath);
      return;
    }

    toast({
      title: t("success.review_submitted"),
      description: t("success.review_submitted_description"),
    });

    void navigate(dashboardPath);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageTransitionLoader />
      </DashboardLayout>
    );
  }

  if (error || !booking || !reviewee?.id) {
    return (
      <DashboardLayout>
        <PageShell
          title="Leave a Review"
          description="We couldn't load this review."
          icon={Star}
          iconColor="text-amber-500"
        >
          <Alert variant="destructive">
            <AlertDescription>{error || "Unable to load review."}</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void navigate(hasReliableDashboard ? dashboardPath : -1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {hasReliableDashboard ? "Back to Dashboard" : "Go Back"}
          </Button>
        </PageShell>
      </DashboardLayout>
    );
  }

  if (eligibility && !eligibility.canReview) {
    return (
      <DashboardLayout>
        <PageShell
          title="Leave a Review"
          description="Review status"
          icon={Star}
          iconColor="text-amber-500"
        >
          <Alert variant="destructive">
            <AlertDescription>
              {eligibility.reason || "You cannot review this booking."}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void navigate(dashboardPath)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageShell
        title={t("form.title")}
        description={t("form.description", {
          equipmentTitle,
          revieweeName,
        })}
        icon={Star}
        iconColor="text-amber-500"
        action={
          <Button variant="outline" onClick={() => void navigate(dashboardPath)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      >
        <ReviewForm
          bookingId={booking.id}
          revieweeId={reviewee.id}
          revieweeName={revieweeName}
          equipmentTitle={equipmentTitle}
          onSuccess={() => void handleSuccess()}
          onCancel={() => void navigate(dashboardPath)}
        />
      </PageShell>
    </DashboardLayout>
  );
}
