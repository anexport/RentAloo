import { X, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileDetailStickyHeaderProps {
  title: string;
  dailyRate: number;
  isVisible: boolean;
  onClose: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

export const MobileDetailStickyHeader = ({
  title,
  dailyRate,
  isVisible,
  onClose,
  isFavorited,
  onToggleFavorite,
}: MobileDetailStickyHeaderProps) => {
  return (
    <div
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        isVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none"
      )}
      style={{
        paddingTop: "max(env(safe-area-inset-top), 0px)",
      }}
    >
      <div className="bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          {/* Close button */}
          <button
            onClick={onClose}
            className="flex-shrink-0 h-9 w-9 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Title and price */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">
              {title}
            </h1>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold tabular-nums">
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: "USD",
                }).format(dailyRate)}
              </span>{" "}
              per day
            </p>
          </div>

          {/* Favorite button */}
          <button
            onClick={onToggleFavorite}
            className="flex-shrink-0 h-9 w-9 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-all hover:scale-110"
            aria-label={
              isFavorited ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-colors",
                isFavorited
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground"
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
