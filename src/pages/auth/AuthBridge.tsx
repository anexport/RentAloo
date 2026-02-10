/**
 * AuthBridge - OAuth Callback Bridge for Mobile Apps
 * 
 * This page acts as a "bridge" between Supabase OAuth and the mobile app.
 * 
 * Flow:
 * 1. Mobile app initiates OAuth with redirectTo: "https://www.vaymo.it/auth/bridge"
 * 2. Supabase completes OAuth and redirects here:
 *    A) With tokens in URL hash: #access_token=...&refresh_token=...  (implicit flow)
 *    B) With PKCE code in query: ?code=...  (PKCE flow, default in Supabase)
 * 3. This page extracts tokens (or exchanges PKCE code for tokens) and redirects
 *    to deep link: rentaloo://auth/callback#access_token=...&refresh_token=...
 * 4. Mobile app receives deep link and calls supabase.auth.setSession()
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthBridge() {
  const [status, setStatus] = useState<'processing' | 'redirecting' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    console.log("BRIDGE_START", {
      fullUrl: window.location.href,
      hash: window.location.hash,
      search: window.location.search,
    });

    const handleBridge = async () => {
      // --- CASE A: tokens in hash (#access_token=...&refresh_token=...) ---
      const hash = window.location.hash?.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      const hashParams = new URLSearchParams(hash);

      // Check for error in hash
      const hashError = hashParams.get("error_description") || hashParams.get("error");
      if (hashError) {
        console.error("BRIDGE_HASH_ERROR", hashError);
        setStatus('error');
        setErrorMessage(hashError);
        setTimeout(() => {
          window.location.href = `rentaloo://auth/callback?error=${encodeURIComponent(hashError)}`;
        }, 500);
        return;
      }

      const hashAccessToken = hashParams.get("access_token");
      const hashRefreshToken = hashParams.get("refresh_token");

      if (hashAccessToken && hashRefreshToken) {
        console.log("BRIDGE_HAS_HASH_TOKENS", {
          access_token_len: hashAccessToken.length,
          refresh_token_len: hashRefreshToken.length,
        });

        redirectToAppWithTokens(hashAccessToken, hashRefreshToken, {
          expires_in: hashParams.get("expires_in"),
          token_type: hashParams.get("token_type"),
        });
        return;
      }

      // --- CASE B: PKCE code in query string (?code=...) ---
      const queryParams = new URLSearchParams(window.location.search);

      // Check for error in query
      const queryError = queryParams.get("error_description") || queryParams.get("error");
      if (queryError) {
        console.error("BRIDGE_QUERY_ERROR", queryError);
        setStatus('error');
        setErrorMessage(queryError);
        setTimeout(() => {
          window.location.href = `rentaloo://auth/callback?error=${encodeURIComponent(queryError)}`;
        }, 500);
        return;
      }

      const code = queryParams.get("code");

      if (code) {
        console.log("BRIDGE_HAS_CODE", { code_length: code.length });

        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            // The code may have already been consumed by Supabase's detectSessionInUrl.
            // Fallback: check if a session was auto-set by the client.
            console.warn("BRIDGE_EXCHANGE_FAIL_TRYING_SESSION", {
              message: exchangeError.message,
              status: exchangeError.status,
            });

            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session?.access_token && sessionData.session?.refresh_token) {
              console.log("BRIDGE_EXCHANGE_FALLBACK_SESSION_OK", {
                user_id: sessionData.session.user?.id,
                access_token_len: sessionData.session.access_token.length,
              });
              redirectToAppWithTokens(sessionData.session.access_token, sessionData.session.refresh_token, {
                expires_in: String(sessionData.session.expires_in ?? ""),
                token_type: "bearer",
              });
              return;
            }

            console.error("BRIDGE_EXCHANGE_FAIL", {
              message: exchangeError.message,
              status: exchangeError.status,
            });
            setStatus('error');
            setErrorMessage(`Code exchange failed: ${exchangeError.message}`);
            setTimeout(() => {
              window.location.href = `rentaloo://auth/callback?error=exchange_failed&message=${encodeURIComponent(exchangeError.message)}`;
            }, 500);
            return;
          }

          const session = data?.session;
          if (session?.access_token && session?.refresh_token) {
            console.log("BRIDGE_EXCHANGE_OK", {
              user_id: session.user?.id,
              access_token_len: session.access_token.length,
              refresh_token_len: session.refresh_token.length,
            });

            redirectToAppWithTokens(session.access_token, session.refresh_token, {
              expires_in: String(session.expires_in ?? ""),
              token_type: "bearer",
            });
            return;
          }

          // Session returned but no tokens (shouldn't happen)
          console.error("BRIDGE_EXCHANGE_NO_SESSION", { data });
          setStatus('error');
          setErrorMessage("Code exchanged but no session returned");
          setTimeout(() => {
            window.location.href = `rentaloo://auth/callback?error=no_session_after_exchange`;
          }, 500);
        } catch (err) {
          console.error("BRIDGE_EXCHANGE_EXCEPTION", err);
          setStatus('error');
          setErrorMessage(`Exchange exception: ${String(err)}`);
          setTimeout(() => {
            window.location.href = `rentaloo://auth/callback?error=exchange_exception`;
          }, 500);
        }
        return;
      }

      // --- CASE C: Neither hash tokens nor PKCE code found ---
      console.error("BRIDGE_NO_TOKENS_NO_CODE", {
        hash: window.location.hash,
        search: window.location.search,
      });
      setStatus('error');
      setErrorMessage("No authentication tokens or code received");
      setTimeout(() => {
        window.location.href = `rentaloo://auth/callback?error=missing_tokens`;
      }, 1000);
    };

    /** Redirect to mobile deep link with tokens in hash fragment */
    const redirectToAppWithTokens = (
      accessToken: string,
      refreshToken: string,
      extra: { expires_in?: string | null; token_type?: string | null }
    ) => {
      setStatus('redirecting');

      const deepLinkParams = new URLSearchParams();
      deepLinkParams.set("access_token", accessToken);
      deepLinkParams.set("refresh_token", refreshToken);
      if (extra.expires_in) deepLinkParams.set("expires_in", extra.expires_in);
      if (extra.token_type) deepLinkParams.set("token_type", extra.token_type);

      const deepLinkUrl = `rentaloo://auth/callback#${deepLinkParams.toString()}`;
      console.log("BRIDGE_REDIRECTING", { deepLinkUrl: deepLinkUrl.slice(0, 80) + "..." });

      setTimeout(() => {
        window.location.href = deepLinkUrl;
      }, 300);
    };

    void handleBridge();
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
