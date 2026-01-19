// PatientBanner.tsx
// Unified patient context banner for all ordering pages
// apps/provider-portal/components/shared/PatientBanner.tsx
//
// Updated to use @attending/ui-primitives design tokens

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  FileText,
  ChevronUp,
  ChevronDown,
  Activity,
} from 'lucide-react';
import { gradients, cn } from '@attending/ui-primitives';

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

// Use gradients from ui-primitives
const accentGradients: Record<string, string> = {
  purple: gradients.brand,
  blue: gradients.labs,
  green: gradients.referrals,
  indigo: gradients.imaging,
};

const accentBorders: Record<string, string> = {
  purple: 'border-l-purple-500',
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  indigo: 'border-l-indigo-500',
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

  // Build assessment link
  const getAssessmentLink = () => {
    if (patient.assessmentId) {
      return `/assessments/${patient.assessmentId}`;
    }
    return `/assessments?patientId=${patient.id}`;
  };

  return (
    <div
      className={cn(
        // Base styles using design tokens pattern
        'rounded-2xl p-5 shadow-md border-l-4',
        'bg-gradient-to-r from-white to-gray-50',
        'animate-slide-down',
        accentBorders[accentColor],
        hasRedFlags && 'animate-pulse-banner',
        className
      )}
    >
      {/* Patient Info Section */}
      <div className="flex items-center gap-4 flex-1 min-w-0 flex-wrap md:flex-nowrap">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0"
          style={{ background: accentGradients[accentColor] }}
        >
          {initials}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900">{patient.name}</h2>
          <div className="flex items-center flex-wrap gap-2 text-sm text-gray-500 mt-0.5">
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
          <p className="text-sm text-gray-700 mt-1.5">
            <strong className="text-gray-500">Chief Complaint:</strong>{' '}
            &ldquo;{patient.chiefComplaint}&rdquo;
          </p>

          {/* Red Flags */}
          {hasRedFlags && (
            <div className="flex items-center gap-2 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 animate-critical-pulse">
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
                <span className="bg-gray-100 px-2 py-1 rounded-lg">
                  Weight: {patient.weight} kg
                </span>
              )}
              {patient.creatinine && (
                <span className="bg-gray-100 px-2 py-1 rounded-lg">
                  Creatinine: {patient.creatinine} mg/dL
                </span>
              )}
              {patient.gfr && (
                <span className={cn(
                  'px-2 py-1 rounded-lg',
                  patient.gfr < 30 ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-100'
                )}>
                  GFR: {patient.gfr}
                </span>
              )}
              {patient.allergies && patient.allergies.length > 0 && (
                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
                  ⚠️ Allergies: {patient.allergies.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex items-center gap-2 flex-shrink-0 mt-4 md:mt-0">
          {/* View Assessment */}
          <Link
            href={getAssessmentLink()}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium',
              'text-gray-700 bg-white border-2 border-gray-200 rounded-xl',
              'hover:border-purple-400 hover:bg-purple-50',
              'hover:-translate-y-0.5 hover:shadow-md',
              'transition-all duration-200'
            )}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden md:inline">View Assessment</span>
          </Link>

          {onToggleAll && (
            <button
              onClick={onToggleAll}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium',
                'text-gray-700 bg-white border-2 border-gray-200 rounded-xl',
                'hover:border-purple-400 hover:bg-purple-50',
                'hover:-translate-y-0.5 hover:shadow-md',
                'transition-all duration-200'
              )}
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

          {/* Treatment Plan */}
          <Link
            href={`/treatment-plans?patientId=${patient.id}`}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium',
              'text-white rounded-xl',
              'hover:-translate-y-0.5 hover:shadow-lg',
              'transition-all duration-200'
            )}
            style={{ background: gradients.brand }}
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
