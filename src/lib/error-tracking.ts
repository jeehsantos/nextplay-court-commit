/**
 * Error Tracking and Monitoring
 * 
 * This module provides error tracking capabilities.
 * To enable Sentry, install @sentry/react and configure VITE_SENTRY_DSN
 */

interface ErrorContext {
  user?: {
    id: string;
    email?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

class ErrorTracker {
  private isProduction: boolean;
  private sentryEnabled: boolean;

  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.sentryEnabled = !!import.meta.env.VITE_SENTRY_DSN;
  }

  /**
   * Initialize error tracking
   * Call this in main.tsx before rendering the app
   */
  async init() {
    if (!this.sentryEnabled) {
      console.info('Error tracking disabled - VITE_SENTRY_DSN not configured');
      return;
    }

    try {
      // Dynamically import Sentry only if DSN is configured
      const Sentry = await import('@sentry/react');
      
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: this.isProduction ? 'production' : 'development',
        
        // Performance Monitoring
        tracesSampleRate: this.isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev
        
        // Session Replay
        replaysSessionSampleRate: 0.1, // 10% of sessions
        replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
        
        integrations: [
          new Sentry.BrowserTracing({
            // Set sampling rate for performance monitoring
            tracePropagationTargets: [
              'localhost',
              /^https:\/\/.*\.supabase\.co/,
            ],
          }),
          new Sentry.Replay({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        
        // Filter out sensitive data
        beforeSend(event, hint) {
          // Remove sensitive data from error reports
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers;
          }
          
          // Don't send errors in development
          if (!import.meta.env.PROD) {
            console.error('Sentry Error (dev):', event, hint);
            return null;
          }
          
          return event;
        },
        
        // Ignore common non-critical errors
        ignoreErrors: [
          // Browser extensions
          'top.GLOBALS',
          'chrome-extension://',
          'moz-extension://',
          // Network errors
          'NetworkError',
          'Failed to fetch',
          // ResizeObserver errors (non-critical)
          'ResizeObserver loop limit exceeded',
        ],
      });

      console.info('Error tracking initialized');
    } catch (error) {
      console.error('Failed to initialize error tracking:', error);
    }
  }

  /**
   * Capture an exception
   */
  captureException(error: Error, context?: ErrorContext) {
    if (this.isProduction && this.sentryEnabled) {
      import('@sentry/react').then(Sentry => {
        Sentry.captureException(error, {
          user: context?.user,
          tags: context?.tags,
          extra: context?.extra,
        });
      });
    } else {
      console.error('Error:', error, context);
    }
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
    if (this.isProduction && this.sentryEnabled) {
      import('@sentry/react').then(Sentry => {
        Sentry.captureMessage(message, {
          level,
          user: context?.user,
          tags: context?.tags,
          extra: context?.extra,
        });
      });
    } else {
      console[level]('Message:', message, context);
    }
  }

  /**
   * Set user context
   */
  setUser(user: { id: string; email?: string; username?: string } | null) {
    if (this.sentryEnabled) {
      import('@sentry/react').then(Sentry => {
        Sentry.setUser(user);
      });
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    if (this.sentryEnabled) {
      import('@sentry/react').then(Sentry => {
        Sentry.addBreadcrumb({
          message,
          category,
          data,
          level: 'info',
        });
      });
    }
  }

  /**
   * Start a performance transaction
   */
  startTransaction(name: string, op: string) {
    if (this.sentryEnabled) {
      return import('@sentry/react').then(Sentry => {
        return Sentry.startTransaction({ name, op });
      });
    }
    return Promise.resolve(null);
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

/**
 * React Error Boundary Component
 * Wrap your app with this to catch React errors
 */
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  if (errorTracker['sentryEnabled']) {
    // Use Sentry's ErrorBoundary if available
    return import('@sentry/react').then(Sentry => {
      const SentryErrorBoundary = Sentry.ErrorBoundary;
      return (
        <SentryErrorBoundary
          fallback={({ error, resetError }) => (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
              <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center">
                <h2 className="text-2xl font-bold text-destructive mb-4">
                  Something went wrong
                </h2>
                <p className="text-muted-foreground mb-4">
                  We've been notified and are working on a fix.
                </p>
                <button
                  onClick={resetError}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        >
          {children}
        </SentryErrorBoundary>
      );
    });
  }

  // Fallback error boundary without Sentry
  return <>{children}</>;
}

/**
 * Hook for error tracking in components
 */
export function useErrorTracking() {
  return {
    captureException: errorTracker.captureException.bind(errorTracker),
    captureMessage: errorTracker.captureMessage.bind(errorTracker),
    addBreadcrumb: errorTracker.addBreadcrumb.bind(errorTracker),
  };
}

/**
 * Performance monitoring helper
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = await errorTracker.startTransaction(name, 'function');
  const startTime = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    
    errorTracker.addBreadcrumb(
      `${name} completed`,
      'performance',
      { duration: `${duration.toFixed(2)}ms` }
    );
    
    return result;
  } catch (error) {
    errorTracker.captureException(error as Error, {
      tags: { operation: name },
    });
    throw error;
  } finally {
    if (transaction) {
      transaction.finish();
    }
  }
}
