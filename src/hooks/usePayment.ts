import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import type { Payment } from "@/types/payment";
import { PAYMENT_STATUS, ESCROW_STATUS } from "@/types/payment";
import { calculatePaymentSummary } from "@/lib/payment";

// ============================================================================
// TYPES
// ============================================================================

interface CreatePaymentParams {
  bookingRequestId: string;
  ownerId: string;
  totalAmount: number;
  paymentMethodId: string;
}

interface ProcessRefundParams {
  paymentId: string;
  reason: string;
}

interface ReleaseEscrowParams {
  paymentId: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchPaymentById = async (paymentId: string) => {
  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      *,
      booking_request:booking_requests (
        *,
        equipment:equipment (
          title,
          owner:profiles (
            id,
            email,
            full_name
          )
        ),
        renter:profiles (
          id,
          email,
          full_name
        )
      )
    `
    )
    .eq("id", paymentId)
    .single();

  if (error) throw error;
  return data;
};

const fetchUserPayments = async (
  userId: string,
  userType: "renter" | "owner"
) => {
  const column = userType === "renter" ? "renter_id" : "owner_id";

  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      *,
      booking_request:booking_requests (
        *,
        equipment:equipment (
          title
        )
      )
    `
    )
    .eq(column, userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

const fetchEscrowBalance = async (ownerId: string): Promise<number> => {
  const { data, error } = await supabase
    .from("payments")
    .select("escrow_amount")
    .eq("owner_id", ownerId)
    .eq("escrow_status", "held");

  if (error) throw error;

  return data.reduce((sum, payment) => sum + (payment.escrow_amount || 0), 0);
};

const createPaymentApi = async (
  params: CreatePaymentParams & { renterId: string }
): Promise<Payment> => {
  const { bookingRequestId, ownerId, totalAmount, paymentMethodId, renterId } =
    params;

  // Calculate payment breakdown
  const paymentSummary = calculatePaymentSummary(totalAmount);

  // In production, this would call your backend API to:
  // 1. Create a Stripe Payment Intent
  // 2. Confirm the payment with the payment method
  // 3. Store the payment record in Supabase

  // For MVP, we'll simulate the payment process
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      booking_request_id: bookingRequestId,
      renter_id: renterId,
      owner_id: ownerId,
      subtotal: paymentSummary.subtotal,
      service_fee: paymentSummary.service_fee,
      tax: paymentSummary.tax,
      total_amount: paymentSummary.total,
      escrow_amount: paymentSummary.escrow_amount,
      owner_payout_amount: paymentSummary.owner_payout,
      payment_status: PAYMENT_STATUS.SUCCEEDED,
      escrow_status: ESCROW_STATUS.HELD,
      payment_method_id: paymentMethodId,
      currency: "usd",
      stripe_payment_intent_id: `pi_mock_${Date.now()}`, // Mock Stripe PI ID
    })
    .select()
    .single();

  if (paymentError) throw paymentError;

  // Update booking request status to approved
  const { error: bookingError } = await supabase
    .from("booking_requests")
    .update({ status: "approved" })
    .eq("id", bookingRequestId);

  if (bookingError) throw bookingError;

  return payment;
};

const processRefundApi = async (
  params: ProcessRefundParams,
  token: string
): Promise<void> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL is not configured");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/process-refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({
      error: "Unknown error",
    }))) as { error?: string };
    throw new Error(
      errorData.error ?? `Failed to process refund: ${response.status}`
    );
  }
};

const releaseEscrowApi = async (
  params: ReleaseEscrowParams,
  token: string
): Promise<void> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL is not configured");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/release-escrow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({
      error: "Unknown error",
    }))) as { error?: string };
    throw new Error(
      errorData.error ?? `Failed to release escrow: ${response.status}`
    );
  }
};

const checkCanReleaseEscrowApi = async (
  bookingRequestId: string
): Promise<boolean> => {
  const { data: booking, error: bookingError } = await supabase
    .from("booking_requests")
    .select("end_date, status")
    .eq("id", bookingRequestId)
    .single();

  if (bookingError) throw bookingError;

  // Check if rental has ended
  const endDate = new Date(booking.end_date);
  const now = new Date();
  const hasEnded = now > endDate;

  // Check booking status
  const isCompleted = booking.status === "completed";

  return hasEnded && isCompleted;
};

