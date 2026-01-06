import { useParams } from 'react-router-dom';
import { MobileHeader } from '@/components/navigation/MobileHeader';
import { NativePaymentSheet } from '@/components/payment/NativePaymentSheet';

export function PaymentScreen() {
  const { bookingId } = useParams<{ bookingId: string }>();

  if (!bookingId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Invalid booking</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader title="Payment" showBack />
      <div className="flex-1 p-4">
        <NativePaymentSheet bookingId={bookingId} />
      </div>
    </div>
  );
}
