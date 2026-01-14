import { useEffect, useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type {
  UserVerificationProfile,
  TrustScore,
  VerificationType,
} from "@/types/verification";
import { calculateTrustScore, calculateAccountAge } from "@/lib/verification";

// ============================================================================
// TYPES
// ============================================================================

interface UseVerificationOptions {
  userId?: string;
}

// Local type for verification records (includes rejection_reason which may not be in generated types yet)
interface VerificationRecord {
  verification_type: string;
  status: string;
  document_url: string | null;
  created_at: string;
  rejection_reason?: string | null;
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

const fetchVerificationProfile = async (
  targetUserId: string,
  authUser: { id: string; email_confirmed_at?: string | null } | null
): Promise<UserVerificationProfile> => {
  // Fetch profile, reviews, renter bookings, equipment IDs, and verification records in parallel
  const [
    { data: profileData, error: profileError },
    { data: reviews, error: reviewsError },
    { count: renterCount, error: renterCountError },
    { data: equipmentData, error: equipmentError },
    { data: verificationRecords, error: verificationError },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", targetUserId).maybeSingle(),
    supabase.from("reviews").select("rating").eq("reviewee_id", targetUserId),
    supabase
      .from("booking_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .eq("renter_id", targetUserId),
    supabase.from("equipment").select("id").eq("owner_id", targetUserId),
    // Select verification records including rejection_reason, ordered by newest first
    supabase
      .from("user_verifications")
      .select("verification_type,status,document_url,created_at,rejection_reason")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false }),
  ]);

  // Profile error is fatal - we cannot proceed without profile data
  if (profileError) throw profileError;

  // If profile doesn't exist, throw a more descriptive error
  if (!profileData) {
    throw new Error(
      "Profile not found. Please ensure your account is properly set up."
    );
  }

  // Non-critical errors: log warnings and default to safe values
  if (reviewsError) {
    console.warn("Failed to load reviews for trust score:", reviewsError);
  }
  if (renterCountError) {
    console.warn("Failed to load renter bookings count:", renterCountError);
  }
  if (equipmentError) {
    console.warn("Failed to load equipment list:", equipmentError);
  }
  if (verificationError) {
    console.warn("Failed to load verification records:", verificationError);
  }

  // Default to safe values for non-critical data
  const safeReviews = reviewsError ? [] : reviews || [];
  const safeRenterCount = renterCountError ? 0 : renterCount || 0;
  const safeEquipmentData = equipmentError ? [] : equipmentData || [];
  // Cast to VerificationRecord[] to include future rejection_reason field
  const safeVerificationRecords: VerificationRecord[] = verificationError 
    ? [] 
    : (verificationRecords as unknown as VerificationRecord[]) || [];

  const equipmentIds = safeEquipmentData.map((eq) => eq.id);
  let ownerCount = 0;

  if (equipmentIds.length > 0) {
    const { count, error: ownerCountError } = await supabase
      .from("booking_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .in("equipment_id", equipmentIds);

    if (ownerCountError) {
      console.warn("Failed to load owner bookings count:", ownerCountError);
    } else {
      ownerCount = count || 0;
    }
  }

  const bookingsCount = safeRenterCount + ownerCount;

  // Calculate trust score
  const accountAgeDays = calculateAccountAge(profileData.created_at ?? new Date().toISOString());
  const averageRating =
    safeReviews.length > 0
      ? safeReviews.reduce((sum, r) => sum + r.rating, 0) / safeReviews.length
      : 0;

  // Determine email verification status:
  // - For own profile: use Supabase Auth's email_confirmed_at (source of truth)
  // - For other profiles: fall back to profiles.email_verified
  const emailVerified =
    authUser && authUser.id === targetUserId
      ? !!authUser.email_confirmed_at
      : profileData.email_verified || false;

  const trustScore: TrustScore = calculateTrustScore({
    identityVerified: profileData.identity_verified || false,
    phoneVerified: profileData.phone_verified || false,
    emailVerified,
    completedBookings: bookingsCount,
    averageRating,
    totalReviews: safeReviews.length,
    averageResponseTimeHours: profileData.average_response_time_hours ?? 12,
    accountAgeDays,
  });

  // Extract verification status for each type
  // Records are already sorted by created_at descending from the query,
  // so find() will return the most recent record for each type
  const identityRecord = safeVerificationRecords.find(
    (r) => r.verification_type === "identity"
  );
  const phoneRecord = safeVerificationRecords.find(
    (r) => r.verification_type === "phone"
  );

  return {
    userId: targetUserId,
    identityVerified: profileData.identity_verified || false,
    phoneVerified: profileData.phone_verified || false,
    emailVerified,
    addressVerified: profileData.address_verified || false,
    trustScore,
    verifiedAt: profileData.verified_at ?? undefined,
    // Identity verification status
    identityStatus: identityRecord?.status as UserVerificationProfile["identityStatus"],
    identityDocumentUrl: identityRecord?.document_url ?? undefined,
    identitySubmittedAt: identityRecord?.created_at ?? undefined,
    identityRejectionReason: identityRecord?.rejection_reason ?? undefined,
    // Phone verification status
    phoneStatus: phoneRecord?.status as UserVerificationProfile["phoneStatus"],
    phoneSubmittedAt: phoneRecord?.created_at ?? undefined,
    phoneRejectionReason: phoneRecord?.rejection_reason ?? undefined,
  };
};

const uploadDocumentApi = async (params: {
  userId: string;
  file: File;
  type: VerificationType;
}): Promise<void> => {
  const { userId, file, type } = params;

  // Upload file to Supabase Storage
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from("verification-documents")
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("verification-documents").getPublicUrl(fileName);

  // Check if a verification record already exists for this type
  const { data: existingRecord } = await supabase
    .from("user_verifications")
    .select("id")
    .eq("user_id", userId)
    .eq("verification_type", type)
    .maybeSingle();

  if (existingRecord) {
    // Update existing verification record
    const { error: updateError } = await supabase
      .from("user_verifications")
      .update({
        status: "pending",
        document_url: publicUrl,
        verified_at: null,
      })
      .eq("id", existingRecord.id);

    if (updateError) throw updateError;
  } else {
    // Insert new verification record into user_verifications table
    const { error: insertError } = await supabase
      .from("user_verifications")
      .insert({
        user_id: userId,
        verification_type: type,
        status: "pending",
        document_url: publicUrl,
      });

    if (insertError) throw insertError;
  }

  // Send email notification to admins
  try {
    // Fetch user profile data for the email
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    const { data: { user } } = await supabase.auth.getUser();

    const { error: emailError } = await supabase.functions.invoke(
      "send-verification-notification",
      {
        body: {
          userId,
          userName: profileData?.full_name || user?.email || "Unknown User",
          userEmail: profileData?.email || user?.email || "",
          documentType: type,
          documentUrl: publicUrl,
        },
      }
    );

    if (emailError) {
      // Log the error but don't fail the upload
      console.error("Failed to send admin notification email:", emailError);
    }
  } catch (emailErr) {
    // Log email errors but don't fail the document upload
    console.error("Error sending notification email:", emailErr);
  }
};

const requestPhoneVerificationApi = async (params: {
  userId: string;
  phoneNumber: string;
}): Promise<void> => {
  const { userId, phoneNumber } = params;

  // Note: Phone number is not stored in profiles table
  // In a production app, this would be stored securely or used with Twilio
  console.log(`Processing phone verification for: ${phoneNumber}`);


  // Check if a phone verification record already exists
  const { data: existingRecord } = await supabase
    .from("user_verifications")
    .select("id")
    .eq("user_id", userId)
    .eq("verification_type", "phone")
    .maybeSingle();

  if (existingRecord) {
    // Update existing verification record
    const { error: updateError } = await supabase
      .from("user_verifications")
      .update({
        status: "pending",
        verified_at: null,
      })
      .eq("id", existingRecord.id);

    if (updateError) throw updateError;
  } else {
    // Insert new phone verification record
    const { error: insertError } = await supabase
      .from("user_verifications")
      .insert({
        user_id: userId,
        verification_type: "phone",
        status: "pending",
      });

    if (insertError) throw insertError;
  }
};

// ============================================================================
// HOOK: useVerification
// ============================================================================

export const useVerification = (options: UseVerificationOptions = {}) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [authUser, setAuthUser] = useState<{
    id: string;
    email_confirmed_at?: string | null;
  } | null>(null);

  // Get auth user on mount
  useEffect(() => {
    const getAuthUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setAuthUser({
          id: user.id,
          email_confirmed_at: user.email_confirmed_at,
        });
      }
    };
    void getAuthUser();
  }, []);

  // Determine target user ID
  const targetUserId = options.userId || authUser?.id;

  // Query for fetching verification profile
  const {
    data: profile = null,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.verification.byUser(targetUserId ?? ""),
    queryFn: () => fetchVerificationProfile(targetUserId!, authUser),
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for uploading verification document
  const uploadMutation = useMutation({
    mutationFn: (params: { file: File; type: VerificationType }) => {
      if (!authUser) throw new Error("User not authenticated");
      return uploadDocumentApi({ ...params, userId: authUser.id });
    },
    onMutate: () => {
      setUploading(true);
    },
    onSettled: () => {
      setUploading(false);
    },
    onSuccess: () => {
      // Invalidate verification queries
      void queryClient.invalidateQueries({
        queryKey: queryKeys.verification.all,
      });
    },
  });

  // Mutation for requesting phone verification
  const phoneVerificationMutation = useMutation({
    mutationFn: (phoneNumber: string) => {
      if (!authUser) throw new Error("User not authenticated");
      return requestPhoneVerificationApi({
        userId: authUser.id,
        phoneNumber,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.verification.all,
      });
    },
  });

  // Subscribe to trust score updates via Supabase Realtime
  useEffect(() => {
    if (!targetUserId) return;

    const channel = supabase
      .channel(`profile-trust-${targetUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${targetUserId}`,
        },
        (payload) => {
          // Trust score was updated, refresh profile
          const newData = payload.new as { trust_score?: number };
          const oldData = payload.old as { trust_score?: number };
          if (newData.trust_score !== oldData?.trust_score) {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.verification.byUser(targetUserId),
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [targetUserId, queryClient]);

  // Wrapper functions for API compatibility
  const uploadVerificationDocument = useCallback(
    async (file: File, type: VerificationType): Promise<void> => {
      await uploadMutation.mutateAsync({ file, type });
    },
    [uploadMutation]
  );

  const requestPhoneVerification = useCallback(
    async (
      phoneNumber: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await phoneVerificationMutation.mutateAsync(phoneNumber);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed",
        };
      }
    },
    [phoneVerificationMutation]
  );

  return {
    profile,
    loading: isLoading,
    error: error?.message ?? null,
    uploading,
    fetchVerificationProfile: refetch,
    uploadVerificationDocument,
    requestPhoneVerification,
  };
};
