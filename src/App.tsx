import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Analytics } from "@vercel/analytics/react";
import { RoleModeProvider } from "@/contexts/RoleModeContext";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { OnboardingGuard } from "@/components/auth/OnboardingGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PageTransitionLoader } from "@/components/ui/PageSkeleton";

// Lazy-loaded page components
const EmailVerification = lazy(() => import("@/pages/auth/EmailVerification"));
const RenterDashboard = lazy(() => import("@/pages/renter/RenterDashboard"));
const OwnerDashboard = lazy(() => import("@/pages/owner/OwnerDashboard"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const ExplorePage = lazy(() => import("@/pages/ExplorePage"));
const EquipmentDetailPage = lazy(
  () => import("@/pages/equipment/EquipmentDetailPage")
);
const MessagingPage = lazy(() => import("@/pages/MessagingPage"));
const PaymentConfirmation = lazy(
  () => import("@/pages/payment/PaymentConfirmation")
);
const PaymentsPage = lazy(() => import("@/pages/renter/PaymentsPage"));
const VerifyIdentity = lazy(
  () => import("@/pages/verification/VerifyIdentity")
);
const ProfileSettings = lazy(() => import("@/pages/ProfileSettings"));
const SupportPage = lazy(() => import("@/pages/SupportPage"));
const EquipmentInspectionPage = lazy(
  () => import("@/pages/inspection/EquipmentInspectionPage")
);
const InspectionView = lazy(
  () => import("@/components/inspection/InspectionView")
);
const FileClaimPage = lazy(() => import("@/pages/claims/FileClaimPage"));
const ReviewClaimPage = lazy(() => import("@/pages/claims/ReviewClaimPage"));
const ManageClaimPage = lazy(() => import("@/pages/claims/ManageClaimPage"));
const ActiveRentalPage = lazy(() => import("@/pages/rental/ActiveRentalPage"));
const OwnerUpgrade = lazy(() => import("@/pages/owner/OwnerUpgrade"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const OnboardingPage = lazy(() => import("@/pages/auth/OnboardingPage"));
const NotificationsSettings = lazy(
  () => import("@/pages/settings/NotificationsSettings")
);
const OwnerEquipmentPage = lazy(
  () => import("@/pages/owner/OwnerEquipmentPage")
);
const OwnerBookingsPage = lazy(() => import("@/pages/owner/OwnerBookingsPage"));
const OwnerReviewsPage = lazy(() => import("@/pages/owner/OwnerReviewsPage"));
const OwnerPaymentsPage = lazy(() => import("@/pages/owner/OwnerPaymentsPage"));
const RenterSavedPage = lazy(() => import("@/pages/renter/RenterSavedPage"));
const RenterBookingsPage = lazy(
  () => import("@/pages/renter/RenterBookingsPage")
);

/**
 * PageLoader - Minimal loading indicator for lazy-loaded pages
 * Uses subtle dots instead of large spinner to avoid "reload" perception
 */
const PageLoader = () => <PageTransitionLoader />;

const AdminRoute = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading, error, refetch } = useAdminAccess();

  // Wait for auth to load first
  if (authLoading) return <PageLoader />;

  // Redirect to home if not logged in
  if (!user) return <Navigate to="/" replace />;

  if (loading) return <PageLoader />;

  if (error) {
    console.error(error);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">
          An error occurred while verifying access. Please try again.
        </p>
        <Button onClick={() => void refetch()}>Retry</Button>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return <AdminDashboard />;
};

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <>
      <Router>
        <RoleModeProvider>
          <NuqsAdapter>
            <ErrorBoundary>
              <div className="min-h-screen bg-background">
                <Suspense fallback={<PageLoader />}>
                  <OnboardingGuard>
                    <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route
                      path="/register/renter"
                      element={
                        <Navigate to="/?signup=true&role=renter" replace />
                      }
                    />
                    <Route
                      path="/register/owner"
                      element={
                        <Navigate to="/?signup=true&role=owner" replace />
                      }
                    />
                    <Route
                      path="/login"
                      element={<Navigate to="/?login=true" replace />}
                    />
                    <Route path="/verify" element={<EmailVerification />} />
                    <Route path="/onboarding" element={<OnboardingPage />} />
                    <Route
                      path="/equipment"
                      element={<Navigate to="/explore" replace />}
                    />
                    <Route
                      path="/equipment/:id"
                      element={<EquipmentDetailPage />}
                    />

                    {/* Protected routes */}
                    {user && (
                      <>
                        <Route path="/renter" element={<RenterDashboard />} />
                        <Route
                          path="/renter/dashboard"
                          element={<RenterDashboard />}
                        />
                        <Route
                          path="/renter/payments"
                          element={<PaymentsPage />}
                        />
                        <Route
                          path="/renter/saved"
                          element={<RenterSavedPage />}
                        />
                        <Route
                          path="/renter/bookings"
                          element={<RenterBookingsPage />}
                        />
                        <Route
                          path="/rental/:bookingId"
                          element={<ActiveRentalPage />}
                        />
                        <Route path="/owner" element={<OwnerDashboard />} />
                        <Route
                          path="/owner/dashboard"
                          element={<OwnerDashboard />}
                        />
                        <Route
                          path="/owner/become-owner"
                          element={<OwnerUpgrade />}
                        />
                        <Route
                          path="/owner/equipment"
                          element={<OwnerEquipmentPage />}
                        />
                        <Route
                          path="/owner/bookings"
                          element={<OwnerBookingsPage />}
                        />
                        <Route
                          path="/owner/reviews"
                          element={<OwnerReviewsPage />}
                        />
                        <Route
                          path="/owner/payments"
                          element={<OwnerPaymentsPage />}
                        />
                        <Route path="/messages" element={<MessagingPage />} />
                        <Route path="/support" element={<SupportPage />} />
                        <Route
                          path="/payment/confirmation"
                          element={<PaymentConfirmation />}
                        />
                        <Route
                          path="/verification"
                          element={<VerifyIdentity />}
                        />
                        <Route path="/settings" element={<ProfileSettings />} />
                        <Route
                          path="/settings/notifications"
                          element={<NotificationsSettings />}
                        />
                        <Route
                          path="/inspection/:bookingId/:type"
                          element={<EquipmentInspectionPage />}
                        />
                        <Route
                          path="/inspection/:bookingId/view/:inspectionType"
                          element={<InspectionView />}
                        />
                        <Route
                          path="/claims/file/:bookingId"
                          element={<FileClaimPage />}
                        />
                        <Route
                          path="/claims/review/:claimId"
                          element={<ReviewClaimPage />}
                        />
                        <Route
                          path="/claims/manage/:claimId"
                          element={<ManageClaimPage />}
                        />
                      </>
                    )}

                    {/* Admin route - always registered, AdminRoute handles auth */}
                    <Route path="/admin" element={<AdminRoute />} />
                  </Routes>
                </OnboardingGuard>
                </Suspense>
                <MobileBottomNav />
                <Toaster />
              </div>
            </ErrorBoundary>
            </NuqsAdapter>
        </RoleModeProvider>
      </Router>
      <Analytics />
    </>
  );
}

export default App;
