// ============================================================
// Badge Component - @attending/shared
// apps/shared/components/ui/Badge.tsx
// ============================================================

import * as React from 'react';
import { cn } from '../../lib/utils';

// ============================================================
// TYPES
// ============================================================

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual variant */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show dot indicator */
  dot?: boolean;
  /** Dot color (overrides variant) */
  dotColor?: string;
  /** Rounded pill style */
  pill?: boolean;
}

// ============================================================
// STYLES
// ============================================================

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
};

const dotColors: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-gray-400',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
  purple: 'bg-purple-400',
};

const sizeStyles: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-sm',
};

// ============================================================
// COMPONENT
// ============================================================

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      dot = false,
      dotColor,
      pill = true,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium',
          pill ? 'rounded-full' : 'rounded-md',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full mr-1.5',
              dotColor || dotColors[variant]
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// ============================================================
// URGENCY BADGE
// ============================================================

export interface UrgencyBadgeProps extends Omit<BadgeProps, 'variant'> {
  urgency: 'standard' | 'moderate' | 'high' | 'emergency';
}

const urgencyVariantMap: Record<UrgencyBadgeProps['urgency'], BadgeProps['variant']> = {
  standard: 'success',
  moderate: 'warning',
  high: 'danger',
  emergency: 'danger',
};

const urgencyLabels: Record<UrgencyBadgeProps['urgency'], string> = {
  standard: 'Standard',
  moderate: 'Moderate',
  high: 'High',
  emergency: 'Emergency',
};

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({
  urgency,
  children,
  ...props
}) => {
  return (
    <Badge variant={urgencyVariantMap[urgency]} dot {...props}>
      {children || urgencyLabels[urgency]}
    </Badge>
  );
};

// ============================================================
// STATUS BADGE
// ============================================================

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'pending' | 'urgent' | 'in_progress' | 'in_review' | 'completed' | 'follow_up' | 'cancelled';
}

const statusVariantMap: Record<StatusBadgeProps['status'], BadgeProps['variant']> = {
  pending: 'info',
  urgent: 'danger',
  in_progress: 'warning',
  in_review: 'purple',
  completed: 'success',
  follow_up: 'info',
  cancelled: 'default',
};

const statusLabels: Record<StatusBadgeProps['status'], string> = {
  pending: 'Pending',
  urgent: 'Urgent',
  in_progress: 'In Progress',
  in_review: 'In Review',
  completed: 'Completed',
  follow_up: 'Follow Up',
  cancelled: 'Cancelled',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  ...props
}) => {
  return (
    <Badge variant={statusVariantMap[status]} dot {...props}>
      {children || statusLabels[status]}
    </Badge>
  );
};

export default Badge;
