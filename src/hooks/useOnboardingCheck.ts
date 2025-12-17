import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface OnboardingCheckResult {
  needsOnboarding: boolean;
  loading: boolean;
  refetch: () => void;
}

interface RenterPreferences {
  location?: string;
  interests?: string[];
}

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
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkOnboarding = useCallback(async () => {
    if (!user) {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    console.log("[Onboarding] Checking for user:", user.id);
    console.log("[Onboarding] User metadata:", user.user_metadata);
    console.log("[Onboarding] App metadata:", user.app_metadata);

    try {
      // Check user metadata for role
      const userRole = user.user_metadata?.role;
      
      // If no role in metadata, user definitely needs onboarding
      // (they signed in with OAuth without going through registration)
      if (!userRole) {
        console.log("[Onboarding] No role in user_metadata, needs onboarding");
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      // Check if renter has completed profile with meaningful data
      if (userRole === "renter") {
        const { data: renterProfile, error } = await supabase
          .from("renter_profiles")
          .select("experience_level, preferences")
          .eq("profile_id", user.id)
          .single();

        if (error) {
          console.log("[Onboarding] Error fetching renter profile:", error);
          // If no profile found, needs onboarding
          if (error.code === "PGRST116") {
            setNeedsOnboarding(true);
            setLoading(false);
            return;
          }
        }

        // Check if preferences has location and interests
        // OAuth users get empty {} preferences from the trigger
        const preferences = renterProfile?.preferences as RenterPreferences | null;
        const hasLocation = preferences?.location && preferences.location.length > 0;
        const hasInterests = preferences?.interests && preferences.interests.length > 0;

        if (!hasLocation || !hasInterests) {
          console.log("[Onboarding] Missing location or interests, needs onboarding", { hasLocation, hasInterests });
          setNeedsOnboarding(true);
          setLoading(false);
          return;
        }
      }

      // Check if owner has completed profile
      if (userRole === "owner") {
        const { data: ownerProfile, error } = await supabase
          .from("owner_profiles")
          .select("business_info")
          .eq("profile_id", user.id)
          .single();

        if (error && error.code === "PGRST116") {
          setNeedsOnboarding(true);
          setLoading(false);
          return;
        }

        // Check if owner has location in business_info
        const businessInfo = ownerProfile?.business_info as { location?: string } | null;
        if (!businessInfo?.location) {
          console.log("[Onboarding] Owner missing location, needs onboarding");
          setNeedsOnboarding(true);
          setLoading(false);
          return;
        }
      }

      // User has completed onboarding
      console.log("[Onboarding] User has complete profile, no onboarding needed");
      setNeedsOnboarding(false);
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      // On error, assume onboarding not needed to avoid blocking
      setNeedsOnboarding(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void checkOnboarding();
  }, [authLoading, checkOnboarding]);

  const refetch = useCallback(() => {
    setLoading(true);
    void checkOnboarding();
  }, [checkOnboarding]);

  return { needsOnboarding, loading, refetch };
};

