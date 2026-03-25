// ============================================================
// Standardized Header Component - @attending/shared
// apps/shared/components/layout/Header.tsx
// 
// Matches HTML prototype header patterns
// ============================================================

import * as React from 'react';
// eslint-disable-next-line no-restricted-imports
import { cn } from '../../lib/utils';
import { GRADIENTS } from '../ui/Button';
import { 
  ProviderBadge, 
  SecurityBadge, 
  NotificationBadge, 
  AvatarStack, 
  type AvatarProps 
} from '../ui/Badge';
import { Button } from '../ui/Button';

// ============================================================
// ICONS (Inline for self-containment)
// ============================================================

const BellIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const UserIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// ============================================================
// HEADER TYPES
// ============================================================

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** Portal type for badge */
  portalType?: 'provider' | 'patient';
  /** Show security badge */
  showSecurityBadge?: boolean;
  /** Notification count */
  notificationCount?: number;
  /** Team members viewing */
  teamViewers?: AvatarProps[];
  /** User name */
  userName?: string;
  /** User initials for avatar */
  userInitials?: string;
  /** Custom right-side content */
  actions?: React.ReactNode;
  /** On notification click */
  onNotificationClick?: () => void;
  /** On user menu click */
  onUserClick?: () => void;
}

// ============================================================
// PORTAL BADGE COMPONENT (Local to Header)
// ============================================================

interface PortalBadgeProps {
  type: 'provider' | 'patient';
}

const PortalBadge: React.FC<PortalBadgeProps> = ({ type }) => (
  <span
    className={cn(
      'inline-flex items-center px-2.5 py-1 text-sm font-medium rounded-full',
      type === 'provider'
        ? 'bg-purple-100 text-purple-700'
        : 'bg-blue-100 text-blue-700'
    )}
  >
    {type === 'provider' ? 'Provider Portal' : 'Patient Portal'}
  </span>
);

// ============================================================
// HEADER COMPONENT
// ============================================================

