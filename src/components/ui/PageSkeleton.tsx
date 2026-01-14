import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { ContentCard } from "./ContentCard";

interface PageSkeletonProps {
  /** Additional className */
  className?: string;
}

/**
 * PageHeaderSkeleton - Skeleton for page headers
 */
const PageHeaderSkeleton = ({ className }: PageSkeletonProps) => {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" shimmer />
        <div>
          <Skeleton className="h-7 w-48 mb-2" shimmer />
          <Skeleton className="h-4 w-64" shimmer />
        </div>
      </div>
      <Skeleton className="h-10 w-32 rounded-lg" shimmer />
    </div>
  );
};

/**
 * CardSkeleton - Skeleton for standard content cards
 */
interface CardSkeletonProps extends PageSkeletonProps {
  /** Show image placeholder */
  hasImage?: boolean;
  /** Number of text lines */
  lines?: number;
}

const CardSkeleton = ({
  className,
  hasImage = false,
  lines = 3,
}: CardSkeletonProps) => {
  return (
    <ContentCard className={cn("overflow-hidden", className)}>
      {hasImage && (
        <Skeleton className="w-full h-40 rounded-xl mb-4" shimmer />
      )}
      <Skeleton className="h-5 w-3/4 mb-3" shimmer />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4 mb-2",
            i === lines - 1 ? "w-1/2" : "w-full"
          )}
          shimmer
        />
      ))}
    </ContentCard>
  );
};

/**
 * StatsGridSkeleton - Skeleton for stats/metrics grid
 */
interface StatsGridSkeletonProps extends PageSkeletonProps {
  count?: number;
}

const StatsGridSkeleton = ({
  className,
  count = 4,
}: StatsGridSkeletonProps) => {
  return (
    <div
      className={cn(
        "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ContentCard key={i} className="space-y-3">
          <Skeleton className="h-4 w-24" shimmer />
          <Skeleton className="h-8 w-20" shimmer />
        </ContentCard>
      ))}
    </div>
  );
};

/**
 * ListSkeleton - Skeleton for list items
 */
interface ListSkeletonProps extends PageSkeletonProps {
  count?: number;
  hasAvatar?: boolean;
}

const ListSkeleton = ({
  className,
  count = 3,
  hasAvatar = false,
}: ListSkeletonProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ContentCard key={i} className="flex items-center gap-4">
          {hasAvatar && (
            <Skeleton className="w-12 h-12 rounded-full shrink-0" shimmer />
          )}
          <div className="flex-1 min-w-0">
            <Skeleton className="h-5 w-3/4 mb-2" shimmer />
            <Skeleton className="h-4 w-1/2" shimmer />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg shrink-0" shimmer />
        </ContentCard>
      ))}
    </div>
  );
};

/**
 * BookingCardSkeleton - Skeleton for booking cards
 */
const BookingCardSkeleton = ({ className }: PageSkeletonProps) => {
  return (
    <ContentCard className={cn(className)}>
      <div className="flex gap-4">
        {/* Image */}
        <Skeleton className="w-24 h-24 rounded-xl shrink-0" shimmer />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <Skeleton className="h-5 w-48" shimmer />
            <Skeleton className="h-6 w-20 rounded-full" shimmer />
          </div>
          <Skeleton className="h-4 w-32 mb-2" shimmer />
          <Skeleton className="h-4 w-40 mb-3" shimmer />

          {/* Actions */}
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" shimmer />
            <Skeleton className="h-9 w-24 rounded-lg" shimmer />
          </div>
        </div>
      </div>
    </ContentCard>
  );
};

/**
 * DashboardSkeleton - Full dashboard page skeleton
 */
const DashboardSkeleton = ({ className }: PageSkeletonProps) => {
  return (
    <div className={cn("space-y-6 animate-page-enter", className)}>
      {/* Header */}
      <PageHeaderSkeleton />

      {/* Stats */}
      <StatsGridSkeleton />

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </div>
        <div>
          <CardSkeleton lines={5} />
        </div>
      </div>
    </div>
  );
};

/** Animation stagger delay in milliseconds for loading dots */
const STAGGER_DELAY_MS = 150;
/** Number of dots in the loading indicator */
const DOT_INDICES = [0, 1, 2] as const;

/**
 * PageTransitionLoader - Minimal loading indicator for page transitions
 * Replaces the large spinning wheel with a subtle progress bar
 */
const PageTransitionLoader = ({ className }: PageSkeletonProps) => {
  return (
    <div 
      className={cn("min-h-[60vh] flex items-center justify-center", className)}
      role="status"
      aria-live="polite"
      aria-label="Loading page content"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Subtle pulsing dot */}
        <div className="flex gap-1.5" aria-hidden="true">
          {DOT_INDICES.map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/60 animate-pulse"
              style={{ animationDelay: `${i * STAGGER_DELAY_MS}ms` }}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground" aria-hidden="true">Loading...</p>
        <span className="sr-only">Loading page content, please wait</span>
      </div>
    </div>
  );
};

export {
  PageHeaderSkeleton,
  CardSkeleton,
  StatsGridSkeleton,
  ListSkeleton,
  BookingCardSkeleton,
  DashboardSkeleton,
  PageTransitionLoader,
};
