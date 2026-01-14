import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/useToast";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  Notification,
  NotificationWithActor,
  NotificationCategory,
  NotificationPreferences,
  NotificationGroup,
  UseNotificationsReturn,
} from "@/types/notification";
import {
  getNotificationCategory,
  shouldShowToast,
  getNotificationIcon,
} from "@/types/notification";

// ============================================================================
// CONSTANTS
// ============================================================================

const NOTIFICATIONS_LIMIT = 50;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// ============================================================================
// CACHE
// ============================================================================

const notificationCache = new Map<
  string,
  { data: NotificationWithActor[]; timestamp: number }
>();

const isCacheValid = (key: string): boolean => {
  const cached = notificationCache.get(key);
  return cached ? Date.now() - cached.timestamp < CACHE_TTL : false;
};

const getCachedData = (key: string): NotificationWithActor[] | null => {
  if (isCacheValid(key)) {
    return notificationCache.get(key)?.data ?? null;
  }
  return null;
};

const setCachedData = (key: string, data: NotificationWithActor[]) => {
  notificationCache.set(key, { data, timestamp: Date.now() });
};

// ============================================================================
// HOOK: useNotifications
// ============================================================================

export const useNotifications = (): UseNotificationsReturn => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithActor[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationCategory>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const preferencesLoadedRef = useRef(false);
  const preferencesRef = useRef<NotificationPreferences | null>(null);

  // Keep preferencesRef in sync with state
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  // ============================================================================
  // FETCH NOTIFICATIONS
  // ============================================================================

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const cacheKey = `notifications_${user.id}`;

    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      setNotifications(cachedData);
      setUnreadCount(cachedData.filter((n) => !n.is_read).length);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the RPC function to get notifications with actor info
      const { data, error: fetchError } = await supabase.rpc(
        "get_notifications",
        {
          p_limit: NOTIFICATIONS_LIMIT,
          p_offset: 0,
          p_include_archived: false,
          p_category: filter === "all" ? null : filter,
        }
      );

      if (fetchError) throw fetchError;

      const notificationsData = (data as NotificationWithActor[]) || [];
      setNotifications(notificationsData);
      setCachedData(cacheKey, notificationsData);

      // Update unread count
      const unread = notificationsData.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch notifications";
      console.error("Error fetching notifications:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  // ============================================================================
  // FETCH PREFERENCES (for toast behavior)
  // ============================================================================

  const fetchPreferences = useCallback(async () => {
    if (!user || preferencesLoadedRef.current) return;

    try {
      const { data, error: prefError } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (prefError && prefError.code !== "PGRST116") {
        // PGRST116 = not found, which is fine
        throw prefError;
      }

      setPreferences(data as NotificationPreferences | null);
      preferencesLoadedRef.current = true;
    } catch (err) {
      console.error("Error fetching notification preferences:", err);
    }
  }, [user]);

  // ============================================================================
  // FETCH UNREAD COUNT
  // ============================================================================

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: countError } = await supabase.rpc(
        "get_notification_count",
        { p_user_id: user.id }
      );

      if (countError) throw countError;
      setUnreadCount(data as number);
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  }, [user]);

  // ============================================================================
  // MARK AS READ
  // ============================================================================

  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const { data, error: updateError } = await supabase.rpc(
          "mark_notification_read",
          { p_notification_id: notificationId }
        );

        if (updateError) throw updateError;

        // Check if notification was actually unread before decrementing
        const notification = notifications.find((n) => n.id === notificationId);
        const wasUnread = notification && !notification.is_read;

        // Optimistically update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );

        // Only decrement if notification was actually unread
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        // Invalidate cache
        notificationCache.delete(`notifications_${user.id}`);

        return data as boolean;
      } catch (err) {
        console.error("Error marking notification as read:", err);
        return false;
      }
    },
    [user, notifications]
  );

  // ============================================================================
  // MARK ALL AS READ
  // ============================================================================

  const markAllAsRead = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { data, error: updateError } = await supabase.rpc(
        "mark_all_notifications_read"
      );

      if (updateError) throw updateError;

      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.is_read ? n.read_at : new Date().toISOString(),
        }))
      );
      setUnreadCount(0);

      // Invalidate cache
      notificationCache.delete(`notifications_${user.id}`);

      return data as number;
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      return 0;
    }
  }, [user]);

  // ============================================================================
  // DELETE NOTIFICATION
  // ============================================================================

  const deleteNotification = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const { data, error: deleteError } = await supabase.rpc(
          "delete_notification",
          { p_notification_id: notificationId }
        );

        if (deleteError) throw deleteError;

        // Optimistically update local state
        const notification = notifications.find((n) => n.id === notificationId);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        if (notification && !notification.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        // Invalidate cache
        notificationCache.delete(`notifications_${user.id}`);

        return data as boolean;
      } catch (err) {
        console.error("Error deleting notification:", err);
        return false;
      }
    },
    [user, notifications]
  );

  // ============================================================================
  // ARCHIVE NOTIFICATION
  // ============================================================================

  const archiveNotification = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const { data, error: archiveError } = await supabase.rpc(
          "archive_notification",
          { p_notification_id: notificationId }
        );

        if (archiveError) throw archiveError;

        // Optimistically update local state
        const notification = notifications.find((n) => n.id === notificationId);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        if (notification && !notification.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        // Invalidate cache
        notificationCache.delete(`notifications_${user.id}`);

        return data as boolean;
      } catch (err) {
        console.error("Error archiving notification:", err);
        return false;
      }
    },
    [user, notifications]
  );

  // ============================================================================
  // TOGGLE GROUP EXPANDED
  // ============================================================================

  const toggleGroupExpanded = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  // ============================================================================
  // GROUP NOTIFICATIONS
  // ============================================================================

  const groupedNotifications: NotificationGroup[] = useMemo(() => {
    // Filter by category if not 'all'
    const filtered =
      filter === "all"
        ? notifications
        : notifications.filter(
            (n) => getNotificationCategory(n.type) === filter
          );

    // Group by group_key
    const groups = new Map<string, NotificationWithActor[]>();
    const ungrouped: NotificationWithActor[] = [];

    filtered.forEach((notification) => {
      if (notification.group_key) {
        const existing = groups.get(notification.group_key) || [];
        groups.set(notification.group_key, [...existing, notification]);
      } else {
        ungrouped.push(notification);
      }
    });

    // Convert to NotificationGroup array
    const result: NotificationGroup[] = [];

    groups.forEach((notifs, groupKey) => {
      // Sort by created_at desc within group
      const sorted = notifs.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      result.push({
        group_key: groupKey,
        notifications: sorted,
        latest: sorted[0],
        count: sorted.length,
        isExpanded: expandedGroups.has(groupKey),
      });
    });

    // Add ungrouped as single-item groups
    ungrouped.forEach((notification) => {
      result.push({
        group_key: notification.id,
        notifications: [notification],
        latest: notification,
        count: 1,
        isExpanded: true, // Always show ungrouped items
      });
    });

    // Sort all groups by latest notification date
    result.sort(
      (a, b) =>
        new Date(b.latest.created_at).getTime() -
        new Date(a.latest.created_at).getTime()
    );

    return result;
  }, [notifications, filter, expandedGroups]);

  // ============================================================================
  // REFRESH NOTIFICATIONS
  // ============================================================================

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    notificationCache.delete(`notifications_${user.id}`);
    await fetchNotifications();
  }, [user, fetchNotifications]);

  // ============================================================================
  // REAL-TIME SUBSCRIPTION
  // ============================================================================

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Initial fetch
    void fetchNotifications();
    void fetchPreferences();

    // Set up realtime subscription
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const baseNotification = payload.new as Notification;

          // Realtime payload doesn't include actor details (they come from JOIN)
          // Initialize with null actor fields, then fetch if actor_id exists
          let newNotification: NotificationWithActor = {
            ...baseNotification,
            actor_email: null,
            actor_avatar_url: null,
          };

          // Fetch actor details if present
          if (baseNotification.actor_id) {
            const { data: actorData } = await supabase
              .from("profiles")
              .select("email, avatar_url")
              .eq("id", baseNotification.actor_id)
              .single();

            if (actorData) {
              newNotification = {
                ...newNotification,
                actor_email: actorData.email,
                actor_avatar_url: actorData.avatar_url,
              };
            }
          }

          // Add to state
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show toast if appropriate (use ref to avoid recreating subscription)
          if (shouldShowToast(newNotification, preferencesRef.current)) {
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          }

          // Invalidate cache
          notificationCache.delete(`notifications_${user.id}`);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedBase = payload.new as Notification;

          // Preserve existing actor data since realtime doesn't include it
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === updatedBase.id
                ? {
                    ...updatedBase,
                    actor_email: n.actor_email,
                    actor_avatar_url: n.actor_avatar_url,
                  }
                : n
            )
          );

          // Refetch unread count
          void fetchUnreadCount();

          // Invalidate cache
          notificationCache.delete(`notifications_${user.id}`);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;

          setNotifications((prev) => prev.filter((n) => n.id !== deletedId));

          // Refetch unread count
          void fetchUnreadCount();

          // Invalidate cache
          notificationCache.delete(`notifications_${user.id}`);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchNotifications, fetchPreferences, fetchUnreadCount]);

  // ============================================================================
  // REFETCH ON FILTER CHANGE
  // ============================================================================

  useEffect(() => {
    if (user) {
      void fetchNotifications();
    }
  }, [filter, user, fetchNotifications]);

  // ============================================================================
  // CLEANUP ON LOGOUT
  // ============================================================================

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      setError(null);
      setExpandedGroups(new Set());
      setPreferences(null);
      preferencesLoadedRef.current = false;
      notificationCache.clear();
    }
  }, [user]);

  return {
    notifications,
    groupedNotifications,
    unreadCount,
    loading,
    error,
    filter,
    setFilter,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    archiveNotification,
    refreshNotifications,
    toggleGroupExpanded,
  };
};

export default useNotifications;
