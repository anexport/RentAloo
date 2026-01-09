import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface UnreadCounts {
  messages: number;
  pendingBookings: number;
  pendingPayouts: number;
  supportTickets: number;
}

interface UseUnreadCountsOptions {
  /** Enable owner-specific counts (pending bookings, payouts) */
  includeOwnerCounts?: boolean;
}

/**
 * Hook to fetch and subscribe to unread/pending counts for navigation badges.
 * Provides real-time updates via Supabase channels.
 */
export const useUnreadCounts = (options: UseUnreadCountsOptions = {}): UnreadCounts & { isLoading: boolean } => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const userId = user?.id;

  // Unread messages count
  const { data: messages = 0, isLoading: messagesLoading } = useQuery({
    queryKey: ["unread-counts", "messages", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_unread_messages_count");
      if (error) {
        console.error("Failed to fetch unread messages count:", error);
        return 0;
      }
      return typeof data === "number" ? data : 0;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // Pending booking requests (for owners - requests awaiting their approval)
  const { data: pendingBookings = 0, isLoading: bookingsLoading } = useQuery({
    queryKey: ["unread-counts", "pending-bookings", userId],
    enabled: !!userId && options.includeOwnerCounts,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("booking_requests")
        .select("id, equipment:equipment_id!inner(owner_id)", {
          count: "exact",
          head: true,
        })
        .eq("equipment.owner_id", userId!)
        .eq("status", "pending");
      if (error) {
        console.error("Failed to fetch pending bookings:", error);
        return 0;
      }
      return count || 0;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Pending payouts (for owners)
  const { data: pendingPayouts = 0, isLoading: payoutsLoading } = useQuery({
    queryKey: ["unread-counts", "pending-payouts", userId],
    enabled: !!userId && options.includeOwnerCounts,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", userId!)
        .or("payout_status.eq.pending,payout_status.is.null");
      if (error) {
        console.error("Failed to fetch pending payouts:", error);
        return 0;
      }
      return count || 0;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Open support tickets
  const { data: supportTickets = 0, isLoading: ticketsLoading } = useQuery({
    queryKey: ["unread-counts", "support-tickets", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("damage_claims")
        .select("*", { count: "exact", head: true })
        .eq("filed_by", userId!)
        .in("status", ["pending", "disputed", "escalated"]);
      if (error) {
        console.error("Failed to fetch support tickets:", error);
        return 0;
      }
      return count || 0;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Set up real-time subscription for messages
  useEffect(() => {
    if (!userId) {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const setupSubscription = async () => {
      // Get user's conversations
      const { data: participants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("profile_id", userId);

      if (participantsError || !participants?.length) {
        return null;
      }

      const conversationIds = participants.map((p) => p.conversation_id);
      const channel = supabase.channel(`unread-counts-${userId}`);

      // Subscribe to new messages in user's conversations
      conversationIds.forEach((conversationId) => {
        channel.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            // Don't count own messages
            if (payload.new?.sender_id === userId) return;
            // Invalidate messages count query
            void queryClient.invalidateQueries({
              queryKey: ["unread-counts", "messages", userId],
            });
          }
        );
      });

      // Subscribe to booking request changes (for owners)
      if (options.includeOwnerCounts) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "booking_requests",
          },
          () => {
            void queryClient.invalidateQueries({
              queryKey: ["unread-counts", "pending-bookings", userId],
            });
          }
        );
      }

      channel.subscribe();
      return channel;
    };

    // Cleanup existing channel
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    void setupSubscription().then((ch) => {
      channelRef.current = ch;
    });

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, options.includeOwnerCounts, queryClient]);

  return {
    messages,
    pendingBookings,
    pendingPayouts,
    supportTickets,
    isLoading: messagesLoading || bookingsLoading || payoutsLoading || ticketsLoading,
  };
};
