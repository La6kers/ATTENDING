// ContextBanner.tsx
// Unified context banner for patient selection OR "All Items" display
// apps/provider-portal/components/shared/ContextBanner.tsx

import type { ReactNode } from 'react';
import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  FileText,
  Activity,
  Users,
  TestTube,
  FileImage,
  Pill,
  Inbox,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface PatientInfo {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint?: string;
  insurancePlan?: string;
  allergies?: string[];
  redFlags?: string[];
  // For safety-critical pages (imaging, medications)
  weight?: number;
  creatinine?: number;
  gfr?: number;
  pregnant?: boolean;
  // Assessment context
  assessmentId?: string;
}

export type ContextType = 
  | 'patients' 
  | 'labs' 
  | 'imaging' 
  | 'medications' 
  | 'referrals' 
  | 'inbox' 
  | 'appointments'
  | 'assessments'
  | 'treatment';

export interface ContextBannerProps {
  /** Selected patient info, or null for "All Items" view */
  patient: PatientInfo | null;
  /** Type of content being displayed */
  contextType: ContextType;
  /** Custom title when no patient selected (default: "All {contextType}") */
  allItemsTitle?: string;
  /** Custom subtitle when no patient selected */
  allItemsSubtitle?: string;
  /** Count of items when showing all */
  itemCount?: number;
  /** Show red flags warning (only when patient selected) */
  showRedFlags?: boolean;
  /** Show safety info like weight, GFR (for imaging/medications) */
  showSafetyInfo?: boolean;
  /** Show action buttons */
  showActions?: boolean;
  /** Collapse/expand toggle callback */
  onToggleAll?: () => void;
  /** Current collapse state */
  allCollapsed?: boolean;
  /** Accent color for the left border */
  accentColor?: 'purple' | 'blue' | 'green' | 'indigo' | 'amber' | 'red' | 'teal';
  /** Callback when "Select Patient" is clicked */
  onSelectPatient?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Additional content in the right section */
  children?: ReactNode;
}

// ============================================================================
// Helpers
// ============================================================================

const contextConfig: Record<ContextType, {
  icon: typeof TestTube;
  label: string;
  pluralLabel: string;
  defaultColor: string;
}> = {
  patients: { icon: Users, label: 'Patient', pluralLabel: 'Patients', defaultColor: 'purple' },
  labs: { icon: TestTube, label: 'Lab', pluralLabel: 'Labs', defaultColor: 'green' },
  imaging: { icon: FileImage, label: 'Imaging Study', pluralLabel: 'Imaging Studies', defaultColor: 'blue' },
  medications: { icon: Pill, label: 'Medication', pluralLabel: 'Medications', defaultColor: 'indigo' },
  referrals: { icon: Users, label: 'Referral', pluralLabel: 'Referrals', defaultColor: 'amber' },
  inbox: { icon: Inbox, label: 'Message', pluralLabel: 'Messages', defaultColor: 'purple' },
  appointments: { icon: Calendar, label: 'Appointment', pluralLabel: 'Appointments', defaultColor: 'teal' },
  assessments: { icon: Activity, label: 'Assessment', pluralLabel: 'Assessments', defaultColor: 'purple' },
  treatment: { icon: ClipboardList, label: 'Treatment Plan', pluralLabel: 'Treatment Plans', defaultColor: 'indigo' },
};

const accentBorders: Record<string, string> = {
  purple: 'border-l-teal-500',
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  indigo: 'border-l-indigo-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
  teal: 'border-l-teal-500',
};

const avatarGradients: Record<string, string> = {
  purple: 'from-teal-500 to-teal-600',
  blue: 'from-blue-500 to-indigo-600',
  green: 'from-green-500 to-teal-600',
  indigo: 'from-indigo-500 to-teal-600',
  amber: 'from-amber-500 to-orange-600',
  red: 'from-red-500 to-rose-600',
  teal: 'from-teal-500 to-cyan-600',
};

// ============================================================================
// Component
// ============================================================================

/**
 * ContextBanner - Unified banner for patient context or "All Items" display
 * 
 * When a patient is selected, shows patient info with optional red flags and safety data.
 * When no patient is selected, shows "All [Labs/Imaging/etc.]" with item count.
 */
