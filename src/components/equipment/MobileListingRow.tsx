import { type Listing } from "@/components/equipment/services/listings";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import StarRating from "@/components/reviews/StarRating";

type Props = {
  listing: Listing;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
};

const MobileListingRow = ({
  listing,
  isSelected,
  onClick,
  className,
}: Props) => {
  const { t } = useTranslation("equipment");
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
        "flex w-full items-start gap-3 py-3 text-left border-b border-border/40 last:border-0 active:bg-muted/50 transition-colors",
        isSelected && "bg-muted/30 -mx-4 px-4",
        className
      )}
    >
      {/* Thumbnail - Image on left */}
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={listing.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
            {t("listing_card.no_image")}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between min-h-[96px] py-0.5">
        <div>
          <h3 className="font-semibold text-base leading-tight line-clamp-2 mb-1 text-foreground">
            {listing.title}
          </h3>

          <div className="flex items-center text-sm text-muted-foreground mb-1">
            {avgRating ? (
              <div className="flex items-center text-foreground font-medium mr-2">
                <span className="mr-1">{avgRating}</span>
                <StarRating rating={parseFloat(avgRating)} size="sm" />
                <span className="ml-1 text-muted-foreground font-normal">
                  ({reviews.length})
                </span>
              </div>
            ) : (
              <span className="mr-2 text-xs">
                {t("listing_card.no_reviews")}
              </span>
            )}
          </div>

          <div className="flex items-center text-xs text-muted-foreground truncate">
            <MapPin className="mr-0.5 h-3 w-3 flex-shrink-0" />
            <span className="truncate">{listing.location}</span>
          </div>
        </div>

        <div className="mt-1">
          <span className="text-base font-bold text-foreground">
            ${listing.daily_rate}
          </span>
          <span className="text-xs text-muted-foreground ml-1">
            {t("listing_card.per_day")}
          </span>
        </div>
      </div>
    </button>
  );
};

export default MobileListingRow;
