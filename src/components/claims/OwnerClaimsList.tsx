import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import ClaimReviewCard from "@/components/claims/ClaimReviewCard";
import type { ClaimStatus } from "@/types/claim";

interface OwnerClaim {
  id: string;
  damage_description: string;
  estimated_cost: number;
  evidence_photos: string[];
  repair_quotes: string[];
  status: ClaimStatus;
  filed_at: string;
  booking: {
    equipment: {
      title: string;
    };
  };
}

export default function OwnerClaimsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<OwnerClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchClaims = async () => {
      if (!user) return;

      try {
        const { data, error: fetchError } = await supabase
          .from("damage_claims")
          .select(
            `
            id,
            damage_description,
            estimated_cost,
            evidence_photos,
            repair_quotes,
            status,
            filed_at,
            booking:booking_requests(
              equipment:equipment(title)
            )
          `
          )
          .eq("filed_by", user.id)
          .in("status", ["pending", "disputed"])
          .order("filed_at", { ascending: false });

        if (fetchError) throw fetchError;

        const transformedClaims: OwnerClaim[] = (data || []).map((claim) => ({
          ...(claim as Omit<OwnerClaim, "repair_quotes" | "booking"> & {
            repair_quotes: string[] | null;
            booking: unknown;
          }),
          repair_quotes: (claim as { repair_quotes: string[] | null }).repair_quotes ?? [],
          booking: (claim as { booking: unknown }).booking as OwnerClaim["booking"],
        }));

        if (isMounted) {
          setClaims(transformedClaims);
          setError("");
        }
      } catch (err) {
        console.error("Error fetching owner claims:", err);
        if (isMounted) {
          setError("Failed to load claims");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchClaims();

    if (!user) return;

    const channel = supabase
      .channel(`owner-claims-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "damage_claims",
        },
        () => {
          void fetchClaims();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (claims.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-semibold">Damage Claims Requiring Action</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {claims.map((claim) => (
          <ClaimReviewCard
            key={claim.id}
            claim={claim}
            onReview={() => navigate(`/claims/manage/${claim.id}`)}
            pendingActionLabel="View Details"
          />
        ))}
      </div>
    </div>
  );
}
