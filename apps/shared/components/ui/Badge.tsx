// ============================================================
// Enhanced Badge & Clinical Components - @attending/shared
// apps/shared/components/ui/Badge.tsx
// ============================================================

import * as React from 'react';
// eslint-disable-next-line no-restricted-imports
import { cn } from '../../lib/utils';
import { GRADIENTS } from './Button';

// ============================================================
// BADGE COMPONENT (Enhanced)
// ============================================================

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  dot?: boolean;
  /** Use gradient background for variant */
  gradient?: boolean;
  /** Pill shape (default true) */
  pill?: boolean;
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, {
  base: string;
  gradient?: string;
  dotColor: string;
}> = {
  default: { base: 'bg-gray-100 text-gray-800', dotColor: 'bg-gray-400' },
  primary: { base: 'bg-purple-100 text-purple-800', gradient: GRADIENTS.brand, dotColor: 'bg-purple-500' },
  success: { base: 'bg-green-100 text-green-800', gradient: GRADIENTS.success, dotColor: 'bg-green-500' },
  warning: { base: 'bg-yellow-100 text-yellow-800', gradient: GRADIENTS.warning, dotColor: 'bg-yellow-500' },
  danger: { base: 'bg-red-100 text-red-800', gradient: GRADIENTS.danger, dotColor: 'bg-red-500' },
  info: { base: 'bg-blue-100 text-blue-800', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', dotColor: 'bg-blue-500' },
  purple: { base: 'bg-purple-100 text-purple-800', gradient: GRADIENTS.brand, dotColor: 'bg-purple-500' },
};

const sizeStyles: Record<NonNullable<BadgeProps['size']>, string> = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot, gradient, pill = true, children, style, ...props }, ref) => {
    const config = variantStyles[variant];
    const useGradient = gradient && config.gradient;

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-semibold',
          pill ? 'rounded-full' : 'rounded-md',
          useGradient ? 'text-white' : config.base,
          sizeStyles[size],
          className
        )}
        style={useGradient ? { background: config.gradient, ...style } : style}
        {...props}
      >
        {dot && <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', config.dotColor)} />}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// ============================================================
// NOTIFICATION BADGE (Red counter from HTML prototypes)
// ============================================================

export interface NotificationBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number;
  max?: number;
  /** Offset position */
  offset?: { top?: number; right?: number };
  /** Pulsing animation */
  pulse?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  max = 99,
  offset = { top: -4, right: -4 },
  pulse,
  className,
  ...props
}) => {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <span
      className={cn(
        'absolute w-5 h-5 rounded-full',
        'flex items-center justify-center',
        'text-white text-[11px] font-bold',
        'shadow-md',
        pulse && 'animate-pulse',
        className
      )}
      style={{
        top: offset.top,
        right: offset.right,
        background: GRADIENTS.danger,
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
      }}
      {...props}
    >
      {displayCount}
    </span>
  );
};

// ============================================================
// URGENCY BADGE (Clinical urgency levels)
// ============================================================

export type UrgencyLevel = 'routine' | 'urgent' | 'stat' | 'critical';

export interface UrgencyBadgeProps extends Omit<BadgeProps, 'variant'> {
  urgency: UrgencyLevel;
  showIcon?: boolean;
}

const urgencyConfig: Record<UrgencyLevel, {
  label: string;
  variant: BadgeProps['variant'];
  icon: string;
}> = {
  routine: { label: 'Routine', variant: 'success', icon: '●' },
  urgent: { label: 'Urgent', variant: 'warning', icon: '▲' },
  stat: { label: 'STAT', variant: 'danger', icon: '⚡' },
  critical: { label: 'CRITICAL', variant: 'danger', icon: '🚨' },
};

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ urgency, showIcon = true, children, ...props }) => {
  const config = urgencyConfig[urgency];
  return (
    <Badge variant={config.variant} dot={!showIcon} {...props}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {children || config.label}
    </Badge>
  );
};

// ============================================================
// TRIAGE BADGE (ESI Levels)
// ============================================================

export type ESILevel = 1 | 2 | 3 | 4 | 5;

