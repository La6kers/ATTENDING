// ============================================================
// ATTENDING AI - Clinical Error Boundary Component
// apps/shared/components/errors/ClinicalErrorBoundary.tsx
//
// Specialized error boundary for clinical components that:
// - Never crashes without fallback UI
// - Logs errors for debugging
// - Provides manual review option
// - Maintains clinical safety even when errors occur
//
// CRITICAL: Clinical components should NEVER leave users
// without a way to proceed or get help
// ============================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';

// ============================================================
// TYPES
// ============================================================

export interface ClinicalErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI to render when an error occurs */
  fallback?: ReactNode;
  /** Whether this boundary protects a critical clinical function */
  isCritical?: boolean;
  /** Component name for error logging */
  componentName?: string;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Show detailed error in development mode */
  showDetailsInDev?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Show retry button */
  showRetry?: boolean;
  /** On retry callback */
  onRetry?: () => void;
}

interface ClinicalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

// ============================================================
// ERROR BOUNDARY COMPONENT
// ============================================================

export class ClinicalErrorBoundary extends Component<
  ClinicalErrorBoundaryProps,
  ClinicalErrorBoundaryState
> {
  constructor(props: ClinicalErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ClinicalErrorBoundaryState> {
    // Generate a unique error ID for tracking
    const errorId = `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { componentName, onError, isCritical } = this.props;
    
    this.setState({ errorInfo });

    // Log error with context
    const errorContext = {
      errorId: this.state.errorId,
      componentName: componentName || 'Unknown',
      isCritical,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    };

    // Log to console for debugging
    console.error('[ClinicalErrorBoundary] Component error:', errorContext);

    // For critical errors, also log as warning for visibility
    if (isCritical) {
      console.warn(
        '[CRITICAL] Clinical component failure - manual review required:',
        componentName || 'Unknown component',
        `Error ID: ${this.state.errorId}`
      );
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // In production, you would send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorContext });
  }

  handleRetry = (): void => {
    const { onRetry } = this.props;
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });

    if (onRetry) {
      onRetry();
    }
  };

  render(): ReactNode {
    const { hasError, error, errorId } = this.state;
    const { 
      children, 
      fallback, 
      isCritical, 
      componentName,
      showDetailsInDev = true,
      errorMessage,
      showRetry = true,
    } = this.props;

    if (hasError) {
      // If custom fallback provided, use it
      if (fallback) {
        return fallback;
      }

      // Default error UI
      const isDev = process.env.NODE_ENV === 'development';
      const showDetails = isDev && showDetailsInDev;

      return (
        <div
          style={{
            padding: '16px',
            margin: '8px 0',
            borderRadius: '8px',
            backgroundColor: isCritical ? '#FEE2E2' : '#FEF3C7',
            border: `1px solid ${isCritical ? '#EF4444' : '#F59E0B'}`,
          }}
          role="alert"
          aria-live="assertive"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            {/* Icon */}
            <div
              style={{
                flexShrink: 0,
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isCritical ? (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: isCritical ? '#DC2626' : '#D97706',
                }}
              >
                {isCritical ? 'Clinical Component Error' : 'Component Error'}
              </h3>

              <p
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  color: '#374151',
                }}
              >
                {errorMessage ||
                  (isCritical
                    ? 'A critical clinical component encountered an error. Please proceed with caution and consider manual review.'
                    : 'This component encountered an error and could not be displayed.')}
              </p>

              {componentName && (
                <p
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    color: '#6B7280',
                  }}
                >
                  Component: {componentName}
                </p>
              )}

              {errorId && (
                <p
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: '12px',
                    color: '#6B7280',
                    fontFamily: 'monospace',
                  }}
                >
                  Error ID: {errorId}
                </p>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {showRetry && (
                  <button
                    onClick={this.handleRetry}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#FFFFFF',
                      backgroundColor: isCritical ? '#DC2626' : '#D97706',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Try Again
                  </button>
                )}

                {isCritical && (
                  <button
                    onClick={() => {
                      // In a real app, this would open a support chat or call
                      window.alert(
                        `Please contact support with Error ID: ${errorId}\n\n` +
                        'For immediate clinical needs, please proceed with manual review.'
                      );
                    }}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#DC2626',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #DC2626',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Contact Support
                  </button>
                )}
              </div>

              {/* Development error details */}
              {showDetails && error && (
                <details
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: '#1F2937',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#F9FAFB',
                    overflow: 'auto',
                    maxHeight: '200px',
                  }}
                >
                  <summary
                    style={{
                      cursor: 'pointer',
                      color: '#9CA3AF',
                      marginBottom: '8px',
                    }}
                  >
                    Developer Details (visible in development only)
                  </summary>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {error.stack || error.message}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// ============================================================
// CONVENIENCE WRAPPER FOR CRITICAL COMPONENTS
// ============================================================

export interface CriticalClinicalBoundaryProps {
  children: ReactNode;
  componentName: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Error boundary specifically for critical clinical components
 * (red flag detection, medication safety, emergency alerts, etc.)
 */
export function CriticalClinicalBoundary({
  children,
  componentName,
  onError,
}: CriticalClinicalBoundaryProps): JSX.Element {
  return (
    <ClinicalErrorBoundary
      isCritical
      componentName={componentName}
      onError={onError}
      errorMessage="A critical clinical safety component encountered an error. Please proceed with manual clinical review."
      showRetry
    >
      {children}
    </ClinicalErrorBoundary>
  );
}

// ============================================================
// HOC FOR WRAPPING COMPONENTS
// ============================================================

/**
 * Higher-order component to wrap any component with clinical error boundary
 */
export function withClinicalErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<ClinicalErrorBoundaryProps, 'children'> = {}
): React.FC<P> {
  const componentName = options.componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ClinicalErrorBoundary {...options} componentName={componentName}>
      <WrappedComponent {...props} />
    </ClinicalErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithClinicalErrorBoundary(${componentName})`;
  
  return WithErrorBoundary;
}

// ============================================================
// MANUAL REVIEW FALLBACK COMPONENT
// ============================================================

export interface ManualReviewRequiredProps {
  title?: string;
  message?: string;
  errorId?: string;
  showSupport?: boolean;
}

/**
 * Fallback component indicating manual clinical review is required
 */
export function ManualReviewRequired({
  title = 'Manual Review Required',
  message = 'The automated clinical decision support is temporarily unavailable. Please proceed with standard clinical assessment.',
  errorId,
  showSupport = true,
}: ManualReviewRequiredProps): JSX.Element {
  return (
    <div
      style={{
        padding: '24px',
        margin: '16px 0',
        borderRadius: '8px',
        backgroundColor: '#FEF3C7',
        border: '2px solid #F59E0B',
        textAlign: 'center',
      }}
      role="alert"
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#D97706"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ margin: '0 auto 16px' }}
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>

      <h3
        style={{
          margin: '0 0 8px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#92400E',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          color: '#78350F',
          maxWidth: '500px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {message}
      </p>

      {errorId && (
        <p
          style={{
            margin: '0 0 16px 0',
            fontSize: '12px',
            color: '#92400E',
            fontFamily: 'monospace',
          }}
        >
          Reference: {errorId}
        </p>
      )}

      {showSupport && (
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: '#78350F',
          }}
        >
          If you need assistance, please contact clinical support.
        </p>
      )}
    </div>
  );
}

// ============================================================
// EXPORTS
// ============================================================

export default ClinicalErrorBoundary;
