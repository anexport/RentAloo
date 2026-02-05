import { lazy, Suspense, useEffect } from "react";
import markerSDK from "@marker.io/browser";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Analytics } from "@vercel/analytics/react";
import { RoleModeProvider } from "@/contexts/RoleModeContext";
import { RentalProvider } from "@/contexts/RentalContext";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { OnboardingGuard } from "@/components/auth/OnboardingGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PageTransitionLoader } from "@/components/ui/PageSkeleton";
import { isNative } from "@/lib/platform";

// Lazy-loaded page components
const EmailVerification = lazy(() => import("@/pages/auth/EmailVerification"));
const RenterDashboard = lazy(() => import("@/pages/renter/RenterDashboard"));
const OwnerDashboard = lazy(() => import("@/pages/owner/OwnerDashboard"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const ExplorePage = lazy(() => import("@/pages/ExplorePage"));
const EquipmentDetailPage = lazy(
  () => import("@/pages/equipment/EquipmentDetailPage")
);
const HelpPage = lazy(() => import("@/pages/HelpPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
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
const RentalPage = lazy(() => import("@/pages/rental/RentalPage"));
const RenterRentalPage = lazy(() => import("@/pages/renter/RenterRentalPage"));
const OwnerRentalPage = lazy(() => import("@/pages/owner/OwnerRentalPage"));
const OwnerUpgrade = lazy(() => import("@/pages/owner/OwnerUpgrade"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const OnboardingPage = lazy(() => import("@/pages/auth/OnboardingPage"));
const AuthBridge = lazy(() => import("@/pages/auth/AuthBridge"));
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
const RenterInspectionsPage = lazy(
  () => import("@/pages/renter/RenterInspectionsPage")
);
const OwnerInspectionsPage = lazy(
  () => import("@/pages/owner/OwnerInspectionsPage")
);
const LeaveReviewPage = lazy(() => import("@/pages/reviews/LeaveReviewPage"));

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

  // SMOKE TEST: Verify web app is loaded in mobile
  useEffect(() => {
    console.log("WRAP_WEB_APP_BOOT_OK_123");
  }, []);

  // Initialize Marker.io feedback widget (web only)
  useEffect(() => {
    if (isNative) return; // Skip in native mobile app

    void markerSDK
      .loadWidget({
        project: "69643cd3175800e4c150231c",
      })
      .catch((error) => {
        console.error("Failed to load Marker.io widget:", error);
      });
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <>
      <Router>
        <TooltipProvider delayDuration={300}>
          <RoleModeProvider>
            <RentalProvider>
              <NuqsAdapter>
              <ErrorBoundary>
                <div className="min-h-screen bg-background">
                  <Suspense fallback={<PageLoader />}>
                    <OnboardingGuard>
                      <Routes>
                        {/* Public routes */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/explore" element={<ExplorePage />} />
                        <Route path="/help" element={<HelpPage />} />
                        <Route path="/terms" element={<TermsPage />} />
                        <Route path="/privacy" element={<PrivacyPage />} />
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
                        <Route path="/auth/bridge" element={<AuthBridge />} />
                        <Route path="/auth/callback-mobile" element={<AuthBridge />} />
                        <Route
                          path="/onboarding"
                          element={<OnboardingPage />}
                        />
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
                            <Route
                              path="/renter"
                              element={<RenterDashboard />}
                            />
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
                              path="/renter/inspections"
                              element={<RenterInspectionsPage />}
                            />
                            <Route
                              path="/renter/rental/:bookingId"
                              element={<RenterRentalPage />}
                            />
                            <Route
                              path="/rental/:bookingId"
                              element={<RentalPage />}
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
                              path="/owner/inspections"
                              element={<OwnerInspectionsPage />}
                            />
                            <Route
                              path="/owner/rental/:bookingId"
                              element={<OwnerRentalPage />}
                            />
                            <Route
                              path="/owner/reviews"
                              element={<OwnerReviewsPage />}
                            />
                            <Route
                              path="/owner/payments"
                              element={<OwnerPaymentsPage />}
                            />
                            <Route
                              path="/reviews/:bookingId"
                              element={<LeaveReviewPage />}
                            />
                            <Route
                              path="/messages"
                              element={<MessagingPage />}
                            />
                            <Route path="/support" element={<SupportPage />} />
                            <Route
                              path="/payment/confirmation"
                              element={<PaymentConfirmation />}
                            />
                            <Route
                              path="/verification"
                              element={<VerifyIdentity />}
                            />
                            <Route
                              path="/settings"
                              element={<ProfileSettings />}
                            />
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
                              path="/renter/inspections/:bookingId/:type"
                              element={<EquipmentInspectionPage />}
                            />
                            <Route
                              path="/owner/inspections/:bookingId/:type"
                              element={<EquipmentInspectionPage />}
                            />
                            <Route
                              path="/renter/inspections/:bookingId/view/:inspectionType"
                              element={<InspectionView />}
                            />
                            <Route
                              path="/owner/inspections/:bookingId/view/:inspectionType"
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

                        {/* Fallback */}
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </OnboardingGuard>
                  </Suspense>
                  <MobileBottomNav />
                  <Toaster />
                </div>
              </ErrorBoundary>
            </NuqsAdapter>
            </RentalProvider>
          </RoleModeProvider>
        </TooltipProvider>
      </Router>
      {/* Vercel Analytics - web only */}
      {!isNative && <Analytics />}
    </>
  );
}

export default App;