export interface TriageBadgeProps extends Omit<BadgeProps, 'variant'> {
  level: ESILevel;
  showLabel?: boolean;
}

const esiConfig: Record<ESILevel, {
  label: string;
  color: string;
  bg: string;
  description: string;
}> = {
  1: { label: 'ESI-1', color: '#dc2626', bg: '#fef2f2', description: 'Resuscitation' },
  2: { label: 'ESI-2', color: '#ea580c', bg: '#fff7ed', description: 'Emergent' },
  3: { label: 'ESI-3', color: '#ca8a04', bg: '#fefce8', description: 'Urgent' },
  4: { label: 'ESI-4', color: '#16a34a', bg: '#f0fdf4', description: 'Less Urgent' },
  5: { label: 'ESI-5', color: '#2563eb', bg: '#eff6ff', description: 'Non-Urgent' },
};

export const TriageBadge: React.FC<TriageBadgeProps> = ({ level, showLabel = true, className, ...props }) => {
  const config = esiConfig[level];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold',
        className
      )}
      style={{ backgroundColor: config.bg, color: config.color }}
      title={config.description}
      {...props}
    >
      {config.label}
      {showLabel && <span className="ml-1 font-medium opacity-80">• {config.description}</span>}
    </span>
  );
};

// ============================================================
// STATUS BADGE (Assessment/Order Status)
// ============================================================

export type StatusType = 'pending' | 'in_progress' | 'in_review' | 'completed' | 'cancelled' | 'follow_up' | 'urgent';

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: StatusType;
}

const statusConfig: Record<StatusType, { label: string; variant: BadgeProps['variant'] }> = {
  pending: { label: 'Pending', variant: 'info' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  in_review: { label: 'In Review', variant: 'purple' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
  follow_up: { label: 'Follow Up', variant: 'info' },
  urgent: { label: 'Urgent', variant: 'danger' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, children, ...props }) => {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} dot {...props}>
      {children || config.label}
    </Badge>
  );
};

// ============================================================
// PROVIDER BADGE (Header badge from HTML)
// ============================================================

export interface ProviderBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label?: string;
}

export const ProviderBadge: React.FC<ProviderBadgeProps> = ({ label = 'Provider Portal', className, ...props }) => (
  <span
    className={cn(
      'px-3 py-1 rounded-full text-xs font-semibold text-white',
      className
    )}
    style={{ background: GRADIENTS.brand }}
    {...props}
  >
    {label}
  </span>
);

// ============================================================
// SECURITY BADGE (HIPAA Compliant badge from HTML)
// ============================================================

export interface SecurityBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  showIcon?: boolean;
}

export const SecurityBadge: React.FC<SecurityBadgeProps> = ({ showIcon = true, className, ...props }) => (
  <div
    className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-full',
      'bg-purple-50 text-purple-700 text-xs font-medium',
      className
    )}
    {...props}
  >
    {showIcon && (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )}
    <span>HIPAA Compliant • 256-bit Encryption</span>
  </div>
);

// ============================================================
// AVATAR STACK (Team presence from HTML)
// ============================================================

export interface AvatarProps {
  id: string;
  name: string;
  initials: string;
  color?: string;
}

export interface AvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  avatars: AvatarProps[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  avatars,
  max = 3,
  size = 'md',
  className,
  ...props
}) => {
  const sizeClass = { sm: 'w-6 h-6 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm' };
  const visibleAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={cn('flex -space-x-2', className)} {...props}>
      {visibleAvatars.map((avatar) => (
        <div
          key={avatar.id}
          className={cn(
            sizeClass[size],
            'rounded-full border-2 border-white',
            'flex items-center justify-center font-semibold text-white',
            'shadow-sm'
          )}
          style={{ background: avatar.color || GRADIENTS.success }}
          title={`${avatar.name} viewing`}
        >
          {avatar.initials}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            sizeClass[size],
            'rounded-full border-2 border-white bg-gray-200',
            'flex items-center justify-center font-semibold text-gray-600',
            'shadow-sm'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

export default Badge;
