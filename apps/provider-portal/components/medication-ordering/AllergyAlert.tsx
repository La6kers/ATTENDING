// ============================================================
// Allergy Alert Component
// components/medication-ordering/AllergyAlert.tsx
//
// Displays drug allergy warnings including cross-reactivity
// ============================================================

import React from 'react';
import { AlertTriangle, XCircle, AlertOctagon } from 'lucide-react';
import type { DrugAllergy } from '../../store/medicationOrderingStore';

interface AllergyAlertInfo {
  medication: string;
  allergy: DrugAllergy;
  crossReactivity: boolean;
}

interface AllergyAlertProps {
  allergyAlerts: AllergyAlertInfo[];
  patientAllergies: DrugAllergy[];
  onAcknowledge?: (medication: string) => void;
}

const severityConfig = {
  severe: {
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-300',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
    textColor: 'text-red-800',
    badge: 'bg-red-600 text-white',
  },
  moderate: {
    icon: AlertOctagon,
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    iconColor: 'text-orange-600',
    titleColor: 'text-orange-900',
    textColor: 'text-orange-800',
    badge: 'bg-orange-500 text-white',
  },
  mild: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-900',
    textColor: 'text-yellow-800',
    badge: 'bg-yellow-500 text-white',
  },
};

export const AllergyAlert: React.FC<AllergyAlertProps> = ({
  allergyAlerts,
  patientAllergies,
  onAcknowledge,
}) => {
  // Show patient allergies sidebar
  const showPatientAllergies = patientAllergies.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-red-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">Drug Allergies</h3>
            <p className="text-sm opacity-90">
              {patientAllergies.length} documented {patientAllergies.length === 1 ? 'allergy' : 'allergies'}
              {allergyAlerts.length > 0 && ` • ${allergyAlerts.length} active alert${allergyAlerts.length > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Active Allergy Alerts */}
        {allergyAlerts.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4" />
              ACTIVE ALLERGY ALERTS
            </h4>
            <div className="space-y-2">
              {allergyAlerts.map((alert, idx) => {
                const config = severityConfig[alert.allergy.severity];
                const Icon = config.icon;

                return (
                  <div
                    key={`${alert.medication}-${idx}`}
                    className={`rounded-lg border-2 ${config.border} ${config.bg} p-3`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 ${config.iconColor} mt-0.5 flex-shrink-0`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold ${config.titleColor}`}>
                            {alert.medication.charAt(0).toUpperCase() + alert.medication.slice(1)}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${config.badge}`}>
                            {alert.allergy.severity}
                          </span>
                          {alert.crossReactivity && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              Cross-Reactivity
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${config.textColor} mt-1`}>
                          <strong>Allergen:</strong> {alert.allergy.allergen}
                        </p>
                        <p className={`text-sm ${config.textColor}`}>
                          <strong>Reaction:</strong> {alert.allergy.reaction}
                        </p>
                        {alert.crossReactivity && alert.allergy.crossReactivity && (
                          <p className={`text-xs ${config.textColor} mt-1`}>
                            <strong>Related allergens:</strong> {alert.allergy.crossReactivity.join(', ')}
                          </p>
                        )}
                      </div>
                      {onAcknowledge && (
                        <button
                          onClick={() => onAcknowledge(alert.medication)}
                          className={`text-xs px-2 py-1 rounded ${config.border} ${config.textColor} hover:bg-white/50`}
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Patient's Documented Allergies */}
        {showPatientAllergies && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Patient's Documented Allergies
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {patientAllergies.map((allergy, idx) => {
                const config = severityConfig[allergy.severity];

                return (
                  <div
                    key={idx}
                    className={`rounded-lg border ${config.border} ${config.bg} p-2`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${config.titleColor}`}>
                        {allergy.allergen}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded uppercase ${config.badge}`}>
                        {allergy.severity}
                      </span>
                    </div>
                    <p className={`text-xs ${config.textColor} mt-0.5`}>
                      {allergy.reaction}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {patientAllergies.length === 0 && allergyAlerts.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No documented allergies</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllergyAlert;
