import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type {
  BookingRequestWithDetails,
  BookingStatus,
} from "../types/booking";
import type { Database } from "@/lib/database.types";

type BookingRequestRow =
  Database["public"]["Tables"]["booking_requests"]["Row"];
type EquipmentRow = Database["public"]["Tables"]["equipment"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type EquipmentPhotoRow = Database["public"]["Tables"]["equipment_photos"]["Row"];

type BookingRequestWithRelations = BookingRequestRow & {
  equipment: EquipmentRow & {
    category: CategoryRow;
    photos: EquipmentPhotoRow[];
    owner: ProfileRow;
  };
  renter: ProfileRow;
};

// Shared select query for booking requests with all relations
const BOOKING_SELECT_QUERY = `
  *,
  equipment:equipment!inner(
    *,
    category:categories(*),
    photos:equipment_photos(*),
    owner:profiles!equipment_owner_id_fkey(*)
  ),
  renter:profiles!booking_requests_renter_id_fkey(*)
`;

/**
 * Fetch booking requests based on user role
 * - For renters: fetches bookings where user is the renter
 * - For owners: fetches bookings for equipment owned by the user (single query with join)
 */
async function fetchBookingRequests(
  userId: string,
  userRole?: "renter" | "owner"
): Promise<BookingRequestWithDetails[]> {
  // Guard: require valid userId and userRole to prevent unfiltered queries
  if (!userId || !userRole) {
    return [];
  }

  let query = supabase
    .from("booking_requests")
    .select(BOOKING_SELECT_QUERY)
    .order("created_at", { ascending: false });

  if (userRole === "renter") {
    // Filter by renter_id
    query = query.eq("renter_id", userId);
  } else if (userRole === "owner") {
    // Use inner join to filter by owner - single query instead of N+1
    query = query.eq("equipment.owner_id", userId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Transform the data to flatten the owner from equipment
  return (data || []).map((item: BookingRequestWithRelations) => ({
    ...item,
    owner: item.equipment?.owner || null,
  }));
}

/**
 * Hook for fetching and managing booking requests using React Query
 *
 * Benefits over the previous implementation:
 * - Automatic caching and deduplication
 * - Background refetching
 * - Optimistic updates
 * - Single query for owner bookings (no N+1)
 * - Consistent loading/error states
 */
export const useBookingRequests = (userRole?: "renter" | "owner") => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ["booking-requests", userRole, user?.id];

  const {
    data: bookingRequests = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchBookingRequests(user?.id ?? "", userRole),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes (project standard)
  });

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to fetch booking requests"
    : null;

  // Mutation for updating booking status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      bookingId,
      status,
    }: {
      bookingId: string;
      status: BookingStatus;
    }) => {
      const { error } = await supabase
        .from("booking_requests")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate and refetch booking requests
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateBookingStatus = async (
    bookingId: string,
    status: BookingStatus
  ) => {
    await updateStatusMutation.mutateAsync({ bookingId, status });
  };

  // Backwards compatibility: wrap refetch to match previous API
  const fetchBookingRequestsCompat = async () => {
    await refetch();
  };

  const getBookingStats = () => {
    // Single pass reduction for better performance
    return bookingRequests.reduce(
      (stats, r) => {
        stats.total++;
        if (r.status === "approved") stats.approved++;
        else if (r.status === "active") stats.active++;
        else if (r.status === "cancelled") stats.cancelled++;
        else if (r.status === "completed") stats.completed++;
        return stats;
      },
      { total: 0, approved: 0, active: 0, cancelled: 0, completed: 0 }
    );
  };

  return {
    bookingRequests,
    loading,
    error,
    fetchBookingRequests: fetchBookingRequestsCompat,
    updateBookingStatus,
    getBookingStats,
  };
};
