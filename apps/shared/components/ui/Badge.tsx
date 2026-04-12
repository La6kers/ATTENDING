// ============================================================
// Badge Components - @attending/shared
// apps/shared/components/ui/Badge.tsx
//
// Re-exports from @attending/ui-primitives plus specialized clinical badges
// ============================================================

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Badge as BaseBadge, type BadgeProps as BaseBadgeProps, gradients } from '@attending/ui-primitives';

// Re-export base badge
export { Badge, PriorityBadge, AIBadge, type BadgeProps } from '@attending/ui-primitives';

// ============================================================
// NOTIFICATION BADGE (Count indicator)
// ============================================================

export interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  className,
}) => {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <span
      className={cn(
        'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1',
        'flex items-center justify-center',
        'text-xs font-semibold text-white rounded-full',
        className
      )}
      style={{ background: gradients.critical }}
    >
      {displayCount}
    </span>
  );
};

// ============================================================
// URGENCY BADGE (Clinical urgency levels)
// ============================================================

export type UrgencyLevel = 'critical' | 'high' | 'moderate' | 'low';

export interface UrgencyBadgeProps {
  urgency: UrgencyLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const urgencyStyles: Record<UrgencyLevel, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
  moderate: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Moderate' },
  low: { bg: 'bg-green-100', text: 'text-green-700', label: 'Low' },
};

const urgencySizes: Record<NonNullable<UrgencyBadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-sm',
};

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ urgency, size = 'md', className }) => {
  const style = urgencyStyles[urgency];
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full',
        style.bg,
        style.text,
        urgencySizes[size],
        urgency === 'critical' && 'animate-pulse',
        className
      )}
    >
      {urgency === 'critical' && <span className="mr-1">⚠️</span>}
      {style.label}
    </span>
  );
};

// ============================================================
// TRIAGE BADGE (ESI Levels 1-5)
// ============================================================

export type ESILevel = 1 | 2 | 3 | 4 | 5;

export interface TriageBadgeProps {
  level: ESILevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const esiStyles: Record<ESILevel, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-red-600', text: 'text-white', label: 'Resuscitation' },
  2: { bg: 'bg-orange-500', text: 'text-white', label: 'Emergent' },
  3: { bg: 'bg-yellow-400', text: 'text-gray-900', label: 'Urgent' },
  4: { bg: 'bg-green-500', text: 'text-white', label: 'Less Urgent' },
  5: { bg: 'bg-blue-500', text: 'text-white', label: 'Non-Urgent' },
};

export const TriageBadge: React.FC<TriageBadgeProps> = ({
  level,
  showLabel = false,
  size = 'md',
  className,
}) => {
  const style = esiStyles[level];
  return (
    <span
      className={cn(
        'inline-flex items-center font-bold rounded-full',
        style.bg,
        style.text,
        urgencySizes[size],
        level === 1 && 'animate-pulse',
        className
      )}
    >
      ESI {level}
      {showLabel && <span className="ml-1 font-normal">- {style.label}</span>}
    </span>
  );
};

// ============================================================
// STATUS BADGE (Generic status indicator)
// ============================================================

export type StatusType = 'active' | 'pending' | 'completed' | 'cancelled' | 'draft' | 'archived';

export interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusStyles: Record<StatusType, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completed' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Archived' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className }) => {
  const style = statusStyles[status];
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        style.bg,
        style.text,
        urgencySizes[size],
        className
      )}
    >
      {style.label}
    </span>
  );
};

// ============================================================
// PROVIDER BADGE (Provider role indicator)
// ============================================================

export interface ProviderBadgeProps {
  role: 'physician' | 'nurse' | 'pa' | 'np' | 'specialist' | 'resident';
  name?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const roleStyles: Record<ProviderBadgeProps['role'], { abbr: string; color: string }> = {
  physician: { abbr: 'MD', color: 'bg-purple-100 text-purple-700' },
  nurse: { abbr: 'RN', color: 'bg-blue-100 text-blue-700' },
  pa: { abbr: 'PA', color: 'bg-teal-100 text-teal-700' },
  np: { abbr: 'NP', color: 'bg-indigo-100 text-indigo-700' },
  specialist: { abbr: 'SP', color: 'bg-orange-100 text-orange-700' },
  resident: { abbr: 'RES', color: 'bg-gray-100 text-gray-700' },
};

export const ProviderBadge: React.FC<ProviderBadgeProps> = ({ role, name, size = 'md', className }) => {
  const style = roleStyles[role];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        style.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
    >
      <span className="font-bold">{style.abbr}</span>
      {name && <span>{name}</span>}
    </span>
  );
};

// ============================================================
// SECURITY BADGE (HIPAA/Authentication status)
// ============================================================

export interface SecurityBadgeProps {
  type: 'hipaa' | 'verified' | 'authenticated' | 'encrypted';
  size?: 'sm' | 'md';
  className?: string;
}

const securityConfig: Record<SecurityBadgeProps['type'], { icon: string; label: string; color: string }> = {
  hipaa: { icon: '🔒', label: 'HIPAA', color: 'bg-green-100 text-green-700' },
  verified: { icon: '✓', label: 'Verified', color: 'bg-blue-100 text-blue-700' },
  authenticated: { icon: '🔐', label: 'Auth', color: 'bg-purple-100 text-purple-700' },
  encrypted: { icon: '🔏', label: 'Encrypted', color: 'bg-gray-100 text-gray-700' },
};

export const SecurityBadge: React.FC<SecurityBadgeProps> = ({ type, size = 'sm', className }) => {
  const config = securityConfig[type];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        config.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

// ============================================================
// AVATAR STACK (Multiple avatars)
// ============================================================

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface AvatarStackProps {
  avatars: AvatarProps[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const avatarSizes: Record<NonNullable<AvatarStackProps['size']>, string> = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export const AvatarStack: React.FC<AvatarStackProps> = ({ avatars, max = 4, size = 'md', className }) => {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visible.map((avatar, idx) => (
        <div
          key={idx}
          className={cn(
            'rounded-full border-2 border-white flex items-center justify-center font-medium text-white',
            avatarSizes[size]
          )}
          style={{ background: gradients.brand, zIndex: visible.length - idx }}
          title={avatar.name}
        >
          {avatar.src ? (
            <img src={avatar.src} alt={avatar.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            avatar.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'rounded-full border-2 border-white bg-gray-200 flex items-center justify-center font-medium text-gray-600',
            avatarSizes[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

export default BaseBadge;
