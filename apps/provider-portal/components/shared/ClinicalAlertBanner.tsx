// ClinicalAlertBanner.tsx
// Clinical decision support alert banner
// apps/provider-portal/components/shared/ClinicalAlertBanner.tsx
//
// Updated to use @attending/ui-primitives design tokens

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

// Alert styles using design tokens
const alertStyles = {
  critical: {
    container: 'bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300',
    icon: 'text-red-600',
    title: 'text-red-900',
    message: 'text-red-700',
    button: 'bg-red-600 hover:bg-red-700 text-white',
    animation: 'animate-critical-pulse',
  },
  warning: {
    container: 'bg-gradient-to-r from-amber-50 to-yellow-100 border-2 border-amber-300',
    icon: 'text-amber-600',
    title: 'text-amber-900',
    message: 'text-amber-700',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
    animation: '',
  },
  info: {
    container: 'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300',
    icon: 'text-blue-600',
    title: 'text-blue-900',
    message: 'text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    animation: '',
  },
};

// Icon mapping by type
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
  // Filter to show only unacknowledged alerts, limited to maxVisible
  const visibleAlerts = alerts
    .filter(a => !a.acknowledged)
    .slice(0, maxVisible);

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
            className={cn(
              'rounded-xl p-4 flex items-start gap-3 animate-slide-down',
              styles.container,
              styles.animation
            )}
            role="alert"
          >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <Icon className={cn('w-6 h-6', styles.icon)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className={cn('font-semibold text-base', styles.title)}>
                {alert.type === 'critical' && '⚠️ '}
                {alert.title}
              </h4>
              <p className={cn('text-sm mt-1', styles.message)}>{alert.message}</p>

              {/* Action button */}
              {alert.action && alert.actionLabel && (
                <button
                  onClick={() => onAction?.(alert.id, alert.action!)}
                  className={cn(
                    'mt-3 px-4 py-2 rounded-lg text-sm font-medium',
                    'inline-flex items-center gap-2 transition-all duration-200',
                    'hover:-translate-y-0.5 hover:shadow-md',
                    styles.button
                  )}
                >
                  {alert.actionLabel}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dismiss/Acknowledge buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {onAcknowledge && (
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
                  title="Acknowledge"
                >
                  <Bell className="w-4 h-4" />
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Show more indicator */}
      {remainingCount > 0 && (
        <div className="text-center">
          <button className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
            +{remainingCount} more alert{remainingCount > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
};

// Simplified Critical Alert Banner for quick use
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
  actionLabel = 'View Emergency Protocol',
  onAction,
  onDismiss,
  className = '',
}) => {
  const styles = alertStyles.critical;

  return (
    <div
      className={cn(
        'rounded-xl p-4 flex items-start gap-3 animate-slide-down',
        styles.container,
        styles.animation,
        className
      )}
      role="alert"
    >
      <AlertTriangle className={cn('w-6 h-6 flex-shrink-0 mt-0.5', styles.icon)} />
      <div className="flex-1">
        <h4 className={cn('font-semibold text-base', styles.title)}>⚠️ {title}</h4>
        <p className={cn('text-sm mt-1', styles.message)}>{message}</p>
        {onAction && (
          <button
            onClick={onAction}
            className={cn(
              'mt-3 px-4 py-2 rounded-lg text-sm font-medium',
              'inline-flex items-center gap-2 transition-all duration-200',
              'hover:-translate-y-0.5 hover:shadow-md',
              styles.button
            )}
          >
            {actionLabel}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-white/50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default ClinicalAlertBanner;
