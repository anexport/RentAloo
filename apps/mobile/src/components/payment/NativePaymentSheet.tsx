import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Stripe, PaymentSheetEventsEnum } from '@capacitor-community/stripe';
import { useAuth } from '@/hooks/useAuth';
import { createPaymentIntent } from '@rentaloo/shared/api';
import { getConfig } from '@rentaloo/shared';

interface NativePaymentSheetProps {
  bookingId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Native PaymentSheet component for mobile
 * Uses Stripe's native PaymentSheet instead of web-based Stripe Elements
 */
export function NativePaymentSheet({
  bookingId,
  onSuccess,
  onError,
}: NativePaymentSheetProps) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize Stripe plugin
  useEffect(() => {
    const initStripe = async () => {
      if (!Capacitor.isNativePlatform()) {
        console.log('PaymentSheet not available in web mode');
        return;
      }

      try {
        const config = getConfig();
        await Stripe.initialize({
          publishableKey: config.stripePublishableKey,
        });
        setInitialized(true);
      } catch (err) {
        console.error('Failed to initialize Stripe:', err);
        setError('Payment system unavailable');
      }
    };

    initStripe();
  }, []);

  const handlePayment = useCallback(async () => {
    if (!session) {
      setError('Please sign in to continue');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      setError('Native payments not available in browser');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config = getConfig();

      // 1. Create payment intent on backend
      // Note: The backend should return ephemeralKey and customerId for PaymentSheet
      const { data, error: apiError } = await createPaymentIntent(
        config.supabaseUrl,
        session,
        {
          equipment_id: bookingId, // This would come from booking data
          start_date: '', // This would come from booking data
          end_date: '',
          total_amount: 0,
          insurance_type: 'none',
          insurance_cost: 0,
          damage_deposit_amount: 0,
        }
      );

      if (apiError || !data) {
        throw new Error(apiError?.message || 'Failed to create payment');
      }

      // 2. Create PaymentSheet
      await Stripe.createPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        // Note: For full PaymentSheet functionality, backend should also return:
        // customerId: data.customerId,
        // customerEphemeralKeySecret: data.ephemeralKey,
        merchantDisplayName: 'Rentaloo',
        style: 'alwaysLight', // or 'alwaysDark'
        returnURL: 'rentaloo://payment/confirmation',
      });

      // 3. Present PaymentSheet to user
      const result = await Stripe.presentPaymentSheet();

      if (result.paymentResult === PaymentSheetEventsEnum.Completed) {
        onSuccess?.();
        navigate('/payment/confirmation');
      } else if (result.paymentResult === PaymentSheetEventsEnum.Canceled) {
        // User canceled, do nothing
      } else if (result.paymentResult === PaymentSheetEventsEnum.Failed) {
        throw new Error('Payment failed');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [session, bookingId, navigate, onSuccess, onError]);

  // Web fallback message
  if (!Capacitor.isNativePlatform()) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          Native payments are only available in the mobile app. 
          For web, use the standard checkout flow.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Payment summary would go here */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-2">Payment Summary</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rental</span>
            <span>$0.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service fee</span>
            <span>$0.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deposit</span>
            <span>$0.00</span>
          </div>
          <div className="h-px bg-border my-2" />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>$0.00</span>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={handlePayment}
        disabled={loading || !initialized}
        className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>

      <p className="text-xs text-center text-muted-foreground">
        Payments are processed securely by Stripe
      </p>
    </div>
  );
}
