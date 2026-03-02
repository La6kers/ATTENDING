// ============================================================
// Medication Card Component
// components/medication-ordering/MedicationCard.tsx
//
// Displays individual medication with selection, dosing options, and warnings
// ============================================================

import React from 'react';
import { Brain, AlertTriangle, ShieldAlert, Pill, DollarSign } from 'lucide-react';
import type { Medication, SelectedMedication, PrescriptionPriority, DrugSchedule } from '../../store/medicationOrderingStore';

interface MedicationCardProps {
  medication: Medication;
  selected: boolean;
  selectedMed?: SelectedMedication;
  showCosts?: boolean;
  aiRationale?: string;
  onToggle: (id: string) => void;
  onPriorityChange?: (id: string, priority: PrescriptionPriority) => void;
  onStrengthChange?: (id: string, strength: string) => void;
}

const priorityStyles: Record<PrescriptionPriority, string> = {
  STAT: 'bg-red-100 text-red-800 border-red-200',
  URGENT: 'bg-orange-100 text-orange-800 border-orange-200',
  ASAP: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ROUTINE: 'bg-blue-100 text-blue-800 border-blue-200',
};

const scheduleStyles: Record<DrugSchedule, { bg: string; text: string; label: string }> = {
  none: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'N/A' },
  OTC: { bg: 'bg-green-100', text: 'text-green-800', label: 'OTC' },
  RX: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Rx' },
  I: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'C-I' },
  II: { bg: 'bg-red-100', text: 'text-red-800', label: 'C-II' },
  III: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'C-III' },
  IV: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'C-IV' },
  V: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'C-V' },
};

export const MedicationCard: React.FC<MedicationCardProps> = ({
  medication,
  selected,
  selectedMed,
  showCosts = true,
  aiRationale,
  onToggle,
  onPriorityChange,
  onStrengthChange,
}) => {
  const currentPriority = selectedMed?.priority || 'ROUTINE';
  const currentStrength = selectedMed?.strength || medication.defaultStrength;
  const scheduleInfo = scheduleStyles[medication.schedule];

  return (
    <div
      className={`bg-white rounded-lg border-2 transition-all ${
        selected ? 'border-teal-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(medication.id)}
            className="mt-1 h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-gray-900">{medication.brandName}</h4>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${scheduleInfo.bg} ${scheduleInfo.text}`}>
                    {scheduleInfo.label}
                  </span>
                  {medication.isControlled && (
                    <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      Controlled
                    </span>
                  )}
                  {selectedMed?.aiRecommended && (
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      AI
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{medication.genericName}</p>
                
                {/* Category & Form Info */}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="capitalize">{medication.category.replace('-', ' ')}</span>
                  <span className="flex items-center gap-1">
                    <Pill className="w-3 h-3" />
                    {medication.dosageForms.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')}
                  </span>
                  {medication.requiresPriorAuth && (
                    <span className="text-amber-600 font-medium">Prior Auth Required</span>
                  )}
                </div>

                {/* Common Indications */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {medication.commonIndications.slice(0, 4).map((ind, idx) => (
                    <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {ind}
                    </span>
                  ))}
                </div>
              </div>

              {/* Priority, Strength & Cost */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {selected && onPriorityChange ? (
                  <select
                    value={currentPriority}
                    onChange={(e) => onPriorityChange(medication.id, e.target.value as PrescriptionPriority)}
                    className={`text-xs font-medium rounded-full px-2 py-1 border cursor-pointer ${priorityStyles[currentPriority]}`}
                  >
                    <option value="STAT">STAT</option>
                    <option value="URGENT">URGENT</option>
                    <option value="ROUTINE">Routine</option>
                  </select>
                ) : null}
                
                {selected && onStrengthChange && medication.strengths.length > 1 ? (
                  <select
                    value={currentStrength}
                    onChange={(e) => onStrengthChange(medication.id, e.target.value)}
                    className="text-xs font-medium rounded px-2 py-1 border border-gray-300 cursor-pointer"
                  >
                    {medication.strengths.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-medium text-gray-700">{medication.defaultStrength}</span>
                )}

                {showCosts && (
                  <div className="text-right">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {medication.cost.generic}
                    </span>
                    {medication.cost.brand !== medication.cost.generic && (
                      <span className="text-xs text-gray-400">Brand: ${medication.cost.brand}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Black Box Warning */}
            {medication.blackBoxWarning && (
              <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-900">
                  <span className="font-semibold">⚠️ BLACK BOX WARNING:</span> {medication.blackBoxWarning}
                </div>
              </div>
            )}

            {/* AI Rationale */}
            {aiRationale && (
              <div className="mt-3 flex items-start gap-2 bg-teal-50 p-3 rounded-lg">
                <Brain className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-teal-900">
                  <span className="font-semibold">AI Rationale:</span> {aiRationale}
                </div>
              </div>
            )}

            {/* Pregnancy Category & Contraindications */}
            {(medication.pregnancyCategory || medication.contraindications.length > 0) && selected && (
              <div className="mt-2 text-xs text-gray-500">
                {medication.pregnancyCategory && (
                  <span className="mr-4">Pregnancy: {medication.pregnancyCategory}</span>
                )}
                {medication.contraindications.length > 0 && (
                  <span>Contraindications: {medication.contraindications.slice(0, 2).join(', ')}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicationCard;
