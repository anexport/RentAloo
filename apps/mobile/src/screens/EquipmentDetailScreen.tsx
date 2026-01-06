import { MobileHeader } from '@/components/navigation/MobileHeader';

export function EquipmentDetailScreen() {
  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader title="Equipment" showBack />
      <div className="flex-1 p-4">
        <p className="text-muted-foreground">Equipment detail screen</p>
      </div>
    </div>
  );
}
