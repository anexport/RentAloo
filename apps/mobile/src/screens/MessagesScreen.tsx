import { MobileHeader } from '@/components/navigation/MobileHeader';

export function MessagesScreen() {
  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader title="Messages" />

      <div className="flex-1 p-4">
        {/* Conversation list placeholder */}
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border"
            >
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </div>
              <div className="h-3 bg-muted rounded animate-pulse w-12" />
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            Your conversations will appear here
          </p>
        </div>
      </div>
    </div>
  );
}
