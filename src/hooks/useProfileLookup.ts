import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { Database } from "@/lib/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// Fetch function for batch profile lookup
const fetchProfiles = async (ids: string[]): Promise<Map<string, ProfileRow>> => {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);

  if (error) throw error;

  const profiles = new Map<string, ProfileRow>();
  (data || []).forEach((profile) => {
    profiles.set(profile.id, profile);
  });

  return profiles;
};

/**
 * Hook to fetch and cache profile data by IDs using React Query.
 * 
 * Features:
 * - Automatic deduplication of requests
 * - Cross-component cache sharing
 * - 5 minute stale time for profile data
 * 
 * @param profileIds - Array of profile IDs to fetch
 */
export const useProfileLookup = (profileIds: string[]) => {
  const queryClient = useQueryClient();

  // Filter out empty strings and deduplicate
  const uniqueIds = [...new Set(profileIds.filter(Boolean))];

  // Query for batch fetching profiles
  const { data: profilesData, isLoading } = useQuery({
    queryKey: queryKeys.profiles.byIds(uniqueIds),
    queryFn: () => fetchProfiles(uniqueIds),
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Keep previous data while fetching new IDs
    placeholderData: (previousData) => previousData,
  });

  // Memoize the profiles Map to ensure stable reference
  const profiles = useMemo<Map<string, ProfileRow>>(
    () => profilesData ?? new Map<string, ProfileRow>(),
    [profilesData]
  );

  // Helper to get a single profile
  const getProfile = useCallback(
    (id: string | null | undefined): ProfileRow | undefined => {
      if (!id) return undefined;
      return profiles.get(id);
    },
    [profiles]
  );

  // Prefetch profiles that aren't in the cache yet
  const prefetchProfiles = useCallback(
    async (ids: string[]) => {
      const uniqueNewIds = [...new Set(ids.filter(Boolean))];
      if (uniqueNewIds.length === 0) return;

      await queryClient.prefetchQuery({
        queryKey: queryKeys.profiles.byIds(uniqueNewIds),
        queryFn: () => fetchProfiles(uniqueNewIds),
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  return {
    profiles,
    getProfile,
    loading: isLoading,
    prefetchProfiles,
  };
};
