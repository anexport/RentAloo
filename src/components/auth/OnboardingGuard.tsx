import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOnboardingCheck } from "@/hooks/useOnboardingCheck";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

/**
 * Guard component that redirects users to onboarding if their profile is incomplete.
 * - Redirects from homepage (/) when user needs onboarding (handles OAuth callback)
 * - Redirects from protected routes when user needs onboarding
 */
export const OnboardingGuard: React.FC<OnboardingGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { needsOnboarding, loading: onboardingLoading } = useOnboardingCheck();
  const hasRedirected = useRef(false);

  // Pages where we should NOT redirect (e.g., already on onboarding, verifying email)
  const noRedirectPaths = [
    "/onboarding",
    "/verify",
  ];

  // Pages that are public but we SHOULD redirect from if user needs onboarding
  // This includes homepage because OAuth returns users there
  const redirectFromPaths = [
    "/",
  ];

  const isOnNoRedirectPath = noRedirectPaths.some(
    (path) => location.pathname === path
  );

  const isOnRedirectFromPath = redirectFromPaths.some(
    (path) => location.pathname === path
  );

  // Check if this is a protected route (not public)
  const publicPaths = ["/", "/explore", "/equipment", "/login", "/register", "/onboarding", "/verify"];
  const isProtectedRoute = !publicPaths.some(
    (path) => location.pathname === path || location.pathname.startsWith("/equipment/")
  );

  useEffect(() => {
    // Wait for auth and onboarding check to complete
    if (authLoading || onboardingLoading) return;

    // Don't redirect if already on onboarding or verify page
    if (isOnNoRedirectPath) return;

    // Don't redirect if already redirected
    if (hasRedirected.current) return;

    // Redirect if:
    // 1. User is logged in AND needs onboarding
    // 2. AND (on homepage OR on protected route)
    if (user && needsOnboarding && (isOnRedirectFromPath || isProtectedRoute)) {
      hasRedirected.current = true;
      void navigate("/onboarding", { replace: true });
    }
  }, [
    authLoading,
    onboardingLoading,
    user,
    needsOnboarding,
    isOnNoRedirectPath,
    isOnRedirectFromPath,
    isProtectedRoute,
    navigate,
  ]);

  // Reset redirect flag if user signs out
  useEffect(() => {
    if (!user) {
      hasRedirected.current = false;
    }
  }, [user]);

  // Show loading while checking (only for logged-in users)
  if (user && !authLoading && onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default OnboardingGuard;

