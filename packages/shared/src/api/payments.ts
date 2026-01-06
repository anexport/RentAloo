// Payments API operations
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import type { CreatePaymentIntentRequest, CreatePaymentIntentResponse } from '../types/payment';

type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Create a payment intent via Edge Function
 * This is platform-agnostic - both web and mobile use this
 */
export async function createPaymentIntent(
  supabaseUrl: string,
  session: Session,
  data: CreatePaymentIntentRequest
): Promise<{ data: CreatePaymentIntentResponse | null; error: Error | null }> {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-payment-intent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get payment for a booking
 */
export async function getPaymentForBooking(
  client: AppSupabaseClient,
  bookingId: string
): Promise<{ data: Database['public']['Tables']['payments']['Row'] | null; error: Error | null }> {
  const { data, error } = await client
    .from('payments')
    .select('*')
    .eq('booking_request_id', bookingId)
    .single();

  return { data, error };
}

/**
 * Get payment by Stripe payment intent ID
 */
export async function getPaymentByIntentId(
  client: AppSupabaseClient,
  paymentIntentId: string
): Promise<{ data: Database['public']['Tables']['payments']['Row'] | null; error: Error | null }> {
  const { data, error } = await client
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  return { data, error };
}

/**
 * Get user's payment history
 */
export async function getPaymentHistory(
  client: AppSupabaseClient,
  userId: string,
  role: 'payer' | 'payee' = 'payer'
): Promise<{ data: Database['public']['Tables']['payments']['Row'][] | null; error: Error | null }> {
  const column = role === 'payer' ? 'payer_id' : 'payee_id';

  const { data, error } = await client
    .from('payments')
    .select('*')
    .eq(column, userId)
    .order('created_at', { ascending: false });

  return { data, error };
}
