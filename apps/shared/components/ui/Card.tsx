// ============================================================
// Card Component - @attending/shared
// apps/shared/components/ui/Card.tsx
// ============================================================

import * as React from 'react';
import { cn } from '../../lib/utils';

// ============================================================
// TYPES
// ============================================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remove padding */
  noPadding?: boolean;
  /** Add hover effect */
  hoverable?: boolean;
  /** Card variant */
  variant?: 'default' | 'bordered' | 'elevated';
}

// ============================================================
// CARD COMPONENT
// ============================================================

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, noPadding, hoverable, variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-white border border-gray-200 shadow-sm',
      bordered: 'bg-white border-2 border-gray-200',
      elevated: 'bg-white shadow-lg border-0',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg',
          variantStyles[variant],
          hoverable && 'transition-shadow hover:shadow-md cursor-pointer',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

// ============================================================
// CARD HEADER
// ============================================================

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Header title */
  title?: string;
  /** Header subtitle/description */
  subtitle?: string;
  /** Actions to show on the right */
  actions?: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, actions, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4 border-b border-gray-200', className)}
      {...props}
    >
      {(title || subtitle || actions) ? (
        <div className="flex items-start justify-between">
          <div>
            {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </div>
          {actions && <div className="ml-4 flex-shrink-0">{actions}</div>}
        </div>
      ) : children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

// ============================================================
// CARD CONTENT
// ============================================================

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
));
CardContent.displayName = 'CardContent';

// ============================================================
// CARD FOOTER
// ============================================================

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export default Card;
