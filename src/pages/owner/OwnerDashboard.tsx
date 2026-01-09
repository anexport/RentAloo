import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  BarChart3,
  Calendar,
  Package,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useState, useEffect, useCallback, useMemo, useId } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useRoleMode } from "@/contexts/RoleModeContext";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import DashboardLayout from "@/components/layout/DashboardLayout";
import WelcomeHero from "@/components/owner/WelcomeHero";
import OwnerNotificationsPanel from "@/components/owner/NotificationsPanel";
import OwnerClaimsList from "@/components/claims/OwnerClaimsList";
import { useVerification } from "@/hooks/useVerification";
import { getVerificationProgress } from "@/lib/verification";
import { formatDateForStorage } from "@/lib/utils";
import { useActiveRentals } from "@/hooks/useActiveRental";
import ActiveRentalCard from "@/components/rental/ActiveRentalCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ContentCard } from "@/components/ui/ContentCard";
import { BookingCardSkeleton } from "@/components/ui/PageSkeleton";
import { PageTransitionLoader } from "@/components/ui/PageSkeleton";
import VerificationBanner from "@/components/verification/VerificationBanner";

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");
  const { isAlsoOwner, isLoading: isCheckingOwner } = useRoleMode();
  const { profile, loading: verificationLoading } = useVerification();
  const analyticsDisabledId = useId();
  const [stats, setStats] = useState({
    totalListings: 0,
    activeBookings: 0,
    totalEarnings: 0,
    averageRating: 0,
  });

  const {
    bookingRequests,
    loading: bookingsLoading,
    fetchBookingRequests,
  } = useBookingRequests("owner");
  const {
    rentals: activeRentals,
    isLoading: activeRentalsLoading,
    error: activeRentalsError,
  } = useActiveRentals("owner");

  const progress = profile ? getVerificationProgress(profile) : 0;

  const bookingSummary = useMemo(() => {
    const today = formatDateForStorage(new Date());
    const upcomingBookings = bookingRequests
      .filter((r) => r.status === "approved" && r.start_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

    return {
      pendingCount: bookingRequests.filter((r) => r.status === "pending")
        .length,
      upcomingCount: upcomingBookings.length,
      nextStartDate: upcomingBookings[0]?.start_date ?? null,
    };
  }, [bookingRequests]);

  // Redirect non-owners to become-owner page
  useEffect(() => {
    if (!isCheckingOwner && !isAlsoOwner) {
      navigate("/owner/become-owner", { replace: true });
    }
  }, [isAlsoOwner, isCheckingOwner, navigate]);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch equipment count
      const { count: equipmentCount } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id);

      // Fetch booking requests to ensure they're loaded before the effect runs
      await fetchBookingRequests();

      // Fetch total earnings (this would need to be calculated from completed bookings)
      const { data: earningsData } = await supabase
        .from("owner_profiles")
        .select("earnings_total")
        .eq("profile_id", user.id)
        .single();

      setStats((prev) => ({
        ...prev,
        totalListings: equipmentCount || 0,
        totalEarnings: earningsData?.earnings_total || 0,
        averageRating: 0, // This would need to be calculated from reviews
      }));
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [user, fetchBookingRequests]);

  useEffect(() => {
    if (user) {
      void fetchStats();
    }
  }, [user, fetchStats]);

  useEffect(() => {
    // Count active bookings (approved and in progress)
    const activeCount = bookingRequests.filter(
      (r) => r.status === "approved" || r.status === "active"
    ).length;

    setStats((prev) => ({
      ...prev,
      activeBookings: activeCount,
    }));
  }, [bookingRequests]);

  // Memoized stats configuration to prevent recreation on every render
  const statsConfig = useMemo(() => [
    { label: t("owner.stats.total_listings.label"), value: stats.totalListings, prefix: "", color: "text-blue-600 dark:text-blue-400" },
    { label: t("owner.stats.pending_requests.label"), value: stats.activeBookings, prefix: "", color: "text-violet-600 dark:text-violet-400" },
    { label: t("owner.stats.total_earnings.label"), value: stats.totalEarnings, prefix: "$", color: "text-emerald-600 dark:text-emerald-400" },
    { label: t("owner.stats.average_rating.label"), value: stats.averageRating, prefix: "", color: "text-amber-600 dark:text-amber-400", isRating: true },
  ], [stats, t]);

  // Memoized handlers to prevent recreation on every render
  const handleCreateEquipment = useCallback(() => {
    navigate("/owner/equipment?action=create");
  }, [navigate]);

  const handleViewEquipment = useCallback(() => {
    navigate("/owner/equipment");
  }, [navigate]);

  // Show loading state while checking owner status
  if (isCheckingOwner || !isAlsoOwner) {
    return (
      <DashboardLayout>
        <PageTransitionLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-page-enter">
        {/* Welcome Hero */}
        <WelcomeHero
          subtitle={t("owner.header.description")}
          isVerified={!!profile?.identityVerified}
          bookingsLoading={bookingsLoading}
          pendingCount={bookingSummary.pendingCount}
          upcomingCount={bookingSummary.upcomingCount}
          nextStartDate={bookingSummary.nextStartDate}
        />

        {/* Verification Alert */}
        {!verificationLoading && profile && !profile.identityVerified && (
          <VerificationBanner
            progress={progress}
            translationKey="owner.verification.verify_button"
          />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statsConfig.map((stat, index) => (
            <ContentCard
              key={stat.label}
              className="animate-content-reveal"
              style={{ "--stagger-index": index } as React.CSSProperties}
            >
              <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
              <p className={`text-2xl sm:text-3xl font-semibold ${stat.color}`}>
                {stat.isRating ? (
                  stat.value > 0 ? (
                    <AnimatedNumber value={stat.value} duration={800} decimals={1} />
                  ) : "—"
                ) : (
                  <>
                    {stat.prefix}
                    <AnimatedNumber value={stat.value} duration={800} formatCurrency={stat.prefix === "$"} />
                  </>
                )}
              </p>
            </ContentCard>
          ))}
        </div>

        {/* Notifications & Claims */}
        <div className="space-y-4">
          <OwnerNotificationsPanel />
          <OwnerClaimsList />
        </div>

        {/* Active Rentals Section */}
        {activeRentalsLoading && (
          <section className="space-y-4" aria-busy="true">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-500" />
              {t("owner.active_rentals.title")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <BookingCardSkeleton key={`skeleton-${index}`} />
              ))}
            </div>
          </section>
        )}

        {!activeRentalsLoading && activeRentalsError && activeRentals.length === 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{activeRentalsError}</AlertDescription>
          </Alert>
        )}

        {!activeRentalsLoading && activeRentals.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-500" />
              {t("owner.active_rentals.title")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeRentals.map((rental, index) => (
                <div
                  key={rental.id}
                  className="animate-content-reveal"
                  style={{ "--stagger-index": index } as React.CSSProperties}
                >
                  <ActiveRentalCard booking={rental} viewerRole="owner" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleCreateEquipment} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("owner.overview.quick_actions.add_equipment.button")}
          </Button>
          <Button variant="outline" onClick={handleViewEquipment} className="gap-2">
            <Calendar className="h-4 w-4" />
            {t("owner.overview.quick_actions.manage_listings.button")}
          </Button>
          <Button
            variant="ghost"
            disabled
            className="gap-2 text-muted-foreground"
            aria-describedby={analyticsDisabledId}
          >
            <BarChart3 className="h-4 w-4" />
            {t("owner.overview.quick_actions.analytics.button")}
          </Button>
          <span id={analyticsDisabledId} className="sr-only">
            Analytics feature coming soon
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OwnerDashboard;
