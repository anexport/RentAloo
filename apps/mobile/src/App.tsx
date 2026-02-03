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
// import { useDeepLinks } from './plugins/deepLinks'; // TODO: Move inside Router context
import { isNativePlatform, platform, logger } from './lib/nativeBridge';

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

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
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
