import { MobileHeader } from '@/components/navigation/MobileHeader';

export function RentalsScreen() {
  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader title="My Rentals" />

      <div className="flex-1 p-4">
        {/* Tabs: Active / Past */}
        <div className="flex gap-2 mb-4">
          <button className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
            Active
          </button>
          <button className="flex-1 py-2 px-4 bg-muted text-muted-foreground rounded-lg text-sm font-medium">
            Past
          </button>
        </div>

        {/* Rental list placeholder */}
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-card rounded-xl overflow-hidden border border-border"
            >
              <div className="flex">
                <div className="w-24 h-24 bg-muted animate-pulse" />
                <div className="flex-1 p-3 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            You don't have any active rentals
          </p>
        </div>
      </div>
    </div>
  );
}
