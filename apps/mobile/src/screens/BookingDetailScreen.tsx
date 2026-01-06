import { MobileHeader } from '@/components/navigation/MobileHeader';

export function BookingDetailScreen() {
  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader title="Booking" showBack />
      <div className="flex-1 p-4">
        <p className="text-muted-foreground">Booking detail screen</p>
      </div>
    </div>
  );
}
