import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import ClaimFilingForm from "@/components/claims/ClaimFilingForm";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, FileWarning } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageShell from "@/components/layout/PageShell";
import { ContentCard, ContentCardHeader, ContentCardContent } from "@/components/ui/ContentCard";
import { CardSkeleton } from "@/components/ui/PageSkeleton";

interface BookingDetails {
  id: string;
  equipment_id: string;
  renter_id: string;
  status: string;
  damage_deposit_amount: number | null;
  insurance_type: string | null;
  insurance_cost: number | null;
  equipment: {
    id: string;
    title: string;
    owner_id: string;
    daily_rate: number;
    deposit_refund_timeline_hours: number | null;
  };
}

interface InspectionDetails {
  photos: string[];
}

export default function FileClaimPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [pickupPhotos, setPickupPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      // Clear stale errors before starting another fetch attempt
      setError("");
      if (!bookingId || !user) {
        setError("Invalid booking or not authenticated");
        setLoading(false);
        return;
      }

      try {
        // Fetch booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from("booking_requests")
          .select(
            `
            id,
            equipment_id,
            renter_id,
            status,
            damage_deposit_amount,
            insurance_type,
            insurance_cost,
            equipment:equipment(
              id,
              title,
              owner_id,
              daily_rate,
              deposit_refund_timeline_hours
            )
          `
          )
          .eq("id", bookingId)
          .single();

        if (bookingError) throw bookingError;

        if (!bookingData) {
          setError("Booking not found");
          setLoading(false);
          return;
        }

        const equipment = bookingData.equipment as BookingDetails["equipment"];

        // Check if user is the owner
        if (equipment?.owner_id !== user.id) {
          setError("Only equipment owners can file damage claims");
          setLoading(false);
          return;
        }

        // Claims are only filed after return
        if (!["active", "completed"].includes(bookingData.status)) {
          setError("Can only file claims for active or completed bookings");
          setLoading(false);
          return;
        }

        // Check if claim already exists
        const { data: existingClaim } = await supabase
          .from("damage_claims")
          .select("id")
          .eq("booking_id", bookingId)
          .maybeSingle();

        if (existingClaim) {
          setError("A claim has already been filed for this booking");
          setLoading(false);
          return;
        }

        setBooking({
          ...bookingData,
          equipment,
        } as BookingDetails);

        // Return inspection is required to file a claim and starts the claim window
        const { data: returnInspection, error: returnInspectionError } = await supabase
          .from("equipment_inspections")
          .select("timestamp, verified_by_owner, verified_by_renter")
          .eq("booking_id", bookingId)
          .eq("inspection_type", "return")
          .maybeSingle();

        if (returnInspectionError) {
          throw returnInspectionError;
        }

        if (!returnInspection) {
          setError("Return inspection required before filing a claim");
          setLoading(false);
          return;
        }

        if (!returnInspection.verified_by_renter) {
          setError("Return inspection must be submitted by the renter before filing a claim");
          setLoading(false);
          return;
        }

        if (returnInspection.verified_by_owner) {
          setError("Return has already been confirmed. Claims can no longer be filed.");
          setLoading(false);
          return;
        }

        const claimWindowHours = equipment.deposit_refund_timeline_hours || 48;
        const submittedAtMs = new Date(returnInspection.timestamp).getTime();
        const claimDeadlineMs = submittedAtMs + claimWindowHours * 60 * 60 * 1000;
        if (Date.now() > claimDeadlineMs) {
          setError("Claim window expired. This return has been auto-accepted.");
          setLoading(false);
          return;
        }

        // Fetch pickup inspection photos for comparison
        const { data: inspectionData } = await supabase
          .from("equipment_inspections")
          .select("photos")
          .eq("booking_id", bookingId)
          .eq("inspection_type", "pickup")
          .maybeSingle();

        if (inspectionData) {
          setPickupPhotos((inspectionData as InspectionDetails).photos || []);
        }

        // Ensure any previous error is cleared after a successful load
        setError("");
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bookingId, user]);

  const handleSuccess = () => {
    navigate("/owner/dashboard");
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // Calculate insurance coverage based on type
  const calculateInsuranceCoverage = () => {
    if (!booking) return 0;
    // Basic = 50% of daily rate, Premium = 100% of daily rate
    const dailyRate = booking.equipment?.daily_rate || 0;
    if (booking.insurance_type === "premium") {
      return dailyRate;
    }
    if (booking.insurance_type === "basic") {
      return dailyRate * 0.5;
    }
    return 0;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageShell
          title="File Damage Claim"
          description="Loading booking details..."
          icon={FileWarning}
          iconColor="text-destructive"
        >
          <div className="max-w-2xl mx-auto">
            <CardSkeleton lines={5} />
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  if (error || !booking) {
    return (
      <DashboardLayout>
        <PageShell
          title="File Damage Claim"
          description="Unable to load claim form"
          icon={FileWarning}
          iconColor="text-destructive"
        >
          <div className="max-w-2xl mx-auto space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || "Something went wrong"}</AlertDescription>
            </Alert>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageShell
        title="File Damage Claim"
        description={booking.equipment?.title || "Report equipment damage"}
        icon={FileWarning}
        iconColor="text-destructive"
      >
        <div className="max-w-2xl mx-auto">
          <ContentCard>
            <ContentCardHeader
              title="Claim Details"
              description="Provide information about the damage"
            />
            <ContentCardContent>
              <ClaimFilingForm
                bookingId={booking.id}
                depositAmount={booking.damage_deposit_amount || 0}
                insuranceCoverage={calculateInsuranceCoverage()}
                pickupPhotos={pickupPhotos}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </ContentCardContent>
          </ContentCard>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}
