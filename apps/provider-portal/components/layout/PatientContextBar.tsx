// =============================================================================
// ATTENDING AI - Patient Context Bar (Compact)
// apps/provider-portal/components/layout/PatientContextBar.tsx
//
// Slim, unified patient context bar that replaces:
// - PatientBanner
// - QuickActionsBar
// - SimpleCriticalAlert
//
// Single line showing patient info with expandable details
// =============================================================================

import React, { useState } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  MoreHorizontal,
  Phone,
  Pill,
  Heart,
  X,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface PatientContextData {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint: string;
  allergies?: string[];
  currentMedications?: string[];
  medicalHistory?: string[];
  redFlags?: string[];
  insurancePlan?: string;
  assessmentId?: string;
  phone?: string;
  dob?: string;
}

interface PatientContextBarProps {
  patient: PatientContextData;
  onBack?: () => void;
  onViewAssessment?: () => void;
  className?: string;
}

// =============================================================================
// Red Flag Badge
// =============================================================================

const RedFlagBadge: React.FC<{
  count: number;
  flags: string[];
  expanded: boolean;
  onToggle: () => void;
}> = ({ count, flags, expanded, onToggle }) => {
  if (count === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`
          flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
          transition-all duration-200
          ${expanded 
            ? 'bg-red-600 text-white' 
            : 'bg-red-100 text-red-700 hover:bg-red-200'
          }
        `}
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>{count} Red Flag{count > 1 ? 's' : ''}</span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Dropdown */}
      {expanded && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-red-200 z-50 overflow-hidden">
          <div className="bg-red-50 px-4 py-2 border-b border-red-200">
            <p className="text-sm font-semibold text-red-800">Critical Red Flags</p>
          </div>
          <ul className="p-2">
            {flags.map((flag, index) => (
              <li
                key={index}
                className="flex items-start gap-2 px-3 py-2 text-sm text-red-700 bg-red-50 rounded-lg mb-1 last:mb-0"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Patient Details Panel (Expandable)
// =============================================================================

const PatientDetailsPanel: React.FC<{
  patient: PatientContextData;
  onClose: () => void;
}> = ({ patient, onClose }) => {
  return (
    <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Patient Details</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chief Complaint */}
          <div className="md:col-span-3 bg-purple-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">
              Chief Complaint
            </p>
            <p className="text-gray-900">&ldquo;{patient.chiefComplaint}&rdquo;</p>
          </div>

          {/* Allergies */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Allergies
              </p>
            </div>
            {patient.allergies && patient.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {patient.allergies.map((allergy, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm"
                  >
                    {allergy}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">NKDA</p>
            )}
          </div>

          {/* Current Medications */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Pill className="w-4 h-4 text-blue-500" />
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Current Medications
              </p>
            </div>
            {patient.currentMedications && patient.currentMedications.length > 0 ? (
              <ul className="space-y-1">
                {patient.currentMedications.slice(0, 4).map((med, i) => (
                  <li key={i} className="text-sm text-gray-700">{med}</li>
                ))}
                {patient.currentMedications.length > 4 && (
                  <li className="text-sm text-gray-500">
                    +{patient.currentMedications.length - 4} more
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">None reported</p>
            )}
          </div>

          {/* Medical History */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-red-500" />
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Medical History
              </p>
            </div>
            {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
              <ul className="space-y-1">
                {patient.medicalHistory.slice(0, 4).map((condition, i) => (
                  <li key={i} className="text-sm text-gray-700">{condition}</li>
                ))}
                {patient.medicalHistory.length > 4 && (
                  <li className="text-sm text-gray-500">
                    +{patient.medicalHistory.length - 4} more
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">None reported</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Actions Menu
// =============================================================================

const ActionsMenu: React.FC<{
  onViewAssessment?: () => void;
}> = ({ onViewAssessment }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            <button
              onClick={() => {
                onViewAssessment?.();
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <FileText className="w-4 h-4" />
              View Full Assessment
            </button>
            <button
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Phone className="w-4 h-4" />
              Contact Patient
            </button>
            <button
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <User className="w-4 h-4" />
              Patient History
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

const PatientContextBar: React.FC<PatientContextBarProps> = ({
  patient,
  onBack,
  onViewAssessment,
  className = '',
}) => {
  const [showRedFlags, setShowRedFlags] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const redFlagCount = patient.redFlags?.length || 0;

  // Generate initials
  const initials = patient.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`relative ${className}`}>
      {/* Main Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 gap-3">
            {/* Back Button */}
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            {/* Divider */}
            {onBack && <div className="h-6 w-px bg-gray-200" />}

            {/* Patient Info - Clickable to expand */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-3 px-2 py-1 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {/* Avatar */}
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {initials}
              </div>

              {/* Name & Details */}
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{patient.name}</span>
                  <span className="text-sm text-gray-500">
                    {patient.age}yo {patient.gender.charAt(0)}
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  MRN: {patient.mrn}
                </span>
              </div>

              {/* Expand Indicator */}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </button>

            {/* Insurance Badge */}
            {patient.insurancePlan && (
              <span className="hidden md:inline-flex px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                {patient.insurancePlan}
              </span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Red Flags */}
            {redFlagCount > 0 && (
              <RedFlagBadge
                count={redFlagCount}
                flags={patient.redFlags || []}
                expanded={showRedFlags}
                onToggle={() => setShowRedFlags(!showRedFlags)}
              />
            )}

            {/* Actions Menu */}
            <ActionsMenu onViewAssessment={onViewAssessment} />
          </div>
        </div>
      </div>

      {/* Close red flags dropdown when clicking outside */}
      {showRedFlags && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowRedFlags(false)}
        />
      )}

      {/* Patient Details Panel */}
      {showDetails && (
        <PatientDetailsPanel
          patient={patient}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  );
};

export default PatientContextBar;
