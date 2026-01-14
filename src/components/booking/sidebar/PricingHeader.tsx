import StarRating from "@/components/reviews/StarRating";

interface PricingHeaderProps {
  dailyRate: number;
  avgRating: number;
  reviewCount: number;
}

const PricingHeader = ({
  dailyRate,
  avgRating,
  reviewCount,
}: PricingHeaderProps) => {
  return (
    <div role="region" aria-labelledby="pricing-header">
      <div id="pricing-header" className="text-headline-lg font-bold text-foreground">
        ${dailyRate.toLocaleString()}
        <span className="text-label-md text-muted-foreground">
          {" "}
          / day
        </span>
      </div>
      {avgRating > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <StarRating rating={avgRating} size="sm" />
          <span className="text-label-sm text-muted-foreground">
            {avgRating.toFixed(1)} ({reviewCount} reviews)
          </span>
        </div>
      )}
    </div>
  );
};

export default PricingHeader;

