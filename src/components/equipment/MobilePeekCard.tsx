import { type Listing } from "@/components/equipment/services/listings";
import { cn } from "@/lib/utils";
import StarRating from "@/components/reviews/StarRating";

type Props = {
  listing: Listing;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
};

const MobilePeekCard = ({ listing, isSelected, onClick, className }: Props) => {
  const photoUrl = listing.photos?.[0]?.photo_url;

  // Calculate rating
  const reviews = listing.reviews ?? [];
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-shrink-0 w-[160px] rounded-xl overflow-hidden bg-card border shadow-sm transition-all active:scale-[0.98]",
        isSelected ? "ring-2 ring-primary border-primary" : "border-border/50",
        className
      )}
    >
      {/* Image - Compact 16:9ish ratio */}
      <div className="relative h-20 w-full bg-muted">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={listing.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No Image
          </div>
        )}
      </div>

      {/* Content - Minimal */}
      <div className="p-2 text-left">
        <h3 className="font-semibold text-sm leading-tight line-clamp-1 mb-1 text-foreground">
          {listing.title}
        </h3>

        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-foreground">
            ${listing.daily_rate}
            <span className="text-[10px] font-normal text-muted-foreground">
              /d
            </span>
          </div>

          {avgRating && (
            <div className="flex items-center gap-1 scale-75 origin-right -mr-1">
              <StarRating rating={parseFloat(avgRating)} size="sm" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export default MobilePeekCard;