export const Header: React.FC<HeaderProps> = ({
  portalType = 'provider',
  showSecurityBadge = true,
  notificationCount = 0,
  teamViewers = [],
  userName = 'Dr. Smith',
  userInitials = 'DS',
  actions,
  onNotificationClick,
  onUserClick,
  className,
  children,
  ...props
}) => {
  return (
    <header
      className={cn(
        'bg-white/95 backdrop-blur-lg',
        'px-6 py-4',
        'flex justify-between items-center',
        'shadow-md',
        'sticky top-0 z-50',
        'border-b border-purple-100/50',
        className
      )}
      {...props}
    >
      {/* Left Side: Logo + Badge */}
      <div className="flex items-center gap-3">
        <h1
          className="text-2xl font-bold"
          style={{
            background: GRADIENTS.brand,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ATTENDING
        </h1>
        <PortalBadge type={portalType} />
      </div>

      {/* Right Side: Security, Team, Notifications, User */}
      <div className="flex items-center gap-5">
        {/* Security Badge */}
        {showSecurityBadge && <SecurityBadge type="hipaa" />}

        {/* Team Presence */}
        {teamViewers.length > 0 && (
          <div className="flex items-center gap-3">
            <AvatarStack avatars={teamViewers} max={3} size="sm" />
            <Button variant="secondary" size="sm">
              Start Team Huddle
            </Button>
          </div>
        )}

        {/* Custom Actions */}
        {actions}

        {/* Notification Bell */}
        <button
          onClick={onNotificationClick}
          className={cn(
            'relative p-2.5 rounded-full',
            'bg-purple-100 hover:bg-purple-200',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
            'hover:scale-105'
          )}
        >
          <BellIcon className="w-5 h-5 text-purple-700" />
          {notificationCount > 0 && (
            <NotificationBadge count={notificationCount} />
          )}
        </button>

        {/* User Menu */}
        <button
          onClick={onUserClick}
          className={cn(
            'flex items-center gap-2',
            'bg-purple-100 hover:bg-purple-200',
            'px-4 py-2 rounded-full',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
            'hover:-translate-y-0.5'
          )}
        >
          <UserIcon className="w-5 h-5 text-purple-700" />
          <span className="text-sm font-medium text-purple-900">{userName}</span>
        </button>
      </div>

      {children}
    </header>
  );
};

// ============================================================
// PATIENT BANNER (Context bar below header)
// ============================================================

export interface PatientBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  patient: {
    name: string;
    mrn: string;
    dob: string;
    age?: string;
    gender?: string;
  };
  vitals?: {
    bp?: string;
    hr?: string;
    temp?: string;
    rr?: string;
    spo2?: string;
  };
  chiefComplaint?: string;
  urgency?: 'routine' | 'moderate' | 'urgent' | 'critical';
  waitTime?: string;
  actions?: React.ReactNode;
}

const urgencyStyles = {
  routine: 'bg-green-100 text-green-800 border-green-200',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  urgent: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

export const PatientBanner: React.FC<PatientBannerProps> = ({
  patient,
  vitals,
  chiefComplaint,
  urgency = 'routine',
  waitTime,
  actions,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white/90 backdrop-blur-sm',
        'px-6 py-4',
        'border-b border-gray-200',
        'shadow-sm',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        {/* Patient Info */}
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md"
            style={{ background: GRADIENTS.brand }}
          >
            {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>

          {/* Name & Demographics */}
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{patient.name}</h2>
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold border', urgencyStyles[urgency])}>
                {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <span>MRN: {patient.mrn}</span>
              <span>DOB: {patient.dob}</span>
              {patient.age && <span>{patient.age}</span>}
              {patient.gender && <span>{patient.gender}</span>}
            </div>
          </div>
        </div>

        {/* Vitals */}
        {vitals && (
          <div className="flex items-center gap-6 px-6 border-l border-r border-gray-200">
            {vitals.bp && <VitalDisplay label="BP" value={vitals.bp} />}
            {vitals.hr && <VitalDisplay label="HR" value={vitals.hr} />}
            {vitals.temp && <VitalDisplay label="Temp" value={vitals.temp} />}
            {vitals.rr && <VitalDisplay label="RR" value={vitals.rr} />}
            {vitals.spo2 && <VitalDisplay label="SpO₂" value={vitals.spo2} />}
          </div>
        )}

        {/* Chief Complaint & Actions */}
        <div className="flex items-center gap-4">
          {chiefComplaint && (
            <div className="text-right">
              <span className="text-xs text-gray-500 block">Chief Complaint</span>
              <span className="text-sm font-semibold text-gray-900">{chiefComplaint}</span>
            </div>
          )}
          {waitTime && (
            <div className="text-right">
              <span className="text-xs text-gray-500 block">Wait Time</span>
              <span className="text-sm font-semibold text-gray-900">{waitTime}</span>
            </div>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// VITAL DISPLAY (Helper)
// ============================================================

interface VitalDisplayProps {
  label: string;
  value: string;
  alert?: boolean;
}

const VitalDisplay: React.FC<VitalDisplayProps> = ({ label, value, alert }) => (
  <div className="text-center">
    <span className="text-xs text-gray-500 block">{label}</span>
    <span className={cn('text-sm font-semibold', alert ? 'text-red-600' : 'text-gray-900')}>{value}</span>
  </div>
);

// ============================================================
// QUICK ACTIONS BAR
// ============================================================

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

export interface QuickActionsBarProps extends React.HTMLAttributes<HTMLDivElement> {
  actions: QuickAction[];
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({ actions, className, ...props }) => (
  <div
    className={cn('flex flex-wrap items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-200', className)}
    {...props}
  >
    {actions.map((action) => (
      <button
        key={action.id}
        onClick={action.onClick}
        disabled={action.disabled}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
          'transition-all duration-200 border',
          'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
          action.disabled && 'opacity-50 cursor-not-allowed',
          action.active
            ? 'bg-purple-100 text-purple-700 border-purple-200'
            : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50',
          !action.disabled && 'hover:-translate-y-0.5 hover:shadow-md'
        )}
      >
        <span className="w-4 h-4 flex-shrink-0">{action.icon}</span>
        <span>{action.label}</span>
      </button>
    ))}
  </div>
);

// ============================================================
// CLINICAL ALERT BANNER
// ============================================================

export interface ClinicalAlertBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  type: 'critical' | 'warning' | 'info';
  title: string;
  message?: string;
  onDismiss?: () => void;
  actions?: React.ReactNode;
}

const alertStyles = {
  critical: {
    bg: 'bg-gradient-to-r from-red-500 to-red-600',
    text: 'text-white',
    icon: '🚨',
  },
  warning: {
    bg: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
    text: 'text-yellow-900',
    icon: '⚠️',
  },
  info: {
    bg: 'bg-gradient-to-r from-blue-400 to-blue-500',
    text: 'text-white',
    icon: 'ℹ️',
  },
};

export const ClinicalAlertBanner: React.FC<ClinicalAlertBannerProps> = ({
  type,
  title,
  message,
  onDismiss,
  actions,
  className,
  ...props
}) => {
  const styles = alertStyles[type];
  
  return (
    <div
      className={cn(
        styles.bg,
        styles.text,
        'px-6 py-3 flex items-center justify-between',
        type === 'critical' && 'animate-pulse-urgent',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{styles.icon}</span>
        <div>
          <span className="font-bold">{title}</span>
          {message && <span className="ml-2 opacity-90">{message}</span>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;
