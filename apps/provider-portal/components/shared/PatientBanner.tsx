// PatientBanner.tsx
// Unified patient context banner for all ordering pages - HTML Prototype Style
// apps/provider-portal/components/shared/PatientBanner.tsx

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  FileText,
  ChevronUp,
  ChevronDown,
  Activity,
} from 'lucide-react';

export interface PatientContext {
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
  weight?: number;
  creatinine?: number;
  gfr?: number;
  pregnant?: boolean;
  insurancePlan?: string;
  assessmentId?: string;
}

export interface PatientBannerProps {
  patient: PatientContext;
  showActions?: boolean;
  showRedFlags?: boolean;
  showSafetyInfo?: boolean;
  onToggleAll?: () => void;
  allCollapsed?: boolean;
  accentColor?: 'purple' | 'blue' | 'green' | 'indigo';
  className?: string;
}

const accentBorders = {
  purple: 'border-l-purple-500',
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  indigo: 'border-l-indigo-500',
};

const avatarGradients = {
  purple: 'from-purple-500 to-indigo-600',
  blue: 'from-blue-500 to-indigo-600',
  green: 'from-green-500 to-teal-600',
  indigo: 'from-indigo-500 to-purple-600',
};

const PatientBanner: React.FC<PatientBannerProps> = ({
  patient,
  showActions = true,
  showRedFlags = true,
  showSafetyInfo = false,
  onToggleAll,
  allCollapsed = false,
  accentColor = 'purple',
  className = '',
}) => {
  // Generate initials from name
  const initials = patient.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const hasRedFlags = showRedFlags && patient.redFlags && patient.redFlags.length > 0;

  // Build assessment link - the main patient view that exists
  const getAssessmentLink = () => {
    if (patient.assessmentId) {
      return `/assessments/${patient.assessmentId}`;
    }
    return `/assessments?patientId=${patient.id}`;
  };

  return (
    <div
      className={`patient-bar border-l-4 ${accentBorders[accentColor]} ${
        hasRedFlags ? 'animate-pulse-banner' : ''
      } ${className}`}
    >
      {/* Patient Info Section */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Avatar - HTML prototype style */}
        <div
          className={`patient-avatar bg-gradient-to-br ${avatarGradients[accentColor]}`}
        >
          {initials}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="patient-details">
            <h2>{patient.name}</h2>
          </div>
          <div className="patient-meta flex items-center flex-wrap gap-2">
            <span>{patient.age} y/o {patient.gender}</span>
            <span>•</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
              MRN: {patient.mrn}
            </span>
            {patient.insurancePlan && (
              <>
                <span>•</span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  {patient.insurancePlan}
                </span>
              </>
            )}
          </div>

          {/* Chief Complaint */}
          <p className="text-sm text-gray-700 mt-1">
            <strong className="text-gray-500">Chief Complaint:</strong>{' '}
            &ldquo;{patient.chiefComplaint}&rdquo;
          </p>

          {/* Red Flags - HTML prototype style */}
          {hasRedFlags && (
            <div className="flex items-center gap-2 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700 font-medium">
                Red Flags: {patient.redFlags!.join(' • ')}
              </span>
            </div>
          )}

          {/* Safety Info (for imaging/contrast) */}
          {showSafetyInfo && (
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
              {patient.weight && (
                <span className="bg-gray-50 px-2 py-1 rounded">
                  Weight: {patient.weight} kg
                </span>
              )}
              {patient.creatinine && (
                <span className="bg-gray-50 px-2 py-1 rounded">
                  Creatinine: {patient.creatinine} mg/dL
                </span>
              )}
              {patient.gfr && (
                <span className={`px-2 py-1 rounded ${
                  patient.gfr < 30 
                    ? 'bg-red-50 text-red-700 font-medium' 
                    : 'bg-gray-50'
                }`}>
                  GFR: {patient.gfr}
                </span>
              )}
              {patient.allergies && patient.allergies.length > 0 && (
                <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded">
                  ⚠️ Allergies: {patient.allergies.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - HTML prototype style */}
      {showActions && (
        <div className="patient-action-buttons flex items-center gap-2 flex-shrink-0">
          {/* View Assessment - Links to actual assessments page */}
          <Link
            href={getAssessmentLink()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                       text-gray-700 bg-white border-2 border-gray-200 rounded-lg 
                       hover:border-purple-400 hover:bg-purple-50 
                       hover:-translate-y-0.5 hover:shadow-md
                       transition-all duration-200"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden md:inline">View Assessment</span>
          </Link>

          {onToggleAll && (
            <button
              onClick={onToggleAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                         text-gray-700 bg-white border-2 border-gray-200 rounded-lg 
                         hover:border-purple-400 hover:bg-purple-50 
                         hover:-translate-y-0.5 hover:shadow-md
                         transition-all duration-200"
            >
              {allCollapsed ? (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span className="hidden md:inline">Expand All</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span className="hidden md:inline">Collapse All</span>
                </>
              )}
            </button>
          )}

          {/* Treatment Plan - Links to actual treatment-plans page */}
          <Link
            href={`/treatment-plans?patientId=${patient.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                       text-white bg-gradient-to-r from-purple-600 to-indigo-600 
                       rounded-lg hover:-translate-y-0.5 hover:shadow-lg
                       transition-all duration-200"
          >
            <Activity className="w-4 h-4" />
            <span className="hidden md:inline">Treatment Plan</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default PatientBanner;
