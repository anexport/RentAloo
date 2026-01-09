import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingCheckResult {
  needsOnboarding: boolean;
  loading: boolean;
  refetch: () => void;
}

interface RenterPreferences {
  location?: string;
  interests?: string[];
}

// ============================================================================
// FETCH FUNCTION
// ============================================================================

const checkOnboardingStatus = async (
  user: { id: string; user_metadata?: { role?: string } }
): Promise<boolean> => {
  // Check user metadata for role
  const userRole = user.user_metadata?.role;

  // If no role in metadata, user definitely needs onboarding
  // (they signed in with OAuth without going through registration)
  if (!userRole) {
    return true;
  }

  // Check if renter has completed profile with meaningful data
  if (userRole === "renter") {
    const { data: renterProfile, error } = await supabase
      .from("renter_profiles")
      .select("experience_level, preferences")
      .eq("profile_id", user.id)
      .single();

    if (error) {
      // If no profile found, needs onboarding
      if (error.code === "PGRST116") {
        return true;
      }
      // For other errors (network, permissions, etc.), fail gracefully
      // Don't block user access - assume onboarding not needed
      console.error("[Onboarding] Unexpected error:", error.message);
      return false;
    }

    // Check if preferences has location and interests
    // OAuth users get empty {} preferences from the trigger
    const preferences = renterProfile?.preferences as RenterPreferences | null;
    const hasLocation = preferences?.location && preferences.location.length > 0;
    const hasInterests =
      preferences?.interests && preferences.interests.length > 0;

    if (!hasLocation || !hasInterests) {
      return true;
    }
  }

  // Check if owner has completed profile
  if (userRole === "owner") {
    const { data: ownerProfile, error } = await supabase
      .from("owner_profiles")
      .select("business_info")
      .eq("profile_id", user.id)
      .single();

    if (error) {
      // If no profile found, needs onboarding
      if (error.code === "PGRST116") {
        return true;
      }
      // For other errors (network, permissions, etc.), fail gracefully
      console.error("[Onboarding] Unexpected error:", error.message);
      return false;
    }

    // Check if owner has location in business_info
    const businessInfo = ownerProfile?.business_info as {
      location?: string;
    } | null;
    if (!businessInfo?.location) {
      return true;
    }
  }

  // User has completed onboarding
  return false;
};

// ============================================================================
// HOOK: useOnboardingCheck
// ============================================================================

/**
 * Hook to check if a user needs to complete onboarding.
 * OAuth users may not have role, location, or preferences set.
 *
 * OAuth users are detected by:
 * - No role in user_metadata, OR
 * - Empty preferences (no location/interests in renter_profiles)
 */
export const useOnboardingCheck = (): OnboardingCheckResult => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Query for checking onboarding status
  // Only create query key when user exists to avoid empty string keys
  const queryKey = user ? queryKeys.onboarding.check(user.id) : undefined;
  
  const {
    data: needsOnboarding = false,
    isLoading,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: queryKey,
    queryFn: () =>
      checkOnboardingStatus({
        id: user!.id,
        user_metadata: user!.user_metadata,
      }),
    enabled: !!user && !authLoading && !!queryKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Don't refetch on window focus for onboarding check
    refetchOnWindowFocus: false,
  });

  // Refetch wrapper that invalidates cache
  const refetch = useCallback(() => {
    if (user) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.check(user.id),
      });
      void refetchQuery();
    }
  }, [user, queryClient, refetchQuery]);

  return {
    needsOnboarding,
    loading: authLoading || isLoading,
    refetch,
  };
};
