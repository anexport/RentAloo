// Payment types - shared between web and mobile
import type { Database } from './database.types';

export type Payment = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type EscrowStatus = 'held' | 'released' | 'refunded' | 'disputed';

export type DepositStatus = 'held' | 'released' | 'claimed' | 'refunded';

// Constants for type-safe status values
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
} as const satisfies Record<string, PaymentStatus>;

export const ESCROW_STATUS = {
  HELD: 'held',
  RELEASED: 'released',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
} as const satisfies Record<string, EscrowStatus>;

export type PaymentMethod = {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  is_default: boolean;
};

export type PaymentFormData = {
  payment_method_id: string;
  save_payment_method?: boolean;
};

export type PaymentIntent = {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  client_secret: string;
  metadata: {
    booking_request_id: string;
    renter_id: string;
    owner_id: string;
  };
};

export interface PaymentWithDeposit extends Payment {
  rental_amount: number;
  deposit_amount: number;
  insurance_amount: number;
  deposit_status: DepositStatus;
  deposit_released_at: string | null;
}

export type PaymentSummary = {
  subtotal: number;
  service_fee: number;
  tax: number;
  insurance: number;
  deposit: number;
  total: number;
  escrow_amount: number;
  owner_payout: number;
};

export type TransactionHistory = {
  id: string;
  booking_request_id: string;
  amount: number;
  status: PaymentStatus;
  type: 'payment' | 'refund' | 'payout';
  created_at: string;
  equipment_title: string;
  counterparty_name: string;
};

export type PayoutRequest = {
  id: string;
  owner_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
};

/**
 * Data needed to create a payment intent
 * Used by both web (Stripe Elements) and mobile (PaymentSheet)
 */
export interface CreatePaymentIntentRequest {
  equipment_id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  insurance_type: 'none' | 'basic' | 'premium';
  insurance_cost: number;
  damage_deposit_amount: number;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  ephemeralKey?: string; // Only for mobile PaymentSheet
  customerId?: string; // Only for mobile PaymentSheet
}
