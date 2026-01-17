import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { ReviewWithDetails, ReviewSummary } from "@/types/review";
import { calculateReviewSummary } from "@/lib/reviews";

// ============================================================================
// TYPES
// ============================================================================

interface UseReviewsOptions {
  revieweeId?: string;
  reviewerId?: string;
  bookingId?: string;
  equipmentId?: string;
}

interface SubmitReviewData {
  bookingId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  photos?: string[];
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

const fetchReviews = async (
  options: UseReviewsOptions
): Promise<ReviewWithDetails[]> => {
  let query = supabase
    .from("reviews")
    .select(
      `
      *,
      reviewer:profiles!reviews_reviewer_id_fkey(id, email),
      reviewee:profiles!reviews_reviewee_id_fkey(id, email),
      booking:booking_requests(
        id,
        equipment:equipment(id, title)
      )
    `
    )
    .order("created_at", { ascending: false });

  if (options.revieweeId) {
    query = query.eq("reviewee_id", options.revieweeId);
  }

  if (options.reviewerId) {
    query = query.eq("reviewer_id", options.reviewerId);
  }

  if (options.bookingId) {
    query = query.eq("booking_id", options.bookingId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Process the data to match ReviewWithDetails type
  return (data || []).map((review) => ({
    ...review,
    booking: {
      id: review.booking?.id || "",
      equipment: {
        id: review.booking?.equipment?.id || "",
        title: review.booking?.equipment?.title || "",
      },
    },
  })) as ReviewWithDetails[];
};

const submitReviewApi = async (
  reviewData: SubmitReviewData
): Promise<void> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("User not authenticated");

  const { error } = await supabase.from("reviews").insert({
    booking_id: reviewData.bookingId,
    reviewer_id: userData.user.id,
    reviewee_id: reviewData.revieweeId,
    rating: reviewData.rating,
    comment: reviewData.comment,
    photos: reviewData.photos || null,
  });

  if (error) throw error;
};

const checkUserReviewedApi = async (
  bookingId: string,
  userId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("reviewer_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;

  return !!data;
};

// ============================================================================
// HOOK: useReviews
// ============================================================================

export const useReviews = (options: UseReviewsOptions = {}) => {
  const queryClient = useQueryClient();

  // Create stable query key based on options
  const queryKey = queryKeys.reviews.filtered(options);

  // Query for fetching reviews
  const {
    data: reviews = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchReviews(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate summary from reviews
  const summary: ReviewSummary | null = useMemo(() => {
    if (reviews.length === 0) return null;
    return calculateReviewSummary(reviews);
  }, [reviews]);

  // Mutation for submitting reviews
  const submitMutation = useMutation({
    mutationFn: submitReviewApi,
    onSuccess: () => {
      // Invalidate all review queries to refresh data
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
  });

  // Submit review wrapper with return type for API compatibility
  const submitReview = useCallback(
    async (
      reviewData: SubmitReviewData
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await submitMutation.mutateAsync(reviewData);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to submit review",
        };
      }
    },
    [submitMutation]
  );

  // Check if user has already reviewed
  const checkIfUserReviewed = useCallback(
    async (bookingId: string, userId: string): Promise<boolean> => {
      try {
        return await checkUserReviewedApi(bookingId, userId);
      } catch (err) {
        console.error("Error checking review status:", err);
        return false;
      }
    },
    []
  );

  return {
    reviews,
    summary,
    loading: isLoading,
    error: error?.message ?? null,
    fetchReviews: refetch,
    submitReview,
    checkIfUserReviewed,
    isSubmitting: submitMutation.isPending,
  };
};
