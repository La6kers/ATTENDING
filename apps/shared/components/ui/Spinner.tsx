// ============================================================
// Spinner Component - @attending/shared
// apps/shared/components/ui/Spinner.tsx
// ============================================================

import * as React from 'react';
// eslint-disable-next-line no-restricted-imports
import { cn } from '../../lib/utils';

// ============================================================
// TYPES
// ============================================================

export interface SpinnerProps {
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Color */
  color?: 'primary' | 'white' | 'gray';
  /** Additional class names */
  className?: string;
  /** Accessible label */
  label?: string;
}

// ============================================================
// STYLES
// ============================================================

const sizeStyles = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const colorStyles = {
  primary: 'text-indigo-600',
  white: 'text-white',
  gray: 'text-gray-400',
};

// ============================================================
// COMPONENT
// ============================================================

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className,
  label = 'Loading...',
}) => {
  return (
    <svg
      className={cn('animate-spin', sizeStyles[size], colorStyles[color], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label={label}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// ============================================================
// LOADING OVERLAY
// ============================================================

export interface LoadingOverlayProps {
  /** Show overlay */
  loading?: boolean;
  /** Spinner size */
  size?: SpinnerProps['size'];
  /** Loading text */
  text?: string;
  /** Blur background */
  blur?: boolean;
  /** Children to overlay */
  children?: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading = true,
  size = 'lg',
  text,
  blur = false,
  children,
}) => {
  if (!loading) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center',
          'bg-white/80 z-50',
          blur && 'backdrop-blur-sm'
        )}
      >
        <Spinner size={size} />
        {text && <p className="mt-3 text-sm text-gray-600">{text}</p>}
      </div>
    </div>
  );
};

// ============================================================
// FULL PAGE LOADER
// ============================================================

export interface PageLoaderProps {
  /** Loading text */
  text?: string;
  /** Show logo */
  showLogo?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  text = 'Loading...',
  showLogo = false,
}) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
      {showLogo && (
        <div className="mb-6">
          <svg className="h-12 w-12 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      )}
      <Spinner size="xl" />
      <p className="mt-4 text-gray-600 font-medium">{text}</p>
    </div>
  );
};

export default Spinner;
