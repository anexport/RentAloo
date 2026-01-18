import { useEffect, useState, useRef } from "react";
import {
  Calendar,
  DollarSign,
  Heart,
  Star,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Stats {
  activeBookings: number;
  savedItems: number;
  totalSpent: number;
  averageRating: number;
}

interface TrendData {
  current: number;
  previous: number;
  trend: number; // percentage change
}

interface StatCardData {
  title: string;
  value: number | string;
  icon: typeof Calendar;
  href?: string;
  trend?: TrendData;
  accentColor: string;
}

// Animated counter hook
const useAnimatedCounter = (target: number, duration = 1000) => {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    const startTime = performance.now();
    startTimeRef.current = startTime;
    const startValue = 0;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) return;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(
        startValue + (target - startValue) * easeOut
      );

      setCount(currentValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [target, duration]);

  return count;
};

/**
 * Groups items by month into buckets for sparkline data.
 * Uses UTC getters to avoid timezone-related misclassification near month boundaries.
 */
export const groupByMonth = <T,>(
  items: T[],
  getTimestamp: (item: T) => string | null = (item) => (item as { created_at?: string | null }).created_at ?? null,
  getValue: (item: T) => number = () => 1,
  now: Date = new Date()
): number[] => {
  const monthBuckets = [0, 0, 0];

  items.forEach((item) => {
    const timestamp = getTimestamp(item);
    if (!timestamp) return;
    const itemDate = new Date(timestamp);
    const monthDiff =
      now.getUTCMonth() -
      itemDate.getUTCMonth() +
      (now.getUTCFullYear() - itemDate.getUTCFullYear()) * 12;

    if (monthDiff >= 0 && monthDiff <= 2) {
      monthBuckets[2 - monthDiff] += getValue(item);
    }
  });

  return monthBuckets;
};

const StatsOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    activeBookings: 0,
    savedItems: 0,
    totalSpent: 0,
    averageRating: 0,
  });
  const [trends, setTrends] = useState<{
    activeBookings: TrendData;
    savedItems: TrendData;
    totalSpent: TrendData;
    averageRating: TrendData;
  }>({
    activeBookings: { current: 0, previous: 0, trend: 0 },
    savedItems: { current: 0, previous: 0, trend: 0 },
    totalSpent: { current: 0, previous: 0, trend: 0 },
    averageRating: { current: 0, previous: 0, trend: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const now = new Date();
        // Use UTC for date boundaries to align with groupByMonth's UTC semantics
        const oneMonthAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const currentMonthStart = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
        );

        // Fetch all-time stats
        const [
          activeCountResult,
          favoritesCountResult,
          paymentsResult,
          reviewsResult,
        ] = await Promise.all([
          // Active bookings (bookings with status='active', including upcoming ones)
          supabase
            .from("booking_requests")
            .select("*", { count: "exact", head: true })
            .eq("renter_id", user.id)
            .eq("status", "active"),
          // Saved items (favorites, all-time)
          supabase
            .from("user_favorites")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          // Total spent (all-time)
          supabase
            .from("payments")
            .select("total_amount")
            .eq("renter_id", user.id)
            .eq("payment_status", "succeeded"),
          // Average rating (reviews received as renter, all-time)
          supabase.from("reviews").select("rating").eq("reviewee_id", user.id),
        ]);

        // Check for errors in queries
        if (activeCountResult.error) throw activeCountResult.error;
        if (favoritesCountResult.error) throw favoritesCountResult.error;
        if (paymentsResult.error) throw paymentsResult.error;
        if (reviewsResult.error) throw reviewsResult.error;

        // Fetch previous month stats for trends
        const [
          prevActiveCountResult,
          prevFavoritesCountResult,
          prevPaymentsResult,
          prevReviewsResult,
        ] = await Promise.all([
          // Count bookings that became active during the previous month
          // Uses activated_at timestamp to track when rentals actually started
          supabase
            .from("booking_requests")
            .select("*", { count: "exact", head: true })
            .eq("renter_id", user.id)
            .not("activated_at", "is", null)
            .lt("activated_at", currentMonthStart.toISOString())
            .gte("activated_at", oneMonthAgo.toISOString()),
          supabase
            .from("user_favorites")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .lt("created_at", currentMonthStart.toISOString())
            .gte("created_at", oneMonthAgo.toISOString()),
          supabase
            .from("payments")
            .select("total_amount")
            .eq("renter_id", user.id)
            .eq("payment_status", "succeeded")
            .lt("created_at", currentMonthStart.toISOString())
            .gte("created_at", oneMonthAgo.toISOString()),
          supabase
            .from("reviews")
            .select("rating")
            .eq("reviewee_id", user.id)
            .lt("created_at", currentMonthStart.toISOString())
            .gte("created_at", oneMonthAgo.toISOString()),
        ]);

        // Check for errors in previous month queries
        if (prevActiveCountResult.error) throw prevActiveCountResult.error;
        if (prevFavoritesCountResult.error)
          throw prevFavoritesCountResult.error;
        if (prevPaymentsResult.error) throw prevPaymentsResult.error;
        if (prevReviewsResult.error) throw prevReviewsResult.error;

        // Calculate current stats
        const activeCount = activeCountResult.count || 0;
        const savedItemsCount = favoritesCountResult.count || 0;
        const totalSpent =
          paymentsResult.data?.reduce(
            (sum, p) => sum + Number(p.total_amount ?? 0),
            0
          ) ?? 0;

        // Calculate average rating
        const ratings = reviewsResult.data?.map((r) => r.rating) || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : 0;

        // Calculate previous month stats
        const prevActiveCount = prevActiveCountResult.count || 0;
        const prevSavedItemsCount = prevFavoritesCountResult.count || 0;
        const prevTotalSpent =
          prevPaymentsResult.data?.reduce(
            (sum, p) => sum + Number(p.total_amount ?? 0),
            0
          ) ?? 0;
        const prevRatings = prevReviewsResult.data?.map((r) => r.rating) || [];
        const prevAverageRating =
          prevRatings.length > 0
            ? prevRatings.reduce((sum, r) => sum + r, 0) / prevRatings.length
            : 0;

        // Calculate trends
        const calculateTrend = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        setTrends({
          activeBookings: {
            current: activeCount,
            previous: prevActiveCount,
            trend: calculateTrend(activeCount, prevActiveCount),
          },
          savedItems: {
            current: savedItemsCount,
            previous: prevSavedItemsCount,
            trend: calculateTrend(savedItemsCount, prevSavedItemsCount),
          },
          totalSpent: {
            current: totalSpent,
            previous: prevTotalSpent,
            trend: calculateTrend(totalSpent, prevTotalSpent),
          },
          averageRating: {
            current: averageRating,
            previous: prevAverageRating,
            trend: calculateTrend(averageRating, prevAverageRating),
          },
        });

        setStats({
          activeBookings: activeCount,
          savedItems: savedItemsCount,
          totalSpent,
          averageRating,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error("Failed to load statistics", {
          description: "Please try again",
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, [user]);

  // Animated counters
  const animatedActive = useAnimatedCounter(stats.activeBookings);
  const animatedSaved = useAnimatedCounter(stats.savedItems);
  const animatedSpent = useAnimatedCounter(Math.round(stats.totalSpent));
  const animatedRating =
    useAnimatedCounter(Math.round(stats.averageRating * 10)) / 10;

  if (loading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="group relative rounded-2xl bg-muted/30 p-5 sm:p-6"
          >
            <Skeleton className="h-4 w-20 mb-4" />
            <Skeleton className="h-9 w-24 mb-2" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const formatTrend = (trend: number): string => {
    const abs = Math.abs(trend);
    if (abs < 0.1) return "—";
    const sign = trend > 0 ? "+" : "";
    return `${sign}${abs.toFixed(1)}%`;
  };

  const statCards: StatCardData[] = [
    {
      title: "Active Rentals",
      value: animatedActive,
      icon: Calendar,
      href: "/renter/bookings",
      trend: trends.activeBookings,
      accentColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Saved",
      value: animatedSaved,
      icon: Heart,
      href: "/renter/saved",
      trend: trends.savedItems,
      accentColor: "text-rose-600 dark:text-rose-400",
    },
    {
      title: "Spent",
      value: `$${animatedSpent.toLocaleString()}`,
      icon: DollarSign,
      href: "/renter/payments",
      trend: trends.totalSpent,
      accentColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Rating",
      value: stats.averageRating > 0 ? animatedRating.toFixed(1) : "—",
      icon: Star,
      href: "/settings?tab=reviews",
      trend: trends.averageRating,
      accentColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  const handleCardClick = (href?: string) => {
    if (href) {
      void navigate(href);
    }
  };

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const trend = stat.trend;
        const isPositive = trend ? trend.trend >= 0 : false;
        const hasTrend = trend && Math.abs(trend.trend) > 0.1;

        return (
          <button
            key={stat.title}
            className={cn(
              "group relative text-left rounded-2xl p-5 sm:p-6",
              "bg-card border border-border/50",
              "transition-all duration-300 ease-out",
              "hover:border-border hover:shadow-lg hover:shadow-black/5",
              "dark:hover:shadow-black/20",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            )}
            onClick={() => handleCardClick(stat.href)}
            aria-label={`View details for ${stat.title}`}
          >
            {/* Subtle hover gradient overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Content */}
            <div className="relative">
              {/* Header row with icon and trend */}
              <div className="flex items-center justify-between mb-3">
                <Icon className={cn("h-5 w-5", stat.accentColor)} />
                {hasTrend && (
                  <div
                    className={cn(
                      "flex items-center gap-0.5 text-xs font-medium tabular-nums",
                      isPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400"
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{formatTrend(trend.trend)}</span>
                  </div>
                )}
              </div>

              {/* Value */}
              <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-1">
                {stat.value}
              </div>

              {/* Label with link indicator */}
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">
                  {stat.title}
                </span>
                <ArrowUpRight className="h-3 w-3 text-muted-foreground/50 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default StatsOverview;
