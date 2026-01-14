import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
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
} from "@/types/notification";

// ============================================================================
// CONSTANTS
// ============================================================================

const NOTIFICATIONS_LIMIT = 50;

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

const fetchNotifications = async (
  filter: NotificationCategory
): Promise<NotificationWithActor[]> => {
  const { data, error } = await supabase.rpc("get_notifications", {
    p_limit: NOTIFICATIONS_LIMIT,
    p_offset: 0,
    p_include_archived: false,
    p_category: filter === "all" ? null : filter,
  });

  if (error) throw error;
  return (data as NotificationWithActor[]) || [];
};

const fetchUnreadCount = async (_userId: string): Promise<number> => {
  // Function uses auth.uid() internally, no parameters needed
  const { data, error } = await supabase.rpc("get_notification_count");

  if (error) throw error;
  return data as number;
};

const fetchPreferences = async (
  userId: string
): Promise<NotificationPreferences | null> => {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data as NotificationPreferences | null;
};

const markNotificationRead = async (
  notificationId: string
): Promise<boolean> => {
  const { data, error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });

  if (error) throw error;
  return data as boolean;
};

const markAllNotificationsRead = async (): Promise<number> => {
  const { data, error } = await supabase.rpc("mark_all_notifications_read");

  if (error) throw error;
  return data as number;
};

const deleteNotificationApi = async (
  notificationId: string
): Promise<boolean> => {
  const { data, error } = await supabase.rpc("delete_notification", {
    p_notification_id: notificationId,
  });

  if (error) throw error;
  return data as boolean;
};

const archiveNotificationApi = async (
  notificationId: string
): Promise<boolean> => {
  const { data, error } = await supabase.rpc("archive_notification", {
    p_notification_id: notificationId,
  });

  if (error) throw error;
  return data as boolean;
};

// ============================================================================
// HOOK: useNotifications
// ============================================================================

