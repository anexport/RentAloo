import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

export type SubscriptionStatus = "idle" | "subscribing" | "subscribed" | "error";

type Payment = Database["public"]["Tables"]["payments"]["Row"];
type Inspection = Database["public"]["Tables"]["equipment_inspections"]["Row"];
type BookingRequest = Database["public"]["Tables"]["booking_requests"]["Row"];

export type BookingUpdateType = "inspection" | "payment" | "booking";

export interface BookingUpdate {
  bookingId: string;
  type: BookingUpdateType;
  payload?: {
    inspection?: Inspection;
    payment?: Payment;
    booking?: BookingRequest;
  };
}

export interface UseBookingSubscriptionsOptions {
  /** Array of booking IDs to subscribe to */
  bookingIds: string[];
  /** Callback when any booking-related update occurs */
  onUpdate: (update: BookingUpdate) => void;
  /** Whether subscriptions should be enabled (default: true) */
  enabled?: boolean;
}

/**
 * Centralized hook for managing real-time subscriptions across multiple bookings.
 * 
 * Instead of each BookingRequestCard creating its own WebSocket channels,
 * this hook creates a single channel that listens to updates for all booking IDs.
 * 
 * @example
 * ```tsx
 * const bookingIds = bookingRequests.map(b => b.id);
 * 
 * useBookingSubscriptions({
 *   bookingIds,
 *   onUpdate: ({ bookingId, type, payload }) => {
 *     if (type === 'payment' && payload?.payment?.payment_status === 'succeeded') {
 *       // Update payment state for this booking
 *     }
 *     // Refetch data as needed
 *     refetch();
 *   },
 * });
 * ```
 */
export function useBookingSubscriptions({
  bookingIds,
  onUpdate,
  enabled = true,
}: UseBookingSubscriptionsOptions): {
  status: SubscriptionStatus;
  error: string | null;
} {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const [status, setStatus] = useState<SubscriptionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Keep callback ref updated to avoid stale closures
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const setupSubscription = useCallback(() => {
    // Clean up existing channel
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Don't subscribe if disabled or no booking IDs
    if (!enabled || bookingIds.length === 0) {
      setStatus("idle");
      setError(null);
      return;
    }

    setStatus("subscribing");
    setError(null);

    // Convert to Set for O(1) membership tests instead of O(n) includes
    const bookingIdSet = new Set(bookingIds);

    // Create a single channel for all booking updates
    // Use a stable channel name based on sorted booking IDs to avoid unnecessary reconnections
    const sortedIds = [...bookingIds].sort();
    const channelId = sortedIds.length > 0 
      ? `booking-updates-${sortedIds.join("-").slice(0, 100)}` // Limit length for very long ID lists
      : "booking-updates-empty";
    const channel = supabase.channel(channelId);

    // Subscribe to inspection updates for all bookings
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "equipment_inspections",
      },
      (payload) => {
        const inspection = (payload.new || payload.old) as Inspection | undefined;
        if (inspection && bookingIdSet.has(inspection.booking_id)) {
          onUpdateRef.current({
            bookingId: inspection.booking_id,
            type: "inspection",
            payload: { inspection },
          });
        }
      }
    );

    // Subscribe to payment updates for all bookings
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "payments",
      },
      (payload) => {
        const payment = (payload.new || payload.old) as Payment | undefined;
        if (payment && bookingIdSet.has(payment.booking_request_id)) {
          onUpdateRef.current({
            bookingId: payment.booking_request_id,
            type: "payment",
            payload: { payment },
          });
        }
      }
    );

    // Subscribe to booking request status updates (including DELETE events)
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "booking_requests",
      },
      (payload) => {
        // Handle both new (INSERT/UPDATE) and old (DELETE) payloads
        const booking = (payload.new || payload.old) as BookingRequest | undefined;
        if (booking && bookingIdSet.has(booking.id)) {
          onUpdateRef.current({
            bookingId: booking.id,
            type: "booking",
            payload: { booking },
          });
        }
      }
    );

    channel.subscribe((subscriptionStatus) => {
      if (subscriptionStatus === "SUBSCRIBED") {
        setStatus("subscribed");
        setError(null);
      } else if (subscriptionStatus === "CHANNEL_ERROR") {
        setStatus("error");
        setError("Error subscribing to booking updates channel");
        console.error("Error subscribing to booking updates channel");
      } else if (subscriptionStatus === "TIMED_OUT") {
        setStatus("error");
        setError("Subscription timed out - please refresh");
        console.error("Booking updates channel subscription timed out");
      } else if (subscriptionStatus === "CLOSED") {
        setStatus("idle");
        setError(null);
        console.info("Booking updates channel closed");
      } else {
        // Handle any other unexpected statuses
        console.warn(`Unexpected subscription status: ${subscriptionStatus}`);
      }
    });

    channelRef.current = channel;
  }, [bookingIds, enabled]);

  useEffect(() => {
    setupSubscription();

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setupSubscription]);

  return { status, error };
}
