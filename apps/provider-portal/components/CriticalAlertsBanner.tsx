/**
 * ATTENDING AI - Critical Alerts Banner
 * 
 * Displays critical lab results and emergency assessments requiring immediate attention.
 */

import React, { useState, useEffect } from 'react';
import { useEmergencyMonitor } from '../lib/api/backend';

interface CriticalAlertsBannerProps {
  onViewCriticalResults?: () => void;
  onViewEmergencies?: () => void;
}

export function CriticalAlertsBanner({ 
  onViewCriticalResults, 
  onViewEmergencies 
}: CriticalAlertsBannerProps) {
  const {
    recentEmergencies,
    recentCriticalResults,
    unreadEmergencyCount,
    unreadCriticalCount,
    totalAlerts,
    hasAlerts,
  } = useEmergencyMonitor();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  // Flash animation when new alerts arrive
  useEffect(() => {
    if (hasAlerts) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [totalAlerts]);

  if (!hasAlerts) {
    return null;
  }

  const hasEmergencies = unreadEmergencyCount > 0;
  const hasCriticalResults = unreadCriticalCount > 0;

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50
        ${hasEmergencies ? 'bg-red-600' : 'bg-orange-500'}
        ${isFlashing ? 'animate-pulse' : ''}
        shadow-lg
      `}
    >
      {/* Main Alert Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Alert Icon */}
            <div className="flex-shrink-0">
              {hasEmergencies ? (
                <svg className="h-6 w-6 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            {/* Alert Message */}
            <div className="text-white">
              <p className="font-semibold">
                {hasEmergencies ? (
                  <>🚨 {unreadEmergencyCount} Emergency Alert{unreadEmergencyCount > 1 ? 's' : ''}</>
                ) : (
                  <>⚠️ {unreadCriticalCount} Critical Result{unreadCriticalCount > 1 ? 's' : ''}</>
                )}
                {hasEmergencies && hasCriticalResults && (
                  <span className="ml-2 text-red-200">
                    + {unreadCriticalCount} critical result{unreadCriticalCount > 1 ? 's' : ''}
                  </span>
                )}
              </p>
              <p className="text-sm text-white/80">
                {hasEmergencies 
                  ? 'Immediate physician attention required'
                  : 'Review critical values immediately'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-white text-sm font-medium transition-colors"
            >
              {isExpanded ? 'Collapse' : 'View Details'}
            </button>
            {hasEmergencies && onViewEmergencies && (
              <button
                onClick={onViewEmergencies}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 rounded text-red-600 text-sm font-semibold transition-colors"
              >
                Go to Emergency Queue
              </button>
            )}
            {hasCriticalResults && !hasEmergencies && onViewCriticalResults && (
              <button
                onClick={onViewCriticalResults}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 rounded text-orange-600 text-sm font-semibold transition-colors"
              >
                Review Results
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-white/20 bg-black/20">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
            {/* Emergency Assessments */}
            {recentEmergencies.length > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  Emergency Assessments
                </h4>
                <div className="space-y-2">
                  {recentEmergencies.slice(0, 5).map((emergency) => (
                    <div
                      key={emergency.assessmentId}
                      className="bg-white/10 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {emergency.patientName} ({emergency.patientMrn})
                        </p>
                        <p className="text-white/80 text-sm">
                          {emergency.chiefComplaint}
                        </p>
                        <p className="text-red-200 text-sm font-medium">
                          {emergency.emergencyReason}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/60 text-xs">
                          {new Date(emergency.detectedAt).toLocaleTimeString()}
                        </p>
                        <div className="flex gap-1 mt-1 flex-wrap justify-end">
                          {emergency.redFlagCategories.slice(0, 3).map((category) => (
                            <span
                              key={category}
                              className="px-2 py-0.5 bg-red-800 text-white text-xs rounded"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Critical Lab Results */}
            {recentCriticalResults.length > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-300 rounded-full"></span>
                  Critical Lab Results
                </h4>
                <div className="space-y-2">
                  {recentCriticalResults.slice(0, 5).map((result) => (
                    <div
                      key={result.labOrderId}
                      className="bg-white/10 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {result.patientName} ({result.patientMrn})
                        </p>
                        <p className="text-white/80 text-sm">
                          {result.testName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-lg">
                          {result.value} {result.unit}
                        </p>
                        {result.referenceRange && (
                          <p className="text-white/60 text-xs">
                            Ref: {result.referenceRange}
                          </p>
                        )}
                        <p className="text-white/60 text-xs">
                          {new Date(result.resultedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CriticalAlertsBanner;
