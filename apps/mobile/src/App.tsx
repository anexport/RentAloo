/**
 * Mobile App - Wraps the web app with native platform capabilities
 *
 * Strategy: "WRAP WEB APP"
 * - Mounts the entire web App component WITH all providers
 * - Adds native platform detection
 * - Provides native bridges for storage, OAuth, etc.
 * - Web App already contains Router, so we don't add another one
 */

import { useEffect, useState, Component, ReactNode, lazy, Suspense } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
// import { useDeepLinks } from './plugins/deepLinks'; // TODO: Move inside Router context
import { isNativePlatform, platform, logger } from './lib/nativeBridge';
import { supabase } from '@web/lib/supabase';

// Lazy load web app to isolate crashes
const WebAppWithProviders = lazy(() => import('@web/main').then(m => ({ default: m.WebAppWithProviders })));

// Error Boundary for debugging
class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    console.error('MOBILE_ERROR_BOUNDARY', error.message, error.stack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: 20, paddingTop: 60, color: 'red', whiteSpace: 'pre-wrap', fontSize: 12 }}>
          <h2>App Crash</h2>
          <pre>{this.state.error.message}</pre>
          <pre>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Top-level proof of component load
console.log("MOBILE_APP_COMPONENT_LOADED");

export function App() {
  const [fatal, setFatal] = useState<{ msg: string; stack?: string } | null>(null);

  useEffect(() => {
    logger.log('App initialized', { isNativePlatform, platform });

    // Enhanced error logging with stack traces
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      const isDOMException = error?.name === 'DOMException' || error instanceof DOMException;

      console.error('MOBILE_WINDOW_ERROR', event.message, {
        name: error?.name,
        message: error?.message,
        stack: error?.stack || error,
        isDOMException,
      });

      if (isDOMException) {
        console.error('MOBILE_DOM_EXCEPTION', error.name, error.message, error.stack);
      }

      setFatal({ msg: String(event.message), stack: error?.stack });
      return true;
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      console.error('MOBILE_UNHANDLED_REJECTION', reason?.stack || reason);
      setFatal({ msg: 'Unhandled Promise Rejection', stack: reason?.stack || String(reason) });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Deep link listener for OAuth callback
    const handleAppUrlOpen = async (data: { url: string }) => {
      const url = data.url;
      console.log('APP_URL_OPEN_RAW ' + url);

      if (!url) return;

      // Handle both rentaloo://auth-callback and rentaloo://auth/callback
      const isAuthCallback = url.startsWith('rentaloo://auth-callback') || url.startsWith('rentaloo://auth/callback');
      if (!isAuthCallback) return;

      // Close the system browser IMMEDIATELY so user sees the app
      console.log('BROWSER_CLOSE_ATTEMPT');
      await Browser.close().catch((e) => { console.log('BROWSER_CLOSE_ERROR ' + String(e)); });
      console.log('BROWSER_CLOSE_DONE');

      try {
        // Parse URL - tokens can be in hash (#) or query (?)
        const urlObj = new URL(url);
        console.log('APP_URL_PARSED hash=' + (urlObj.hash || 'none') + ' search=' + (urlObj.search || 'none'));

        // Check hash first (used by AuthBridge)
        const hash = urlObj.hash?.startsWith('#') ? urlObj.hash.slice(1) : '';
        const hashParams = new URLSearchParams(hash);

        // Check for error in hash or query
        const error =
          hashParams.get('error_description') ||
          hashParams.get('error') ||
          urlObj.searchParams.get('error_description') ||
          urlObj.searchParams.get('error');

        if (error) {
          console.error('OAUTH_CALLBACK_ERROR ' + error);
          return;
        }

        // Try to get tokens from hash (AuthBridge flow)
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        if (access_token && refresh_token) {
          // Direct token flow (from AuthBridge)
          console.log('TOKENS_PARSED_OK access=' + access_token.length + ' refresh=' + refresh_token.length);

          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            console.error('SET_SESSION_FAIL ' + sessionError.message);
          } else {
            console.log('SET_SESSION_OK via_tokens');
          }

          const { data: sessionData } = await supabase.auth.getSession();
          console.log('SESSION_AFTER_SET ' + !!sessionData.session + ' ' + (sessionData.session?.user?.id || 'no-user'));
        } else {
          // PKCE code exchange (primary flow with direct deep link)
          const code = urlObj.searchParams.get('code');
          if (code) {
            const codePreview = code.slice(0, 6) + '...' + code.slice(-6);
            console.log('EXCHANGE_CODE_RECEIVED len=' + code.length + ' preview=' + codePreview);

            // Dump localStorage keys containing supabase/pkce BEFORE exchange
            try {
              const storageKeys: string[] = [];
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.toLowerCase().includes('supabase') || key.toLowerCase().includes('pkce') || key.toLowerCase().includes('code_verifier'))) {
                  const val = localStorage.getItem(key) || '';
                  storageKeys.push(key + '=' + val.slice(0, 50));
                }
              }
              console.log('EXCHANGE_STORAGE_BEFORE count=' + storageKeys.length + ' keys=' + JSON.stringify(storageKeys));
            } catch (e) {
              console.log('EXCHANGE_STORAGE_BEFORE_ERROR ' + String(e));
            }

            // Attempt PKCE code exchange
            console.log('EXCHANGE_CALLING exchangeCodeForSession...');
            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
              console.error('EXCHANGE_FAIL_MESSAGE ' + String(exchangeError.message));
              console.error('EXCHANGE_FAIL_STATUS ' + String((exchangeError as any).status));
              console.error('EXCHANGE_FAIL_NAME ' + String(exchangeError.name));
              console.error('EXCHANGE_FAIL_CODE ' + String((exchangeError as any).code || 'none'));
              try {
                console.error('EXCHANGE_FAIL_FULL ' + JSON.stringify(exchangeError, Object.getOwnPropertyNames(exchangeError)));
              } catch {
                console.error('EXCHANGE_FAIL_FULL [unserializable]');
              }
            } else {
              console.log('EXCHANGE_OK session=' + !!exchangeData?.session + ' user=' + (exchangeData?.session?.user?.id || 'none'));
            }

            // Verify session after exchange
            const { data: sessionData } = await supabase.auth.getSession();
            console.log('SESSION_AFTER_EXCHANGE ' + !!sessionData.session + ' ' + (sessionData.session?.user?.id || 'no-user'));
          } else {
            console.error('APP_NO_TOKENS_OR_CODE url=' + url);
          }
        }

      } catch (err) {
        console.error('OAUTH_CALLBACK_HANDLER_ERROR ' + String(err));
      }
    };

    // Add deep link listener
    const urlListener = CapApp.addListener('appUrlOpen', handleAppUrlOpen);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      void urlListener.then(listener => listener.remove());
    };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      {/* Banner outside WebApp so it renders even if WebApp crashes */}
      <div
        id="mobile-shell-banner"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          background: '#111',
          color: '#0f0',
          padding: '8px 12px',
          fontSize: 12,
        }}
      >
        MOBILE SHELL OK
      </div>

      {/* Show fatal error if caught */}
      {fatal && (
        <div style={{ marginTop: 60, color: 'red', whiteSpace: 'pre-wrap', fontSize: 11 }}>
          <strong>FATAL ERROR:</strong>
          <pre>{fatal.msg}</pre>
          <pre>{fatal.stack}</pre>
        </div>
      )}

      {/* Mount web app with error boundary + suspense */}
      {!fatal && (
        <ErrorBoundary fallback={<div style={{ marginTop: 60 }}>WEB APP CRASHED - check logcat</div>}>
          <Suspense fallback={<div style={{ marginTop: 60 }}>Loading web app…</div>}>
            <WebAppWithProviders />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
