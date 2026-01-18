import { useEffect, useState } from "react";
import {
  Calendar,
  Heart,
  DollarSign,
  Star,
  Package,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type StatItem = {
  key: string;
  label: string;
  value: number | string;
  icon: React.ElementType;
  href?: string;
  color: string;
};

type CompactStatsProps = {
  variant: "renter" | "owner";
  className?: string;
};

export default function CompactStats({
  variant,
  className,
}: CompactStatsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    // Renter stats
    activeRentals: 0,
    savedItems: 0,
    totalSpent: 0,
    renterRating: 0,
    // Owner stats
    totalListings: 0,
    pendingRequests: 0,
    totalEarnings: 0,
    ownerRating: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        setLoading(true);

        if (variant === "renter") {
          const [activeResult, favoritesResult, paymentsResult, reviewsResult] =
            await Promise.all([
              supabase
                .from("booking_requests")
                .select("*", { count: "exact", head: true })
                .eq("renter_id", user.id)
                .eq("status", "active"),
              supabase
                .from("user_favorites")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id),
              supabase
                .from("payments")
                .select("total_amount")
                .eq("renter_id", user.id)
                .eq("payment_status", "succeeded"),
              supabase
                .from("reviews")
                .select("rating")
                .eq("reviewee_id", user.id),
            ]);

          // Check for errors and log them
          if (activeResult.error) {
            console.error("Error fetching active rentals:", activeResult.error);
          }
          if (favoritesResult.error) {
            console.error("Error fetching favorites:", favoritesResult.error);
          }
          if (paymentsResult.error) {
            console.error("Error fetching payments:", paymentsResult.error);
          }
          if (reviewsResult.error) {
            console.error("Error fetching reviews:", reviewsResult.error);
          }

          const totalSpent =
            !paymentsResult.error && paymentsResult.data
              ? paymentsResult.data.reduce(
                  (sum, p) => sum + Number(p.total_amount ?? 0),
                  0
                )
              : 0;

          const ratings =
            !reviewsResult.error && reviewsResult.data
              ? reviewsResult.data.map((r) => r.rating)
              : [];
          const avgRating =
            ratings.length > 0
              ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
              : 0;

          setStats((prev) => ({
            ...prev,
            activeRentals: !activeResult.error ? activeResult.count || 0 : 0,
            savedItems: !favoritesResult.error ? favoritesResult.count || 0 : 0,
            totalSpent,
            renterRating: avgRating,
          }));
        } else {
          // Owner stats
          const [listingsResult, pendingResult, earningsResult, reviewsResult] =
            await Promise.all([
              supabase
                .from("equipment")
                .select("*", { count: "exact", head: true })
                .eq("owner_id", user.id),
              supabase
                .from("booking_requests")
                .select("*, equipment!inner(owner_id)", {
                  count: "exact",
                  head: true,
                })
                .eq("equipment.owner_id", user.id)
                .eq("status", "pending"),
              supabase
                .from("owner_profiles")
                .select("earnings_total")
                .eq("profile_id", user.id)
                .single(),
              supabase
                .from("reviews")
                .select("rating")
                .eq("reviewee_id", user.id),
            ]);

          // Check for errors and log them
          if (listingsResult.error) {
            console.error("Error fetching listings:", listingsResult.error);
          }
          if (pendingResult.error) {
            console.error(
              "Error fetching pending requests:",
              pendingResult.error
            );
          }
          if (
            earningsResult.error &&
            earningsResult.error.code !== "PGRST116"
          ) {
            // PGRST116 is "no rows returned" which is expected for new owners
            console.error("Error fetching earnings:", earningsResult.error);
          }
          if (reviewsResult.error) {
            console.error("Error fetching reviews:", reviewsResult.error);
          }

          const ratings =
            !reviewsResult.error && reviewsResult.data
              ? reviewsResult.data.map((r) => r.rating)
              : [];
          const avgRating =
            ratings.length > 0
              ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
              : 0;

          setStats((prev) => ({
            ...prev,
            totalListings: !listingsResult.error
              ? listingsResult.count || 0
              : 0,
            pendingRequests: !pendingResult.error
              ? pendingResult.count || 0
              : 0,
            totalEarnings: !earningsResult.error
              ? earningsResult.data?.earnings_total || 0
              : 0,
            ownerRating: avgRating,
          }));
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, [user, variant]);

  const renterStats: StatItem[] = [
    {
      key: "active",
      label: "Active",
      value: stats.activeRentals,
      icon: Calendar,
      href: "/renter/bookings",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "saved",
      label: "Saved",
      value: stats.savedItems,
      icon: Heart,
      href: "/renter/saved",
      color: "text-rose-600 dark:text-rose-400",
    },
    {
      key: "spent",
      label: "Spent",
      value: `$${stats.totalSpent.toLocaleString()}`,
      icon: DollarSign,
      href: "/renter/payments",
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "rating",
      label: "Rating",
      value: stats.renterRating > 0 ? stats.renterRating.toFixed(1) : "—",
      icon: Star,
      href: "/settings?tab=reviews",
      color: "text-amber-600 dark:text-amber-400",
    },
  ];

  const ownerStats: StatItem[] = [
    {
      key: "listings",
      label: "Listings",
      value: stats.totalListings,
      icon: Package,
      href: "/owner/equipment",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "pending",
      label: "Pending",
      value: stats.pendingRequests,
      icon: Clock,
      href: "/owner/bookings?status=pending",
      color: "text-violet-600 dark:text-violet-400",
    },
    {
      key: "earnings",
      label: "Earnings",
      value: `$${stats.totalEarnings.toLocaleString()}`,
      icon: DollarSign,
      href: "/owner/earnings",
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "rating",
      label: "Rating",
      value: stats.ownerRating > 0 ? stats.ownerRating.toFixed(1) : "—",
      icon: Star,
      href: "/settings?tab=reviews",
      color: "text-amber-600 dark:text-amber-400",
    },
  ];

  const statItems = variant === "renter" ? renterStats : ownerStats;

  // Get tooltip for stat based on variant and key
  const getTooltip = (statKey: string) => {
    if (variant === "owner") {
      const tooltipMap: Record<string, string> = {
        listings: "total_listings",
        pending: "pending_requests",
        earnings: "total_earnings",
        rating: "average_rating",
      };
      const key = tooltipMap[statKey];
      if (key) {
        return t(`owner.stats.${key}.tooltip`, "");
      }
    }
    return "";
  };

  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-2", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50"
          >
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-2", className)}>
      {statItems.map((stat) => {
        const Icon = stat.icon;
        const tooltip = getTooltip(stat.key);

        const statCard = (
          <button
            type="button"
            key={stat.key}
            onClick={() => {
              if (stat.href) {
                void navigate(stat.href);
              }
            }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl text-left",
              "bg-card border border-border/50",
              "transition-all duration-200",
              "hover:border-border hover:shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              "active:scale-[0.98]"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-lg bg-muted/50",
                stat.color
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-foreground truncate">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </button>
        );

        if (tooltip) {
          return (
            <Tooltip key={stat.key}>
              <TooltipTrigger asChild>{statCard}</TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        }

        return statCard;
      })}
    </div>
  );
}
