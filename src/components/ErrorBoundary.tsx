import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional callback for SPA navigation to home instead of full reload */
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

const MAX_RETRIES = 3;

/**
 * Error Boundary component to catch JavaScript errors in child components
 * and display a fallback UI instead of crashing the entire app.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console only in development
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // TODO: Send to error tracking service (e.g., Sentry) in production
    // if (import.meta.env.PROD) {
    //   captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    // }
  }

  handleGoHome = (): void => {
    // Use SPA navigation if callback provided, otherwise fall back to full reload
    if (this.props.onNavigateHome) {
      this.props.onNavigateHome();
      this.setState({ hasError: false, error: null, retryCount: 0 });
    } else {
      window.location.href = "/";
    }
  };

  handleRetry = (): void => {
    // Use setState callback to avoid race conditions with rapid clicks
    this.setState((prevState) => {
      const newRetryCount = prevState.retryCount + 1;
      if (newRetryCount >= MAX_RETRIES) {
        // Max retries reached, don't allow further retries
        if (import.meta.env.DEV) {
          console.warn(`ErrorBoundary: Max retries (${MAX_RETRIES}) reached`);
        }
        return null; // No state change
      }
      return { hasError: false, error: null, retryCount: newRetryCount };
    });
  };

  canRetry = (): boolean => {
    return this.state.retryCount < MAX_RETRIES;
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Allow custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          className="min-h-screen flex items-center justify-center bg-background p-4"
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertTriangle
                  className="h-12 w-12 text-destructive"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="text-muted-foreground">
                We're sorry, but something unexpected happened. Please try again
                or return to the home page.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div
                className="bg-muted rounded-lg p-4 text-left"
                aria-label="Error details"
              >
                <p className="text-sm font-mono text-destructive break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                variant="default"
                disabled={!this.canRetry()}
                aria-disabled={!this.canRetry()}
                aria-label={
                  this.canRetry()
                    ? `Try again, ${
                        MAX_RETRIES - this.state.retryCount
                      } attempts remaining`
                    : "Maximum retry attempts reached"
                }
              >
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                {this.canRetry()
                  ? `Try Again (${MAX_RETRIES - this.state.retryCount} left)`
                  : "Max retries reached"}
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                aria-label="Return to home page"
              >
                <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                Go Home
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
