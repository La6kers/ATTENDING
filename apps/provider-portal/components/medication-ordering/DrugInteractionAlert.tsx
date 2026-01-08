// ============================================================
// Drug Interaction Alert Component
// components/medication-ordering/DrugInteractionAlert.tsx
//
// Displays drug-drug interactions with severity levels
// ============================================================

import React from 'react';
import { AlertTriangle, ShieldAlert, Info, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { DrugInteraction } from '../../store/medicationOrderingStore';

interface DrugInteractionAlertProps {
  interactions: DrugInteraction[];
  onDismiss?: (id: string) => void;
}

const severityConfig = {
  contraindicated: {
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-300',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
    textColor: 'text-red-800',
    badge: 'bg-red-600 text-white',
    label: 'CONTRAINDICATED',
  },
  major: {
    icon: ShieldAlert,
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    iconColor: 'text-orange-600',
    titleColor: 'text-orange-900',
    textColor: 'text-orange-800',
    badge: 'bg-orange-600 text-white',
    label: 'MAJOR',
  },
  moderate: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-900',
    textColor: 'text-yellow-800',
    badge: 'bg-yellow-500 text-white',
    label: 'MODERATE',
  },
  minor: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    textColor: 'text-blue-800',
    badge: 'bg-blue-500 text-white',
    label: 'MINOR',
  },
};

export const DrugInteractionAlert: React.FC<DrugInteractionAlertProps> = ({
  interactions,
  onDismiss,
}) => {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (interactions.length === 0) {
    return null;
  }

  // Sort by severity
  const sortedInteractions = [...interactions].sort((a, b) => {
    const order = { contraindicated: 0, major: 1, moderate: 2, minor: 3 };
    return order[a.severity] - order[b.severity];
  });

  const hasContraindicated = interactions.some((i) => i.severity === 'contraindicated');
  const hasMajor = interactions.some((i) => i.severity === 'major');

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className={`p-4 ${
          hasContraindicated
            ? 'bg-red-600'
            : hasMajor
            ? 'bg-orange-500'
            : 'bg-yellow-500'
        } text-white`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">
              Drug Interactions Detected ({interactions.length})
            </h3>
            <p className="text-sm opacity-90">
              {hasContraindicated
                ? 'CRITICAL: Contraindicated combination detected'
                : hasMajor
                ? 'Review major interactions before prescribing'
                : 'Minor interactions - monitor as needed'}
            </p>
          </div>
        </div>
      </div>

      {/* Interactions List */}
      <div className="p-4 space-y-3">
        {sortedInteractions.map((interaction) => {
          const config = severityConfig[interaction.severity];
          const Icon = config.icon;
          const isExpanded = expandedIds.has(interaction.id);

          return (
            <div
              key={interaction.id}
              className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}
            >
              <button
                onClick={() => toggleExpanded(interaction.id)}
                className="w-full p-3 flex items-start gap-3 text-left"
              >
                <Icon className={`w-5 h-5 ${config.iconColor} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`font-semibold ${config.titleColor}`}>
                      {interaction.drug1} ↔ {interaction.drug2}
                    </h4>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${config.badge}`}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className={`text-sm ${config.textColor} mt-1`}>
                    {interaction.description}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className={`w-5 h-5 ${config.iconColor}`} />
                  ) : (
                    <ChevronDown className={`w-5 h-5 ${config.iconColor}`} />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className={`px-3 pb-3 border-t ${config.border}`}>
                  <div className="pt-3 space-y-2">
                    <div>
                      <h5 className={`text-xs font-semibold ${config.titleColor} uppercase`}>
                        Clinical Effect
                      </h5>
                      <p className={`text-sm ${config.textColor}`}>
                        {interaction.clinicalEffect}
                      </p>
                    </div>
                    <div>
                      <h5 className={`text-xs font-semibold ${config.titleColor} uppercase`}>
                        Management
                      </h5>
                      <p className={`text-sm ${config.textColor}`}>
                        {interaction.management}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action for contraindicated */}
      {hasContraindicated && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-800 font-medium text-center">
            ⚠️ Prescribing contraindicated combinations may cause serious harm.
            Consider alternative medications.
          </p>
        </div>
      )}
    </div>
  );
};

export default DrugInteractionAlert;
