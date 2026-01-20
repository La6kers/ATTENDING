// ============================================================
// ATTENDING AI - Emergency Alert Banner
// apps/provider-portal/components/emergency/EmergencyAlertBanner.tsx
//
// Revolutionary Feature: Real-time emergency alerts with
// audio notifications and quick acknowledgment
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  User,
  ChevronRight,
  X,
  Bell,
  BellOff,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

// Types
export interface EmergencyAlert {
  id: string;
  patientId: string;
  patientName: string;
  sessionId: string;
  type: string;
  urgencyLevel: 'critical' | 'emergent' | 'urgent';
  symptoms: string[];
  redFlags: string[];
  location?: { lat: number; lng: number };
  timestamp: Date;
  requiresAcknowledgment: boolean;
  audioAlert: boolean;
}

interface EmergencyAlertBannerProps {
  alerts: EmergencyAlert[];
  onAcknowledge: (alertId: string) => void;
  onViewPatient: (patientId: string, sessionId: string) => void;
  onDismiss?: (alertId: string) => void;
  audioEnabled?: boolean;
  onAudioToggle?: () => void;
  maxVisible?: number;
}

// Urgency configurations
const urgencyConfig = {
  critical: {
    bgColor: 'bg-red-600',
    borderColor: 'border-red-700',
    textColor: 'text-white',
    iconBg: 'bg-red-700',
    pulseColor: 'bg-red-500',
    label: 'CRITICAL',
    description: 'Life-threatening emergency',
  },
  emergent: {
    bgColor: 'bg-orange-500',
    borderColor: 'border-orange-600',
    textColor: 'text-white',
    iconBg: 'bg-orange-600',
    pulseColor: 'bg-orange-400',
    label: 'EMERGENT',
    description: 'Requires immediate attention',
  },
  urgent: {
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-600',
    textColor: 'text-white',
    iconBg: 'bg-amber-600',
    pulseColor: 'bg-amber-400',
    label: 'URGENT',
    description: 'Time-sensitive concern',
  },
};

// Single alert card component
function AlertCard({
  alert,
  onAcknowledge,
  onViewPatient,
  onDismiss,
  isExpanded,
  onToggleExpand,
}: {
  alert: EmergencyAlert;
  onAcknowledge: (alertId: string) => void;
  onViewPatient: (patientId: string, sessionId: string) => void;
  onDismiss?: (alertId: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const config = urgencyConfig[alert.urgencyLevel];
  const timeAgo = getTimeAgo(new Date(alert.timestamp));

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        rounded-lg shadow-lg overflow-hidden border-2
        transition-all duration-300 ease-in-out
        ${isExpanded ? 'ring-2 ring-white/50' : ''}
      `}
    >
      {/* Header - Always visible */}
      <div
        className="px-4 py-3 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Pulsing icon */}
            <div className="relative">
              <div className={`p-2 rounded-lg ${config.iconBg}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className={`absolute inset-0 rounded-lg ${config.pulseColor} animate-ping opacity-75`} />
            </div>

            {/* Alert info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">{config.label}</span>
                <span className="text-xs opacity-75">• {timeAgo}</span>
              </div>
              <p className="font-semibold">{alert.patientName}</p>
              <p className="text-sm opacity-90">{alert.type}</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <ChevronRight
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
            {onDismiss && !alert.requiresAcknowledgment && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(alert.id);
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/20 pt-3">
          {/* Red flags */}
          {alert.redFlags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase opacity-75 mb-1">Red Flags</h4>
              <div className="flex flex-wrap gap-1">
                {alert.redFlags.map((flag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Symptoms */}
          {alert.symptoms.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase opacity-75 mb-1">Symptoms</h4>
              <p className="text-sm">{alert.symptoms.join(', ')}</p>
            </div>
          )}

          {/* Location */}
          {alert.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" />
              <a
                href={`https://maps.google.com/?q=${alert.location.lat},${alert.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                View Location
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(alert.id);
              }}
              className="flex-1 py-2 px-4 bg-white text-gray-900 rounded-lg font-semibold 
                       hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Acknowledge
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewPatient(alert.patientId, alert.sessionId);
              }}
              className="flex-1 py-2 px-4 bg-white/20 rounded-lg font-semibold 
                       hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              View Patient
            </button>
          </div>

          {/* Emergency contact */}
          {alert.urgencyLevel === 'critical' && (
            <a
              href="tel:911"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-2 py-2 px-4 bg-white/10 
                       rounded-lg hover:bg-white/20 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="font-semibold">Call 911</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 120) return '1 min ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 7200) return '1 hour ago';
  return `${Math.floor(seconds / 3600)} hours ago`;
}

// Main component
export function EmergencyAlertBanner({
  alerts,
  onAcknowledge,
  onViewPatient,
  onDismiss,
  audioEnabled = true,
  onAudioToggle,
  maxVisible = 3,
}: EmergencyAlertBannerProps) {
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort alerts by urgency and time
  const sortedAlerts = [...alerts].sort((a, b) => {
    const urgencyOrder = { critical: 0, emergent: 1, urgent: 2 };
    const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
    if (urgencyDiff !== 0) return urgencyDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const visibleAlerts = showAll ? sortedAlerts : sortedAlerts.slice(0, maxVisible);
  const hiddenCount = sortedAlerts.length - maxVisible;

  // Auto-expand first critical alert
  useEffect(() => {
    if (sortedAlerts.length > 0 && !expandedAlertId) {
      const criticalAlert = sortedAlerts.find(a => a.urgencyLevel === 'critical');
      if (criticalAlert) {
        setExpandedAlertId(criticalAlert.id);
      }
    }
  }, [sortedAlerts, expandedAlertId]);

  // Handle acknowledgment
  const handleAcknowledge = useCallback((alertId: string) => {
    onAcknowledge(alertId);
    if (expandedAlertId === alertId) {
      setExpandedAlertId(null);
    }
  }, [onAcknowledge, expandedAlertId]);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 right-0 z-50 p-4 space-y-2"
      role="alert"
      aria-live="assertive"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between bg-gray-900 text-white rounded-lg px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
              {alerts.length}
            </span>
          </div>
          <span className="font-semibold">
            {alerts.length} Active Emergency {alerts.length === 1 ? 'Alert' : 'Alerts'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          {onAudioToggle && (
            <button
              onClick={onAudioToggle}
              className={`p-2 rounded-lg transition-colors ${
                audioEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title={audioEnabled ? 'Audio alerts enabled' : 'Audio alerts disabled'}
            >
              {audioEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
          )}

          {/* Show all toggle */}
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              {showAll ? 'Show less' : `+${hiddenCount} more`}
            </button>
          )}
        </div>
      </div>

      {/* Alert cards */}
      <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        {visibleAlerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onAcknowledge={handleAcknowledge}
            onViewPatient={onViewPatient}
            onDismiss={onDismiss}
            isExpanded={expandedAlertId === alert.id}
            onToggleExpand={() => setExpandedAlertId(
              expandedAlertId === alert.id ? null : alert.id
            )}
          />
        ))}
      </div>

      {/* Keyboard shortcut hint */}
      <div className="text-center text-xs text-gray-400">
        Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">A</kbd> to acknowledge first alert
      </div>
    </div>
  );
}

export default EmergencyAlertBanner;