export const useNotifications = (): UseNotificationsReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationCategory>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const channelRef = useRef<RealtimeChannel | null>(null);
  const preferencesRef = useRef<NotificationPreferences | null>(null);

  // Query for notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.notifications.byCategory(user?.id ?? "", filter),
    queryFn: () => fetchNotifications(filter),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Query for unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: queryKeys.notifications.unreadCount(user?.id ?? ""),
    queryFn: () => fetchUnreadCount(user!.id),
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds - more real-time
  });

  // Query for preferences (used for toast behavior)
  const { data: preferences = null } = useQuery({
    queryKey: queryKeys.notificationPreferences.byUser(user?.id ?? ""),
    queryFn: () => fetchPreferences(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Keep preferencesRef in sync
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  // Mutation for marking as read
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.byCategory(user!.id, filter),
      });

      // Snapshot previous values
      const previousNotifications = queryClient.getQueryData<
        NotificationWithActor[]
      >(queryKeys.notifications.byCategory(user!.id, filter));

      // Check if notification was unread
      const wasUnread = previousNotifications?.find(
        (n) => n.id === notificationId && !n.is_read
      );

      // Optimistically update notifications
      queryClient.setQueryData<NotificationWithActor[]>(
        queryKeys.notifications.byCategory(user!.id, filter),
        (old = []) =>
          old.map((n) =>
            n.id === notificationId
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
      );

      // Optimistically update unread count
      if (wasUnread) {
        queryClient.setQueryData<number>(
          queryKeys.notifications.unreadCount(user!.id),
          (old = 0) => Math.max(0, old - 1)
        );
      }

      return { previousNotifications, wasUnread: !!wasUnread };
    },
    onError: (_error, _notificationId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          queryKeys.notifications.byCategory(user!.id, filter),
          context.previousNotifications
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(user!.id),
      });
    },
  });

  // Mutation for marking all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.byCategory(user!.id, filter),
      });

      const previousNotifications = queryClient.getQueryData<
        NotificationWithActor[]
      >(queryKeys.notifications.byCategory(user!.id, filter));

      // Optimistically mark all as read
      queryClient.setQueryData<NotificationWithActor[]>(
        queryKeys.notifications.byCategory(user!.id, filter),
        (old = []) =>
          old.map((n) => ({
            ...n,
            is_read: true,
            read_at: n.is_read ? n.read_at : new Date().toISOString(),
          }))
      );

      queryClient.setQueryData<number>(
        queryKeys.notifications.unreadCount(user!.id),
        0
      );

      return { previousNotifications };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          queryKeys.notifications.byCategory(user!.id, filter),
          context.previousNotifications
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.byUser(user!.id),
      });
    },
  });

  // Mutation for deleting notification
  const deleteMutation = useMutation({
    mutationFn: deleteNotificationApi,
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.byCategory(user!.id, filter),
      });

      const previousNotifications = queryClient.getQueryData<
        NotificationWithActor[]
      >(queryKeys.notifications.byCategory(user!.id, filter));

      const notification = previousNotifications?.find(
        (n) => n.id === notificationId
      );

      queryClient.setQueryData<NotificationWithActor[]>(
        queryKeys.notifications.byCategory(user!.id, filter),
        (old = []) => old.filter((n) => n.id !== notificationId)
      );

      if (notification && !notification.is_read) {
        queryClient.setQueryData<number>(
          queryKeys.notifications.unreadCount(user!.id),
          (old = 0) => Math.max(0, old - 1)
        );
      }

      return { previousNotifications };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          queryKeys.notifications.byCategory(user!.id, filter),
          context.previousNotifications
        );
      }
    },
  });

  // Mutation for archiving notification
  const archiveMutation = useMutation({
    mutationFn: archiveNotificationApi,
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.byCategory(user!.id, filter),
      });

      const previousNotifications = queryClient.getQueryData<
        NotificationWithActor[]
      >(queryKeys.notifications.byCategory(user!.id, filter));

      const notification = previousNotifications?.find(
        (n) => n.id === notificationId
      );

      queryClient.setQueryData<NotificationWithActor[]>(
        queryKeys.notifications.byCategory(user!.id, filter),
        (old = []) => old.filter((n) => n.id !== notificationId)
      );

      if (notification && !notification.is_read) {
        queryClient.setQueryData<number>(
          queryKeys.notifications.unreadCount(user!.id),
          (old = 0) => Math.max(0, old - 1)
        );
      }

      return { previousNotifications };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          queryKeys.notifications.byCategory(user!.id, filter),
          context.previousNotifications
        );
      }
    },
  });

  // Toggle group expanded
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

  // Group notifications
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

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

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
        (payload) => {
          const baseNotification = payload.new as Notification;

          // Handle async actor fetch in a non-blocking way
          const handleInsert = async () => {
            // Fetch actor details if present
            let newNotification: NotificationWithActor = {
              ...baseNotification,
              actor_email: null,
              actor_avatar_url: null,
            };

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

            // Add to cache
            queryClient.setQueryData<NotificationWithActor[]>(
              queryKeys.notifications.byCategory(user.id, filter),
              (old = []) => [newNotification, ...old]
            );

            // Update unread count
            queryClient.setQueryData<number>(
              queryKeys.notifications.unreadCount(user.id),
              (old = 0) => old + 1
            );

            // Show toast if appropriate
            if (shouldShowToast(newNotification, preferencesRef.current)) {
              toast({
                title: newNotification.title,
                description: newNotification.message,
              });
            }
          };

          handleInsert().catch(console.error);
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

          // Update in cache preserving actor data
          queryClient.setQueryData<NotificationWithActor[]>(
            queryKeys.notifications.byCategory(user.id, filter),
            (old = []) =>
              old.map((n) =>
                n.id === updatedBase.id
                  ? {
                      ...updatedBase,
                      actor_email: n.actor_email,
                      actor_avatar_url: n.actor_avatar_url,
                    }
                  : n
              )
          );

          // Refresh unread count (fire and forget)
          queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.unreadCount(user.id),
          }).catch(console.error);
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

          queryClient.setQueryData<NotificationWithActor[]>(
            queryKeys.notifications.byCategory(user.id, filter),
            (old = []) => old.filter((n) => n.id !== deletedId)
          );

          // Refresh unread count (fire and forget)
          queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.unreadCount(user.id),
          }).catch(console.error);
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
  }, [user, filter, queryClient]);

  // Cleanup on logout
  useEffect(() => {
    if (!user) {
      setExpandedGroups(new Set());
    }
  }, [user]);

  // Wrapper functions for API compatibility
  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        await markAsReadMutation.mutateAsync(notificationId);
        toast({
          title: "Notification marked as read",
          description: "The notification has been marked as read.",
        });
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to mark notification as read";
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });
        return false;
      }
    },
    [user, markAsReadMutation]
  );

  const markAllAsRead = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    try {
      const count = await markAllAsReadMutation.mutateAsync();
      toast({
        title: "All notifications marked as read",
        description: `${count} notification${count !== 1 ? "s" : ""} marked as read.`,
      });
      return count;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to mark all notifications as read";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      return 0;
    }
  }, [user, markAllAsReadMutation]);

  const deleteNotification = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        await deleteMutation.mutateAsync(notificationId);
        toast({
          title: "Notification deleted",
          description: "The notification has been deleted.",
        });
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to delete notification";
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });
        return false;
      }
    },
    [user, deleteMutation]
  );

  const archiveNotification = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        await archiveMutation.mutateAsync(notificationId);
        toast({
          title: "Notification archived",
          description: "The notification has been archived.",
        });
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to archive notification";
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });
        return false;
      }
    },
    [user, archiveMutation]
  );

  const refreshNotifications = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    notifications,
    groupedNotifications,
    unreadCount,
    loading: isLoading,
    error: error?.message ?? null,
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
