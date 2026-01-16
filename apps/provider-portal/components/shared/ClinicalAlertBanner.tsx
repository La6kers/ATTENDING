// ClinicalAlertBanner.tsx
// Clinical decision support alert banner - HTML Prototype Style
// apps/provider-portal/components/shared/ClinicalAlertBanner.tsx

import React from 'react';
import { AlertTriangle, X, ChevronRight, Bell, Info, AlertCircle } from 'lucide-react';

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
    <div className={`space-y-3 ${className}`}>
      {visibleAlerts.map((alert) => {
        const Icon = alertIcons[alert.type];
        const isCritical = alert.type === 'critical';
        const isWarning = alert.type === 'warning';

        return (
          <div
            key={alert.id}
            className={`clinical-alert ${alert.type}`}
            role="alert"
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              <Icon className={`w-6 h-6 ${
                isCritical ? 'text-red-600' : 
                isWarning ? 'text-amber-600' : 'text-blue-600'
              }`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4>
                {isCritical && '⚠️ '}
                {alert.title}
              </h4>
              <p>{alert.message}</p>

              {/* Action button */}
              {alert.action && alert.actionLabel && (
                <button
                  onClick={() => onAction?.(alert.id, alert.action!)}
                >
                  {alert.actionLabel}
                  <ChevronRight className="w-4 h-4 inline ml-2" />
                </button>
              )}
            </div>

            {/* Dismiss/Acknowledge buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {onAcknowledge && (
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
                  title="Acknowledge"
                >
                  <Bell className="w-4 h-4" />
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
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
          <button className="text-sm text-gray-500 hover:text-gray-700">
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
  return (
    <div className={`clinical-alert critical ${className}`} role="alert">
      <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
      <div className="flex-1">
        <h4>⚠️ {title}</h4>
        <p>{message}</p>
        {onAction && (
          <button onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-white/50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default ClinicalAlertBanner;
