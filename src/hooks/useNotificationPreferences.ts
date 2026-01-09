import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type {
  NotificationPreferences,
  NotificationPreferencesUpdate,
  UseNotificationPreferencesReturn,
} from "@/types/notification";

// ============================================================================
// HOOK: useNotificationPreferences
// ============================================================================

export const useNotificationPreferences =
  (): UseNotificationPreferencesReturn => {
    const { user } = useAuth();
    const [preferences, setPreferences] =
      useState<NotificationPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track request staleness for cleanup
    const fetchIdRef = useRef(0);
    const isMountedRef = useRef(true);

    // ============================================================================
    // FETCH PREFERENCES
    // ============================================================================

    const fetchPreferences = useCallback(async () => {
      if (!user) return;

      // Increment fetch ID to track staleness
      const currentFetchId = ++fetchIdRef.current;

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single();

        // Check if this request is stale or component unmounted
        if (currentFetchId !== fetchIdRef.current || !isMountedRef.current) {
          return;
        }

        if (fetchError) {
          // If no preferences exist, the trigger should have created them
          // But just in case, we'll create default ones
          if (fetchError.code === "PGRST116") {
            const { data: newData, error: insertError } = await supabase
              .from("notification_preferences")
              .insert({ user_id: user.id })
              .select()
              .single();

            // Check staleness again after insert
            if (currentFetchId !== fetchIdRef.current || !isMountedRef.current) {
              return;
            }

            if (insertError) throw insertError;
            setPreferences(newData as NotificationPreferences);
            return;
          }
          throw fetchError;
        }

        setPreferences(data as NotificationPreferences);
      } catch (err) {
        // Don't update state if stale or unmounted
        if (currentFetchId !== fetchIdRef.current || !isMountedRef.current) {
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : "Failed to fetch notification preferences";
        console.error("Error fetching notification preferences:", err);
        setError(message);
      } finally {
        // Only update loading if this is still the current request
        if (currentFetchId === fetchIdRef.current && isMountedRef.current) {
          setLoading(false);
        }
      }
    }, [user]);

    // ============================================================================
    // UPDATE PREFERENCES
    // ============================================================================

    const updatePreferences = useCallback(
      async (updates: NotificationPreferencesUpdate): Promise<boolean> => {
        // Allow updates if user exists, even if preferences still loading
        // (preferences will be set once fetch completes)
        if (!user) return false;

        // Store previous preferences for rollback on error
        const previousPreferences = preferences;

        try {
          setError(null);

          // Optimistic update if we have existing preferences
          if (preferences) {
            setPreferences({ ...preferences, ...updates });
          }

          const { data, error: updateError } = await supabase
            .from("notification_preferences")
            .update(updates)
            .eq("user_id", user.id)
            .select()
            .single();

          if (updateError) throw updateError;

          // Update with server response
          if (isMountedRef.current) {
            setPreferences(data as NotificationPreferences);
          }
          return true;
        } catch (err) {
          // Rollback on error
          if (isMountedRef.current && previousPreferences) {
            setPreferences(previousPreferences);
          }
          const message =
            err instanceof Error
              ? err.message
              : "Failed to update notification preferences";
          console.error("Error updating notification preferences:", err);
          if (isMountedRef.current) {
            setError(message);
          }
          return false;
        }
      },
      [user, preferences]
    );

    // ============================================================================
    // INITIAL FETCH & CLEANUP
    // ============================================================================

    useEffect(() => {
      isMountedRef.current = true;

      if (user) {
        void fetchPreferences();
      } else {
        setPreferences(null);
        setLoading(false);
        setError(null);
      }

      // Cleanup: mark as unmounted and invalidate in-flight requests
      return () => {
        isMountedRef.current = false;
        fetchIdRef.current++;
      };
    }, [user, fetchPreferences]);

    return {
      preferences,
      loading,
      error,
      updatePreferences,
      refetch: fetchPreferences,
    };
  };

export default useNotificationPreferences;
