import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import ClaimResponseForm from "@/components/claims/ClaimResponseForm";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, FileWarning } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageShell from "@/components/layout/PageShell";
import { ContentCard, ContentCardHeader, ContentCardContent } from "@/components/ui/ContentCard";
import { CardSkeleton } from "@/components/ui/PageSkeleton";
import type { ClaimStatus } from "@/types/claim";

interface ClaimDetails {
  id: string;
  booking_id: string;
  damage_description: string;
  estimated_cost: number;
  evidence_photos: string[];
  repair_quotes: string[];
  status: ClaimStatus;
  filed_at: string;
  booking: {
    renter_id: string;
    equipment: {
      title: string;
    };
  };
}

export default function ReviewClaimPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [claim, setClaim] = useState<ClaimDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClaim = async () => {
      if (!claimId || !user) {
        setError("Invalid claim or not authenticated");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("damage_claims")
          .select(
            `
            id,
            booking_id,
            damage_description,
            estimated_cost,
            evidence_photos,
            repair_quotes,
            status,
            filed_at,
            booking:booking_requests(
              renter_id,
              equipment:equipment(title)
            )
          `
          )
          .eq("id", claimId)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Claim not found");
          setLoading(false);
          return;
        }

        const booking = data.booking as ClaimDetails["booking"];

        // Check if user is the renter
        if (booking?.renter_id !== user.id) {
          setError("You are not authorized to review this claim");
          setLoading(false);
          return;
        }

        setClaim({
          ...data,
          booking,
        } as ClaimDetails);
      } catch (err) {
        console.error("Error fetching claim:", err);
        setError("Failed to load claim details");
      } finally {
        setLoading(false);
      }
    };

    void fetchClaim();
  }, [claimId, user]);

  const handleSuccess = () => {
    void navigate("/renter/dashboard");
  };

  const handleCancel = () => {
    void navigate(-1);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageShell
          title="Review Damage Claim"
          description="Loading claim details..."
          icon={FileWarning}
          iconColor="text-amber-500"
        >
          <div className="max-w-2xl mx-auto">
            <CardSkeleton lines={5} />
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  if (error || !claim) {
    return (
      <DashboardLayout>
        <PageShell
          title="Review Damage Claim"
          description="Unable to load claim"
          icon={FileWarning}
          iconColor="text-destructive"
        >
          <div className="max-w-2xl mx-auto space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || "Something went wrong"}</AlertDescription>
            </Alert>
            <Button variant="outline" onClick={() => void navigate(-1)}>
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
        title="Review Damage Claim"
        description={claim.booking?.equipment?.title || "Review and respond to this claim"}
        icon={FileWarning}
        iconColor="text-amber-500"
      >
        <div className="max-w-2xl mx-auto">
          <ContentCard>
            <ContentCardHeader
              title="Claim Response"
              description="Review the damage claim and provide your response"
            />
            <ContentCardContent>
              <ClaimResponseForm
                claim={claim}
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