const ContextBanner: React.FC<ContextBannerProps> = ({
  patient,
  contextType,
  allItemsTitle,
  allItemsSubtitle,
  itemCount,
  showRedFlags = true,
  showSafetyInfo = false,
  showActions = true,
  onToggleAll,
  allCollapsed = false,
  accentColor,
  onSelectPatient,
  className = '',
  children,
}) => {
  const config = contextConfig[contextType];
  const Icon = config.icon;
  const color = accentColor || config.defaultColor;
  
  // Generate initials from patient name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const hasRedFlags = patient && showRedFlags && patient.redFlags && patient.redFlags.length > 0;

  // Build assessment link - this is the main patient view that exists
  const getPatientAssessmentLink = () => {
    if (patient?.assessmentId) {
      return `/assessments/${patient.assessmentId}`;
    }
    return `/assessments?patientId=${patient?.id}`;
  };

  // ========================================
  // Render: Patient Selected
  // ========================================
  if (patient) {
    return (
      <div
        className={`patient-bar border-l-4 ${accentBorders[color]} ${
          hasRedFlags ? 'animate-pulse-banner' : ''
        } ${className}`}
      >
        {/* Patient Info Section */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Avatar */}
          <div
            className={`patient-avatar bg-gradient-to-br ${avatarGradients[color]}`}
          >
            {getInitials(patient.name)}
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
            {patient.chiefComplaint && (
              <p className="text-sm text-gray-700 mt-1">
                <strong className="text-gray-500">Chief Complaint:</strong>{' '}
                &ldquo;{patient.chiefComplaint}&rdquo;
              </p>
            )}

            {/* Red Flags */}
            {hasRedFlags && (
              <div className="flex items-center gap-2 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700 font-medium">
                  Red Flags: {patient.redFlags!.join(' • ')}
                </span>
              </div>
            )}

            {/* Safety Info (for imaging/medications) */}
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
                {patient.gfr !== undefined && (
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

        {/* Action Buttons */}
        {showActions && (
          <div className="patient-action-buttons flex items-center gap-2 flex-shrink-0">
            {/* View Assessment - Links to actual assessments page */}
            <Link
              href={getPatientAssessmentLink()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                         text-gray-700 bg-white border-2 border-gray-200 rounded-lg 
                         hover:border-teal-400 hover:bg-teal-50 
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
                           hover:border-teal-400 hover:bg-teal-50 
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
                         text-white bg-gradient-to-r from-teal-600 to-teal-700 
                         rounded-lg hover:-translate-y-0.5 hover:shadow-lg
                         transition-all duration-200"
            >
              <Activity className="w-4 h-4" />
              <span className="hidden md:inline">Treatment Plan</span>
            </Link>

            {children}
          </div>
        )}
      </div>
    );
  }

  // ========================================
  // Render: No Patient Selected ("All Items")
  // ========================================
  const displayTitle = allItemsTitle || `All ${config.pluralLabel}`;
  const displaySubtitle = allItemsSubtitle || 
    (itemCount !== undefined 
      ? `Viewing all ${itemCount.toLocaleString()} ${config.pluralLabel.toLowerCase()}`
      : `Viewing all ${config.pluralLabel.toLowerCase()} across patients`);

  return (
    <div
      className={`patient-bar border-l-4 ${accentBorders[color]} ${className}`}
    >
      {/* Icon and Info */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Icon Avatar */}
        <div
          className={`w-14 h-14 bg-gradient-to-br ${avatarGradients[color]} 
                      rounded-full flex items-center justify-center shadow-lg`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900">{displayTitle}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{displaySubtitle}</p>
        </div>
      </div>

      {/* Action Area */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {onSelectPatient && (
          <button
            onClick={onSelectPatient}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                       text-white bg-gradient-to-r from-teal-600 to-teal-700 
                       rounded-lg hover:-translate-y-0.5 hover:shadow-lg
                       transition-all duration-200"
          >
            <Users className="w-4 h-4" />
            Select Patient
          </button>
        )}

        {children}
      </div>
    </div>
  );
};

export default ContextBanner;