// ============================================================================
// HOOK: usePayment
// ============================================================================

export const usePayment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Mutation for creating payment
  const createPaymentMutation = useMutation({
    mutationFn: (params: CreatePaymentParams) => {
      if (!user) throw new Error("User must be authenticated");
      return createPaymentApi({ ...params, renterId: user.id });
    },
    onSuccess: () => {
      // Invalidate payment queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      // Also invalidate booking requests as status may have changed
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookingRequests.all,
      });
    },
  });

  // Mutation for processing refund
  const refundMutation = useMutation({
    mutationFn: async (params: ProcessRefundParams) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Authentication required");
      return processRefundApi(params, token);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });

  // Mutation for releasing escrow
  const releaseEscrowMutation = useMutation({
    mutationFn: async (params: ReleaseEscrowParams) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Authentication required");
      return releaseEscrowApi(params, token);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });

  // Wrapper functions for API compatibility
  const createPayment = useCallback(
    async (params: CreatePaymentParams): Promise<Payment | null> => {
      try {
        return await createPaymentMutation.mutateAsync(params);
      } catch (error) {
        console.error("Payment creation error:", error);
        return null;
      }
    },
    [createPaymentMutation]
  );

  const getPayment = useCallback(async (paymentId: string) => {
    try {
      return await fetchPaymentById(paymentId);
    } catch (error) {
      console.error("Get payment error:", error);
      return null;
    }
  }, []);

  const getUserPayments = useCallback(
    async (userType: "renter" | "owner") => {
      if (!user) return [];
      try {
        return await fetchUserPayments(user.id, userType);
      } catch (error) {
        console.error("Get user payments error:", error);
        return [];
      }
    },
    [user]
  );

  const processRefund = useCallback(
    async (params: ProcessRefundParams): Promise<boolean> => {
      if (!user) return false;
      try {
        await refundMutation.mutateAsync(params);
        return true;
      } catch (error) {
        console.error("Refund error:", error);
        return false;
      }
    },
    [user, refundMutation]
  );

  const releaseEscrow = useCallback(
    async (params: ReleaseEscrowParams): Promise<boolean> => {
      if (!user) return false;
      try {
        await releaseEscrowMutation.mutateAsync(params);
        return true;
      } catch (error) {
        console.error("Release escrow error:", error);
        return false;
      }
    },
    [user, releaseEscrowMutation]
  );

  const getEscrowBalance = useCallback(async (ownerId: string) => {
    try {
      return await fetchEscrowBalance(ownerId);
    } catch (error) {
      console.error("Get escrow balance error:", error);
      return 0;
    }
  }, []);

  const canReleaseEscrow = useCallback(
    async (bookingRequestId: string): Promise<boolean> => {
      try {
        return await checkCanReleaseEscrowApi(bookingRequestId);
      } catch (error) {
        console.error("Check escrow release error:", error);
        return false;
      }
    },
    []
  );

  // Combined loading state
  const loading =
    createPaymentMutation.isPending ||
    refundMutation.isPending ||
    releaseEscrowMutation.isPending;

  // Combined error state
  const error =
    createPaymentMutation.error?.message ||
    refundMutation.error?.message ||
    releaseEscrowMutation.error?.message ||
    null;

  return {
    loading,
    error,
    createPayment,
    getPayment,
    getUserPayments,
    processRefund,
    releaseEscrow,
    getEscrowBalance,
    canReleaseEscrow,
  };
};

// ============================================================================
// STANDALONE QUERY HOOKS
// ============================================================================

/**
 * Hook for fetching a single payment by ID
 */
export const usePaymentQuery = (paymentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.payments.byId(paymentId ?? ""),
    queryFn: () => fetchPaymentById(paymentId!),
    enabled: !!paymentId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for fetching user's payments
 */
export const useUserPaymentsQuery = (userType: "renter" | "owner") => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.payments.byUser(user?.id ?? "", userType),
    queryFn: () => fetchUserPayments(user!.id, userType),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for fetching owner's escrow balance
 */
export const useEscrowBalanceQuery = (ownerId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.payments.escrowBalance(ownerId ?? ""),
    queryFn: () => fetchEscrowBalance(ownerId!),
    enabled: !!ownerId,
    staleTime: 2 * 60 * 1000, // 2 minutes for more real-time balance
  });
};
