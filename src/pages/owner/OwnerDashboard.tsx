import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  BarChart3,
  Calendar,
  Package,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");
  const { isAlsoOwner, isLoading: isCheckingOwner } = useRoleMode();
  const { profile, loading: verificationLoading } = useVerification();
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

  // Show loading state while checking owner status
  if (isCheckingOwner || !isAlsoOwner) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Welcome Hero Section */}
        <WelcomeHero
          subtitle={t("owner.header.description")}
          isVerified={!!profile?.identityVerified}
          bookingsLoading={bookingsLoading}
          pendingCount={bookingSummary.pendingCount}
          upcomingCount={bookingSummary.upcomingCount}
          nextStartDate={bookingSummary.nextStartDate}
        />

        {/* High-Emphasis Banner for unverified identity */}
        {!verificationLoading && profile && !profile.identityVerified && (
          <Card className="border-destructive/40 bg-destructive/5 ring-1 ring-destructive/20 animate-in slide-in-from-top-4 duration-500">
            <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-base font-semibold text-destructive">
                    {t("owner.verification.incomplete_title")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("owner.verification.incomplete_message", { progress })}
                  </p>
                </div>
              </div>
              <Link to="/verification">
                <Button
                  variant="default"
                  size="lg"
                  className="font-semibold shadow-lg ring-2 ring-primary/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
                  aria-label={t("owner.verification.verify_button")}
                  data-testid="verify-now-banner-owner"
                >
                  {t("owner.verification.verify_button")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Notifications / Tasks */}
        <OwnerNotificationsPanel />

        {/* Claims Requiring Action */}
        <div className="animate-in slide-in-from-top-4 duration-500 delay-100">
          <OwnerClaimsList />
        </div>

        {/* Active Rentals Section - Show error only when no data to fall back on */}
        {activeRentalsLoading && (
          <div
            className="space-y-4 animate-in slide-in-from-top-4 duration-500 delay-150"
            aria-busy="true"
            aria-label={t("owner.active_rentals.title")}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Package className="h-6 w-6 text-emerald-500" />
                  {t("owner.active_rentals.title")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("owner.active_rentals.description")}
                </p>
              </div>
              <div
                className="flex items-center gap-2 text-sm text-muted-foreground"
                role="status"
                aria-label="Loading active rentals"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span className="sr-only">Loading active rentals</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`active-rental-skeleton-${index}`}
                  className="animate-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${150 + index * 50}ms` }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                    <div className="relative h-36 bg-muted flex-shrink-0">
                      <Skeleton
                        shimmer
                        className="h-full w-full rounded-none"
                      />
                      <Skeleton
                        shimmer
                        className="absolute top-3 left-3 h-5 w-24 rounded-full"
                      />
                    </div>
                    <CardContent className="p-4 flex flex-col flex-1">
                      <div className="h-14 mb-4">
                        <Skeleton shimmer className="h-6 w-3/4" />
                        <div className="flex items-center gap-2 mt-2">
                          <Skeleton shimmer className="h-5 w-5 rounded-full" />
                          <Skeleton shimmer className="h-4 w-2/3" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Skeleton shimmer className="h-4 w-1/2" />
                        <Skeleton shimmer className="h-4 w-2/3" />
                      </div>
                      <Skeleton shimmer className="mt-auto h-10 w-full" />
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {!activeRentalsLoading &&
          activeRentalsError &&
          activeRentals.length === 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{activeRentalsError}</AlertDescription>
            </Alert>
          )}

        {!activeRentalsLoading && activeRentals.length > 0 && (
          <div className="space-y-4 animate-in slide-in-from-top-4 duration-500 delay-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Package className="h-6 w-6 text-emerald-500" />
                  {t("owner.active_rentals.title")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("owner.active_rentals.description")}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeRentals.map((rental, index) => (
                <div
                  key={rental.id}
                  className="animate-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${150 + index * 50}ms` }}
                >
                  <ActiveRentalCard booking={rental} viewerRole="owner" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("owner.stats.total_listings.label")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={stats.totalListings} duration={800} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("owner.stats.total_listings.description")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("owner.stats.pending_requests.label")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={stats.activeBookings} duration={800} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("owner.stats.pending_requests.description")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("owner.stats.total_earnings.label")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber
                  value={stats.totalEarnings}
                  duration={800}
                  prefix="$"
                  formatCurrency
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("owner.stats.total_earnings.description")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("owner.stats.average_rating.label")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageRating > 0 ? (
                  <AnimatedNumber
                    value={stats.averageRating}
                    duration={800}
                    decimals={1}
                  />
                ) : (
                  "-"
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("owner.stats.average_rating.description")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            {t("owner.overview.quick_actions.title", {
              defaultValue: "Quick Actions",
            })}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5 text-primary" />
                  <span>
                    {t("owner.overview.quick_actions.add_equipment.title")}
                  </span>
                </CardTitle>
                <CardDescription>
                  {t("owner.overview.quick_actions.add_equipment.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => navigate("/owner/equipment?action=create")}
                >
                  {t("owner.overview.quick_actions.add_equipment.button")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span>
                    {t("owner.overview.quick_actions.manage_listings.title")}
                  </span>
                </CardTitle>
                <CardDescription>
                  {t(
                    "owner.overview.quick_actions.manage_listings.description"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/owner/equipment")}
                >
                  {t("owner.overview.quick_actions.manage_listings.button")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span>
                    {t("owner.overview.quick_actions.analytics.title")}
                  </span>
                </CardTitle>
                <CardDescription>
                  {t("owner.overview.quick_actions.analytics.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" disabled>
                  {t("owner.overview.quick_actions.analytics.button")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t("owner.overview.recent_activity.title")}</CardTitle>
            <CardDescription>
              {t("owner.overview.recent_activity.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Plus className="h-12 w-12 mx-auto mb-4 text-muted" />
              <p>{t("owner.overview.recent_activity.empty_state.title")}</p>
              <p className="text-sm">
                {t("owner.overview.recent_activity.empty_state.description")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OwnerDashboard;
