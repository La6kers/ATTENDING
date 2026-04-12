// ============================================================
// Quick Actions Bar - @attending/shared
// apps/shared/components/clinical/QuickActionsBar.tsx
//
// Consolidated quick action bar from HTML prototypes
// Used across all clinical ordering pages
// ============================================================

import * as React from 'react';
import { cn } from '../../lib/utils';

// ============================================================
// TYPES
// ============================================================

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'primary' | 'back' | 'danger';
  disabled?: boolean;
  badge?: number | string;
}

export interface QuickActionsBarProps {
  actions: QuickAction[];
  className?: string;
}

// ============================================================
// ACTION BUTTON COMPONENT
// ============================================================

interface ActionButtonProps {
  action: QuickAction;
}

const ActionButton: React.FC<ActionButtonProps> = ({ action }) => {
  const baseClasses = cn(
    'quick-action',
    'flex items-center gap-2 px-4 py-2.5',
    'text-sm font-medium whitespace-nowrap',
    'border-2 rounded-lg cursor-pointer',
    'transition-all duration-200',
    'hover:-translate-y-0.5 hover:shadow-md',
    'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
    action.disabled && 'opacity-50 cursor-not-allowed'
  );

  const variantClasses: Record<NonNullable<QuickAction['variant']>, string> = {
    default: 'bg-white text-gray-700 border-gray-200 hover:border-purple-400',
    primary: 'bg-white text-purple-700 border-purple-200 hover:border-purple-400 hover:bg-purple-50',
    back: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent hover:shadow-lg',
    danger: 'bg-white text-red-700 border-red-200 hover:border-red-400 hover:bg-red-50',
  };

  const content = (
    <>
      <span className="w-4 h-4 flex-shrink-0">{action.icon}</span>
      <span>{action.label}</span>
      {action.badge !== undefined && (
        <span className={cn(
          'px-2 py-0.5 text-xs font-semibold rounded-full',
          action.variant === 'back' ? 'bg-white/20' : 'bg-purple-100 text-purple-700'
        )}>
          {action.badge}
        </span>
      )}
      {action.shortcut && (
        <kbd className="hidden md:inline-flex ml-2 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
          {action.shortcut}
        </kbd>
      )}
    </>
  );

  if (action.href) {
    return (
      <a
        href={action.href}
        className={cn(baseClasses, variantClasses[action.variant || 'default'])}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={action.onClick}
      disabled={action.disabled}
      className={cn(baseClasses, variantClasses[action.variant || 'default'])}
    >
      {content}
    </button>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'quick-actions-bar',
        'flex gap-2 p-3',
        'bg-purple-50/50 border-t-3 border-t-purple-500',
        'rounded-xl mb-5',
        'overflow-x-auto scrollbar-thin',
        className
      )}
      role="toolbar"
      aria-label="Quick actions"
    >
      {actions.map((action) => (
        <ActionButton key={action.id} action={action} />
      ))}
    </div>
  );
};

// ============================================================
// PRE-CONFIGURED ACTION SETS
// ============================================================

// Icons as inline SVGs for portability
const Icons = {
  back: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  lab: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  imaging: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  medication: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  referral: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  print: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  ),
  save: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
  submit: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  guidelines: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

/**
 * Pre-configured action sets for common clinical pages
 */
export const createLabOrderActions = (handlers: {
  onBack?: () => void;
  onSubmit?: () => void;
  onPrint?: () => void;
  onGuidelines?: () => void;
  orderCount?: number;
}): QuickAction[] => [
  { id: 'back', label: 'Back to Summary', icon: Icons.back, onClick: handlers.onBack, variant: 'back' },
  { id: 'imaging', label: 'Imaging', icon: Icons.imaging, href: '/imaging', variant: 'primary' },
  { id: 'meds', label: 'Medications', icon: Icons.medication, href: '/medications', variant: 'primary' },
  { id: 'referrals', label: 'Referrals', icon: Icons.referral, href: '/referrals', variant: 'primary' },
  { id: 'guidelines', label: 'Guidelines', icon: Icons.guidelines, onClick: handlers.onGuidelines },
  { id: 'print', label: 'Print', icon: Icons.print, onClick: handlers.onPrint },
  { id: 'submit', label: 'Submit Orders', icon: Icons.submit, onClick: handlers.onSubmit, variant: 'primary', badge: handlers.orderCount },
];

export const createImagingOrderActions = (handlers: {
  onBack?: () => void;
  onSubmit?: () => void;
  onPrint?: () => void;
  onGuidelines?: () => void;
  orderCount?: number;
}): QuickAction[] => [
  { id: 'back', label: 'Back to Summary', icon: Icons.back, onClick: handlers.onBack, variant: 'back' },
  { id: 'labs', label: 'Labs', icon: Icons.lab, href: '/labs', variant: 'primary' },
  { id: 'meds', label: 'Medications', icon: Icons.medication, href: '/medications', variant: 'primary' },
  { id: 'referrals', label: 'Referrals', icon: Icons.referral, href: '/referrals', variant: 'primary' },
  { id: 'guidelines', label: 'ACR Guidelines', icon: Icons.guidelines, onClick: handlers.onGuidelines },
  { id: 'print', label: 'Print', icon: Icons.print, onClick: handlers.onPrint },
  { id: 'submit', label: 'Submit Orders', icon: Icons.submit, onClick: handlers.onSubmit, variant: 'primary', badge: handlers.orderCount },
];

export const createMedicationOrderActions = (handlers: {
  onBack?: () => void;
  onSubmit?: () => void;
  onPrint?: () => void;
  onInteractionCheck?: () => void;
  orderCount?: number;
}): QuickAction[] => [
  { id: 'back', label: 'Back to Summary', icon: Icons.back, onClick: handlers.onBack, variant: 'back' },
  { id: 'labs', label: 'Labs', icon: Icons.lab, href: '/labs', variant: 'primary' },
  { id: 'imaging', label: 'Imaging', icon: Icons.imaging, href: '/imaging', variant: 'primary' },
  { id: 'referrals', label: 'Referrals', icon: Icons.referral, href: '/referrals', variant: 'primary' },
  { id: 'interactions', label: 'Check Interactions', icon: Icons.guidelines, onClick: handlers.onInteractionCheck },
  { id: 'print', label: 'Print', icon: Icons.print, onClick: handlers.onPrint },
  { id: 'submit', label: 'Submit Prescriptions', icon: Icons.submit, onClick: handlers.onSubmit, variant: 'primary', badge: handlers.orderCount },
];

export default QuickActionsBar;
