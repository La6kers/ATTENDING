// ClinicalAlertBanner.tsx
// Clinical decision support alert banner - click anywhere to dismiss
// apps/provider-portal/components/shared/ClinicalAlertBanner.tsx

import React from 'react';
import { AlertTriangle, X, ChevronRight, Bell, Info, AlertCircle } from 'lucide-react';
import { cn } from '@attending/ui-primitives';

export interface ClinicalAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action?: string;
  actionLabel?: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface ClinicalAlertBannerProps {
  alerts: ClinicalAlert[];
  onAction?: (alertId: string, action: string) => void;
  onDismiss?: (alertId: string) => void;
  onAcknowledge?: (alertId: string) => void;
  maxVisible?: number;
  className?: string;
}

const alertStyles = {
  critical: {
    container: 'bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300',
    icon: 'text-red-600',
    title: 'text-red-900',
    message: 'text-red-700',
    button: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    container: 'bg-gradient-to-r from-amber-50 to-yellow-100 border-2 border-amber-300',
    icon: 'text-amber-600',
    title: 'text-amber-900',
    message: 'text-amber-700',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    container: 'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300',
    icon: 'text-blue-600',
    title: 'text-blue-900',
    message: 'text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
};

const alertIcons = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

const ClinicalAlertBanner: React.FC<ClinicalAlertBannerProps> = ({
  alerts,
  onAction,
  onDismiss,
  onAcknowledge,
  maxVisible = 3,
  className = '',
}) => {
  const visibleAlerts = alerts.filter(a => !a.acknowledged).slice(0, maxVisible);
  if (visibleAlerts.length === 0) return null;

  const remainingCount = alerts.filter(a => !a.acknowledged).length - visibleAlerts.length;

  return (
    <div className={cn('space-y-3', className)}>
      {visibleAlerts.map((alert) => {
        const Icon = alertIcons[alert.type];
        const styles = alertStyles[alert.type];

        return (
          <div
            key={alert.id}
            onClick={() => onDismiss?.(alert.id)}
            className={cn(
              'rounded-xl p-4 flex items-start gap-3 cursor-pointer',
              'transition-all hover:opacity-90 active:scale-[0.99]',
              styles.container
            )}
            role="alert"
            title="Click anywhere to dismiss"
          >
            <Icon className={cn('w-6 h-6 flex-shrink-0 mt-0.5', styles.icon)} />
            <div className="flex-1 min-w-0">
              <h4 className={cn('font-semibold', styles.title)}>
                {alert.type === 'critical' && '⚠️ '}
                {alert.title}
              </h4>
              <p className={cn('text-sm mt-1', styles.message)}>{alert.message}</p>
              {alert.action && alert.actionLabel && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.(alert.id, alert.action!);
                  }}
                  className={cn(
                    'mt-3 px-4 py-2 rounded-lg text-sm font-medium',
                    'inline-flex items-center gap-2 transition-colors',
                    styles.button
                  )}
                >
                  {alert.actionLabel}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
            <X className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        );
      })}

      {remainingCount > 0 && (
        <p className="text-center text-sm text-gray-500">
          +{remainingCount} more alert{remainingCount > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

// SimpleCriticalAlert - Click anywhere to dismiss
export interface SimpleCriticalAlertProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const SimpleCriticalAlert: React.FC<SimpleCriticalAlertProps> = ({
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
  className = '',
}) => (
  <div
    onClick={onDismiss}
    className={cn(
      'rounded-xl p-4 flex items-start gap-3 cursor-pointer',
      'bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300',
      'transition-all hover:opacity-90 active:scale-[0.99]',
      className
    )}
    role="alert"
    title="Click anywhere to dismiss"
  >
    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <h4 className="font-semibold text-red-900">⚠️ {title}</h4>
      <p className="text-sm mt-1 text-red-700">{message}</p>
      {onAction && actionLabel && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-2"
        >
          {actionLabel}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
    <X className="w-5 h-5 text-red-400 flex-shrink-0" />
  </div>
);

export default ClinicalAlertBanner;
