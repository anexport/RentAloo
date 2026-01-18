import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { BookingRequestWithDetails } from "@/types/booking";

interface InspectionData {
  id: string;
  inspection_type: "pickup" | "return";
  completed_at: string;
  photos_count: number;
  checklist_count: number;
}

interface ActiveRentalData {
  booking: BookingRequestWithDetails | null;
  pickupInspection: InspectionData | null;
  returnInspection: InspectionData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch a specific active rental with inspection data
 */
export function useActiveRental(bookingId: string | undefined): ActiveRentalData & {
  refetch: () => Promise<void>;
} {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['active-rental', bookingId, user?.id],
    queryFn: async () => {
      if (!bookingId || !user) {
        return {
          booking: null,
          pickupInspection: null,
          returnInspection: null,
        };
      }

      const bookingSelect = `
        *,
        equipment:equipment_id (
          *,
          owner:owner_id (id, email, username, full_name, avatar_url),
          category:category_id (id, name),
          photos:equipment_photos (id, photo_url, is_primary, order_index)
        ),
        renter:renter_id (id, email, username, full_name, avatar_url)
      `;

      // Try booking_request id first, then fall back to bookings.id -> booking_request_id.
      let resolvedBookingId = bookingId;
      let bookingData: BookingRequestWithDetails | null = null;

      const { data: directBooking, error: directError } = await supabase
        .from("booking_requests")
        .select(bookingSelect)
        .eq("id", bookingId)
        .maybeSingle();

      if (directError) throw directError;
      if (directBooking) {
        bookingData = directBooking as BookingRequestWithDetails;
        resolvedBookingId = bookingData.id;
      } else {
        const { data: bookingRow, error: bookingRowError } = await supabase
          .from("bookings")
          .select("booking_request_id")
          .eq("id", bookingId)
          .maybeSingle();

        if (bookingRowError) throw bookingRowError;

        if (bookingRow?.booking_request_id) {
          resolvedBookingId = bookingRow.booking_request_id;
          const { data: mappedBooking, error: mappedError } = await supabase
            .from("booking_requests")
            .select(bookingSelect)
            .eq("id", resolvedBookingId)
            .maybeSingle();

          if (mappedError) throw mappedError;
          bookingData = mappedBooking as BookingRequestWithDetails | null;
        }
      }

      if (!bookingData) {
        return {
          booking: null,
          pickupInspection: null,
          returnInspection: null,
        };
      }

      // Verify user has access (is renter or owner)
      const isRenter = bookingData.renter_id === user.id;
      const isOwner = bookingData.equipment?.owner_id === user.id;

      if (!isRenter && !isOwner) {
        throw new Error("You don't have access to this rental");
      }

      // Fetch inspections
      const { data: inspections, error: inspectionsError } = await supabase
        .from("equipment_inspections")
        .select(`
          id,
          inspection_type,
          timestamp,
          photos,
          checklist_items
        `)
        .eq("booking_id", resolvedBookingId);

      if (inspectionsError) throw inspectionsError;

      // Process inspections
      const pickup = inspections?.find((i) => i.inspection_type === "pickup");
      const returnInsp = inspections?.find((i) => i.inspection_type === "return");

      let pickupInspection: InspectionData | null = null;
      let returnInspection: InspectionData | null = null;

      if (pickup) {
        const checklistItems = Array.isArray(pickup.checklist_items)
          ? pickup.checklist_items
          : [];
        pickupInspection = {
          id: pickup.id,
          inspection_type: "pickup",
          completed_at: pickup.timestamp,
          photos_count: pickup.photos?.length || 0,
          checklist_count: checklistItems.length,
        };
      }

      if (returnInsp) {
        const checklistItems = Array.isArray(returnInsp.checklist_items)
          ? returnInsp.checklist_items
          : [];
        returnInspection = {
          id: returnInsp.id,
          inspection_type: "return",
          completed_at: returnInsp.timestamp,
          photos_count: returnInsp.photos?.length || 0,
          checklist_count: checklistItems.length,
        };
      }

      return {
        booking: bookingData,
        pickupInspection,
        returnInspection,
      };
    },
    enabled: !!bookingId && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Subscribe to real-time updates
  const resolvedBookingId = data?.booking?.id;

  useEffect(() => {
    if (!resolvedBookingId) return;

    const channel = supabase
      .channel(`rental-${resolvedBookingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "booking_requests",
          filter: `id=eq.${resolvedBookingId}`,
        },
        () => {
          void refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "equipment_inspections",
          filter: `booking_id=eq.${resolvedBookingId}`,
        },
        () => {
          void refetch();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIPTION_ERROR') {
          console.error('Failed to subscribe to rental updates');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [resolvedBookingId, refetch]);

  return {
    booking: data?.booking ?? null,
    pickupInspection: data?.pickupInspection ?? null,
    returnInspection: data?.returnInspection ?? null,
    isLoading,
    error: error?.message ?? null,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Hook to fetch all active rentals for the current user
 */
export function useActiveRentals(role: "renter" | "owner" | "both" = "both"): {
  rentals: BookingRequestWithDetails[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { user } = useAuth();

  const { data: rentals = [], isLoading, error, refetch } = useQuery({
    queryKey: ['active-rentals', user?.id, role],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      // Fetch rentals where user is renter
      let renterRentals: BookingRequestWithDetails[] = [];
      if (role === "renter" || role === "both") {
        const { data, error: renterError } = await supabase
          .from("booking_requests")
          .select(`
            *,
            equipment:equipment_id (
              *,
              owner:owner_id (id, email, username, full_name, avatar_url),
              category:category_id (id, name),
              photos:equipment_photos (id, photo_url, is_primary, order_index)
            ),
            renter:renter_id (id, email, username, full_name, avatar_url)
          `)
          .in("status", ["active", "approved"])
          .eq("renter_id", user.id)
          .order("start_date", { ascending: true });

        if (renterError) throw renterError;
        renterRentals = (data || []) as BookingRequestWithDetails[];
      }

      // Fetch rentals where user is owner (equipment they own that's being rented)
      let ownerRentals: BookingRequestWithDetails[] = [];
      if (role === "owner" || role === "both") {
        // First get user's equipment IDs
        const { data: userEquipment, error: equipError } = await supabase
          .from("equipment")
          .select("id")
          .eq("owner_id", user.id);

        if (equipError) throw equipError;

        if (userEquipment && userEquipment.length > 0) {
          const equipmentIds = userEquipment.map((e) => e.id);

          const { data, error: ownerError } = await supabase
            .from("booking_requests")
            .select(`
              *,
              equipment:equipment_id (
                *,
                owner:owner_id (id, email, username, full_name, avatar_url),
                category:category_id (id, name),
                photos:equipment_photos (id, photo_url, is_primary, order_index)
              ),
              renter:renter_id (id, email, username, full_name, avatar_url)
            `)
            .in("status", ["active", "approved"])
            .in("equipment_id", equipmentIds)
            .order("start_date", { ascending: true });

          if (ownerError) throw ownerError;
          ownerRentals = (data || []) as BookingRequestWithDetails[];
        }
      }

      // Combine and deduplicate (in case user is both renter and owner somehow)
      const allRentals = [...renterRentals, ...ownerRentals];
      const uniqueRentals = allRentals.filter(
        (rental, index, self) =>
          index === self.findIndex((r) => r.id === rental.id)
      );

      return uniqueRentals;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    rentals,
    isLoading,
    error: error?.message ?? null,
    refetch: async () => {
      await refetch();
    },
  };
}
