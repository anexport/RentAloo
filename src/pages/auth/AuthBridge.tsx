/**
 * AuthBridge - OAuth Callback Bridge for Mobile Apps
 * 
 * This page acts as a "bridge" between Supabase OAuth and the mobile app.
 * 
 * Flow:
 * 1. Mobile app initiates OAuth with redirectTo: "https://your-domain.com/auth/bridge"
 * 2. Supabase completes OAuth and redirects here with tokens in URL hash
 * 3. This page extracts tokens and redirects to deep link: rentaloo://auth/callback#...
 * 4. Mobile app receives deep link and calls supabase.auth.setSession()
 * 
 * This approach works because:
 * - Supabase only sees an HTTPS URL (which is in the allowlist)
 * - The mobile app receives tokens via deep link (no dashboard changes needed)
 */

import { useEffect, useState } from "react";

export default function AuthBridge() {
  const [status, setStatus] = useState<'processing' | 'redirecting' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Get the hash fragment (Supabase puts tokens here)
    const hash = window.location.hash?.startsWith("#")
      ? window.location.hash.slice(1)
      : "";

    // Parse the hash as URL params
    const params = new URLSearchParams(hash);

    // Check for errors first
    const error = params.get("error_description") || params.get("error");
    if (error) {
      console.error("[AuthBridge] OAuth error:", error);
      setStatus('error');
      setErrorMessage(error);
      
      // Still redirect to app with error info
      setTimeout(() => {
        window.location.href = `rentaloo://auth/callback#error=${encodeURIComponent(error)}`;
      }, 1000);
      return;
    }

    // Extract tokens
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const expires_in = params.get("expires_in");
    const token_type = params.get("token_type");

    if (access_token && refresh_token) {
      console.log("[AuthBridge] Tokens received, redirecting to app...");
      setStatus('redirecting');

      // Build deep link URL with all token info
      const deepLinkParams = new URLSearchParams();
      deepLinkParams.set("access_token", access_token);
      deepLinkParams.set("refresh_token", refresh_token);
      if (expires_in) deepLinkParams.set("expires_in", expires_in);
      if (token_type) deepLinkParams.set("token_type", token_type);

      // Redirect to app via deep link
      const deepLinkUrl = `rentaloo://auth/callback#${deepLinkParams.toString()}`;
      
      // Small delay to show status before redirect
      setTimeout(() => {
        window.location.href = deepLinkUrl;
      }, 500);
    } else {
      // No tokens found
      console.error("[AuthBridge] No tokens in URL hash");
      setStatus('error');
      setErrorMessage("No authentication tokens received");

      // Redirect to app with error
      setTimeout(() => {
        window.location.href = `rentaloo://auth/callback#error=missing_tokens`;
      }, 1000);
    }
  }, []);

  // Minimal UI - this page should redirect almost instantly
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Processing authentication...</p>
          </>
        )}
        
        {status === 'redirecting' && (
          <>
            <div className="h-12 w-12 mx-auto flex items-center justify-center">
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-muted-foreground">Redirecting to Rentaloo app...</p>
            <p className="text-xs text-muted-foreground">If the app doesn't open, make sure it's installed.</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="h-12 w-12 mx-auto flex items-center justify-center">
              <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-destructive font-medium">Authentication Error</p>
            {errorMessage && (
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            )}
            <p className="text-xs text-muted-foreground">Redirecting to app...</p>
          </>
        )}
      </div>
    </div>
  );
}
