// ============================================================
// Enhanced Card & Clinical Card Components - @attending/shared
// apps/shared/components/ui/Card.tsx
// ============================================================

import * as React from 'react';
// eslint-disable-next-line no-restricted-imports
import { cn } from '../../lib/utils';
import { GRADIENTS, StatusValue } from './Button';

// ============================================================
// CARD COMPONENT (Enhanced with glass effect)
// ============================================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card variant */
  variant?: 'default' | 'bordered' | 'elevated' | 'glass';
  /** Remove default padding */
  noPadding?: boolean;
  /** Enable hover effects */
  hoverable?: boolean;
  /** Urgency border (left accent) */
  urgency?: 'none' | 'routine' | 'moderate' | 'urgent' | 'critical';
}

const variantStyles: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'bg-white border border-gray-200 shadow-sm',
  bordered: 'bg-white border-2 border-gray-200',
  elevated: 'bg-white shadow-lg border-0',
  glass: 'bg-white/95 backdrop-blur-md border border-purple-100/50 shadow-md',
};

const urgencyBorderStyles: Record<NonNullable<CardProps['urgency']>, string> = {
  none: '',
  routine: 'border-l-4 border-l-green-500',
  moderate: 'border-l-4 border-l-yellow-500',
  urgent: 'border-l-4 border-l-orange-500',
  critical: 'border-l-4 border-l-red-500',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', noPadding, hoverable, urgency = 'none', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl transition-all duration-200',
        variantStyles[variant],
        urgencyBorderStyles[urgency],
        hoverable && 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-purple-200',
        !noPadding && 'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = 'Card';

// ============================================================
// CARD HEADER
// ============================================================

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  /** Gradient text for title */
  gradientTitle?: boolean;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, icon, actions, gradientTitle, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-start justify-between mb-4', className)}
      {...props}
    >
      {(title || subtitle || icon) ? (
        <>
          <div className="flex items-start gap-3">
            {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
            <div>
              {title && (
                <h3
                  className={cn(
                    'text-lg font-semibold',
                    gradientTitle ? 'bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent' : 'text-gray-900'
                  )}
                >
                  {title}
                </h3>
              )}
              {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex-shrink-0 ml-4">{actions}</div>}
        </>
      ) : children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

// ============================================================
// CARD CONTENT
// ============================================================

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';

// ============================================================
// CARD FOOTER
// ============================================================

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mt-4 pt-4 border-t border-gray-200 flex items-center justify-end gap-3', className)}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';

// ============================================================
// CLINICAL CARD (Specialized for clinical data)
// ============================================================

export interface ClinicalCardProps extends Omit<CardProps, 'urgency'> {
  /** Card urgency/priority */
  urgency?: 'routine' | 'moderate' | 'urgent' | 'critical';
  /** Show pulsing animation for critical */
  pulse?: boolean;
  /** Collapsible content */
  collapsible?: boolean;
  /** Collapsed state (controlled) */
  collapsed?: boolean;
  /** Toggle collapse callback */
  onToggleCollapse?: () => void;
  /** Header content */
  header: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
}

export const ClinicalCard: React.FC<ClinicalCardProps> = ({
  urgency = 'routine',
  pulse,
  collapsible,
  collapsed,
  onToggleCollapse,
  header,
  footer,
  children,
  className,
  ...props
}) => {
  const [internalCollapsed, setInternalCollapsed] = React.useState(false);
  const isCollapsed = collapsed ?? internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  return (
    <Card
      urgency={urgency}
      className={cn(
        pulse && urgency === 'critical' && 'animate-pulse-urgent',
        className
      )}
      noPadding
      {...props}
    >
      {/* Header */}
      <div
        className={cn(
          'px-6 py-4',
          collapsible && 'cursor-pointer hover:bg-gray-50 transition-colors',
          !isCollapsed && 'border-b border-gray-100'
        )}
        onClick={collapsible ? handleToggle : undefined}
      >
        <div className="flex items-center justify-between">
          {header}
          {collapsible && (
            <button className="ml-4 p-1 rounded hover:bg-gray-100 transition-colors">
              <svg
                className={cn('w-5 h-5 text-gray-400 transition-transform', isCollapsed && '-rotate-90')}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-6 py-4">
          {children}
        </div>
      )}

      {/* Footer */}
      {footer && !isCollapsed && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          {footer}
        </div>
      )}
    </Card>
  );
};

// ============================================================
// FINDING CARD (For clinical findings ✓/✗/? pattern)
// ============================================================

export type FindingStatus = StatusValue;

export interface FindingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  finding: string;
  status: FindingStatus;
  onStatusChange: (status: FindingStatus) => void;
  isRedFlag?: boolean;
  isWarning?: boolean;
  disabled?: boolean;
}

const statusButtonConfig: Record<FindingStatus, { symbol: string; activeClass: string }> = {
  present: { symbol: '✓', activeClass: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md' },
  absent: { symbol: '✗', activeClass: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md' },
  unknown: { symbol: '?', activeClass: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md' },
};

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  status,
  onStatusChange,
  isRedFlag,
  isWarning,
  disabled,
  className,
  ...props
}) => {
  const bgColor = isRedFlag ? 'bg-red-50 border-red-200' 
    : isWarning ? 'bg-yellow-50 border-yellow-200' 
    : 'bg-gray-50 border-gray-200';

  return (
    <div
      className={cn(
        'flex justify-between items-center p-3 border-2 rounded-xl transition-all',
        bgColor,
        'hover:shadow-md',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        {isRedFlag && <span className="text-red-500">⚠️</span>}
        {isWarning && !isRedFlag && <span className="text-yellow-500">⚡</span>}
        {finding}
      </div>
      <div className="flex gap-1">
        {(['present', 'absent', 'unknown'] as FindingStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            disabled={disabled}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1',
              status === s ? statusButtonConfig[s].activeClass : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {statusButtonConfig[s].symbol}
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// DIAGNOSIS CARD (Differential diagnosis card from HTML)
// ============================================================

export interface DiagnosisCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  confidence: number;
  rank?: number;
  findings?: Array<{ name: string; status: FindingStatus; isRedFlag?: boolean }>;
  onFindingStatusChange?: (findingIndex: number, status: FindingStatus) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({
  name,
  confidence,
  rank,
  findings = [],
  onFindingStatusChange,
  collapsed = false,
  onToggleCollapse,
  className,
  ...props
}) => {
  const confidenceColor = confidence >= 80 ? 'text-green-600' 
    : confidence >= 60 ? 'text-yellow-600' 
    : 'text-orange-600';

  return (
    <Card variant="bordered" noPadding className={cn('overflow-hidden', className)} {...props}>
      {/* Header */}
      <div
        className="px-4 py-3 bg-gradient-to-r from-purple-50 to-white cursor-pointer hover:from-purple-100 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {rank && (
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: GRADIENTS.brand }}
              >
                {rank}
              </span>
            )}
            <h4 className="font-semibold text-gray-900">{name}</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn('text-sm font-semibold', confidenceColor)}>
              {Math.round(confidence)}%
            </span>
            <svg
              className={cn('w-5 h-5 text-gray-400 transition-transform', collapsed && '-rotate-90')}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {/* Confidence bar */}
        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 rounded-full"
            style={{
              width: `${confidence}%`,
              background: confidence >= 80 ? '#10b981' : confidence >= 60 ? '#f59e0b' : '#f97316',
            }}
          />
        </div>
      </div>

      {/* Findings */}
      {!collapsed && findings.length > 0 && (
        <div className="px-4 py-3 space-y-2 border-t border-gray-100">
          {findings.map((finding, idx) => (
            <FindingCard
              key={idx}
              finding={finding.name}
              status={finding.status}
              isRedFlag={finding.isRedFlag}
              onStatusChange={(status) => onFindingStatusChange?.(idx, status)}
            />
          ))}
        </div>
      )}
    </Card>
  );
};

export default Card;
