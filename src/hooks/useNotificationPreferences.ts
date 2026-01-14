import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type {
  NotificationPreferences,
  NotificationPreferencesUpdate,
  UseNotificationPreferencesReturn,
} from "@/types/notification";

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

const fetchNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences> => {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    // If no preferences exist, create default ones
    if (error.code === "PGRST116") {
      const { data: newData, error: insertError } = await supabase
        .from("notification_preferences")
        .insert({ user_id: userId })
        .select()
        .single();

      if (insertError) throw insertError;
      return newData as NotificationPreferences;
    }
    throw error;
  }

  return data as NotificationPreferences;
};

const updateNotificationPreferences = async ({
  userId,
  updates,
}: {
  userId: string;
  updates: NotificationPreferencesUpdate;
}): Promise<NotificationPreferences> => {
  const { data, error } = await supabase
    .from("notification_preferences")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
};

// ============================================================================
// HOOK: useNotificationPreferences
// ============================================================================

export const useNotificationPreferences =
  (): UseNotificationPreferencesReturn => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Query for fetching preferences
    const {
      data: preferences = null,
      isLoading,
      error,
      refetch,
    } = useQuery({
      queryKey: queryKeys.notificationPreferences.byUser(user?.id ?? ""),
      queryFn: () => fetchNotificationPreferences(user!.id),
      enabled: !!user,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Mutation for updating preferences
    const updateMutation = useMutation({
      mutationFn: (updates: NotificationPreferencesUpdate) =>
        updateNotificationPreferences({ userId: user!.id, updates }),
      onMutate: async (updates) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({
          queryKey: queryKeys.notificationPreferences.byUser(user!.id),
        });

        // Snapshot previous value
        const previousPreferences =
          queryClient.getQueryData<NotificationPreferences>(
            queryKeys.notificationPreferences.byUser(user!.id)
          );

        // Optimistically update
        if (previousPreferences) {
          queryClient.setQueryData<NotificationPreferences>(
            queryKeys.notificationPreferences.byUser(user!.id),
            { ...previousPreferences, ...updates }
          );
        }

        return { previousPreferences };
      },
      onError: (_error, _updates, context) => {
        // Rollback on error
        if (context?.previousPreferences) {
          queryClient.setQueryData(
            queryKeys.notificationPreferences.byUser(user!.id),
            context.previousPreferences
          );
        }
      },
      onSettled: () => {
        // Refetch to ensure consistency
        void queryClient.invalidateQueries({
          queryKey: queryKeys.notificationPreferences.byUser(user!.id),
        });
      },
    });

    // Wrapper that returns boolean for API compatibility
    const updatePreferences = async (
      updates: NotificationPreferencesUpdate
    ): Promise<boolean> => {
      if (!user) return false;

      try {
        await updateMutation.mutateAsync(updates);
        return true;
      } catch {
        return false;
      }
    };

    return {
      preferences,
      loading: isLoading,
      error: error?.message ?? null,
      updatePreferences,
      refetch: async () => {
        await refetch();
      },
    };
  };

export default useNotificationPreferences;
