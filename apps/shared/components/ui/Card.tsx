// ============================================================
// Card Components - @attending/shared
// apps/shared/components/ui/Card.tsx
//
// Re-exports from @attending/ui-primitives for backward compatibility
// Plus additional specialized clinical cards
// ============================================================

import * as React from 'react';
import { cn } from '../../lib/utils';
import { StatusToggle, type StatusValue, gradients } from '@attending/ui-primitives';

// Re-export core card components from ui-primitives
export {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  type CardProps,
} from '@attending/ui-primitives';

// ============================================================
// CLINICAL CARD (Specialized for clinical data)
// Extended version with more clinical features
// ============================================================

export interface ClinicalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  urgency?: 'routine' | 'moderate' | 'urgent' | 'critical';
  pulse?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  header: React.ReactNode;
  footer?: React.ReactNode;
}

const urgencyBorders: Record<NonNullable<ClinicalCardProps['urgency']>, string> = {
  routine: 'border-l-4 border-l-green-500',
  moderate: 'border-l-4 border-l-yellow-500',
  urgent: 'border-l-4 border-l-orange-500',
  critical: 'border-l-4 border-l-red-500',
};

export const ClinicalCard: React.FC<ClinicalCardProps> = ({
  urgency = 'routine',
  pulse,
  collapsible,
  collapsed: controlledCollapsed,
  onToggleCollapse,
  header,
  footer,
  children,
  className,
  ...props
}) => {
  const [internalCollapsed, setInternalCollapsed] = React.useState(false);
  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-200',
        urgencyBorders[urgency],
        pulse && urgency === 'critical' && 'animate-pulse-urgent',
        className
      )}
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
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && <div className="px-6 py-4">{children}</div>}

      {/* Footer */}
      {footer && !isCollapsed && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">{footer}</div>
      )}
    </div>
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
  const bgColor = isRedFlag
    ? 'bg-red-50 border-red-200'
    : isWarning
    ? 'bg-yellow-50 border-yellow-200'
    : 'bg-gray-50 border-gray-200';

  return (
    <div
      className={cn(
        'flex justify-between items-center p-3 border-2 rounded-xl transition-all hover:shadow-md',
        bgColor,
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        {isRedFlag && <span className="text-red-500">⚠️</span>}
        {isWarning && !isRedFlag && <span className="text-yellow-500">⚡</span>}
        {finding}
      </div>
      <StatusToggle value={status} onChange={onStatusChange} disabled={disabled} />
    </div>
  );
};

// ============================================================
// DIAGNOSIS CARD (Differential diagnosis card)
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
  const confidenceColor =
    confidence >= 80 ? 'text-green-600' : confidence >= 60 ? 'text-yellow-600' : 'text-orange-600';

  const barColor = confidence >= 80 ? '#22c55e' : confidence >= 60 ? '#f59e0b' : '#f97316';

  return (
    <div
      className={cn('bg-white border-2 border-gray-200 rounded-2xl overflow-hidden', className)}
      {...props}
    >
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
                style={{ background: gradients.brand }}
              >
                {rank}
              </span>
            )}
            <h4 className="font-semibold text-gray-900">{name}</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn('text-sm font-semibold', confidenceColor)}>{Math.round(confidence)}%</span>
            <svg
              className={cn('w-5 h-5 text-gray-400 transition-transform', collapsed && '-rotate-90')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {/* Confidence bar */}
        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 rounded-full"
            style={{ width: `${confidence}%`, backgroundColor: barColor }}
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
    </div>
  );
};

export default ClinicalCard;
