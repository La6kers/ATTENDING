// ============================================================
// COMPASS Progress Tracker Component
// apps/patient-portal/components/chat/ProgressTracker.tsx
//
// Visual progress indicator for the assessment phases
// ============================================================

import React from 'react';
import { 
  CheckCircle2, 
  Circle, 
  User, 
  Stethoscope, 
  Pill, 
  AlertTriangle,
  FileText,
  Activity,
  Heart,
  Users
} from 'lucide-react';

type AssessmentPhase = 
  | 'welcome'
  | 'demographics'
  | 'chief_complaint'
  | 'hpi_onset'
  | 'hpi_location'
  | 'hpi_duration'
  | 'hpi_character'
  | 'hpi_severity'
  | 'hpi_aggravating'
  | 'hpi_relieving'
  | 'hpi_associated'
  | 'review_of_systems'
  | 'medications'
  | 'allergies'
  | 'medical_history'
  | 'social_history'
  | 'family_history'
  | 'summary'
  | 'complete';

interface ProgressTrackerProps {
  currentPhase: AssessmentPhase;
}

// Group phases into sections for cleaner display
const PROGRESS_SECTIONS = [
  {
    id: 'intro',
    label: 'Introduction',
    icon: User,
    phases: ['welcome', 'demographics'],
    description: 'Basic information',
  },
  {
    id: 'chief_complaint',
    label: 'Chief Complaint',
    icon: Stethoscope,
    phases: ['chief_complaint'],
    description: 'Main concern',
  },
  {
    id: 'hpi',
    label: 'History of Illness',
    icon: Activity,
    phases: [
      'hpi_onset', 
      'hpi_location', 
      'hpi_duration', 
      'hpi_character', 
      'hpi_severity',
      'hpi_aggravating',
      'hpi_relieving',
      'hpi_associated'
    ],
    description: 'Symptom details',
  },
  {
    id: 'medications',
    label: 'Medications & Allergies',
    icon: Pill,
    phases: ['medications', 'allergies'],
    description: 'Current medications',
  },
  {
    id: 'history',
    label: 'Medical History',
    icon: FileText,
    phases: ['medical_history', 'social_history', 'family_history'],
    description: 'Past & family history',
  },
  {
    id: 'summary',
    label: 'Review & Submit',
    icon: CheckCircle2,
    phases: ['summary', 'complete'],
    description: 'Final review',
  },
];

function getSectionStatus(
  sectionPhases: string[], 
  currentPhase: AssessmentPhase
): 'completed' | 'current' | 'upcoming' {
  const currentIndex = PROGRESS_SECTIONS.flatMap(s => s.phases).indexOf(currentPhase);
  const sectionStartIndex = PROGRESS_SECTIONS.flatMap(s => s.phases).indexOf(sectionPhases[0]);
  const sectionEndIndex = PROGRESS_SECTIONS.flatMap(s => s.phases).indexOf(sectionPhases[sectionPhases.length - 1]);
  
  if (currentIndex > sectionEndIndex) return 'completed';
  if (currentIndex >= sectionStartIndex && currentIndex <= sectionEndIndex) return 'current';
  return 'upcoming';
}

function getPhaseProgress(
  sectionPhases: string[], 
  currentPhase: AssessmentPhase
): number {
  const currentIndex = sectionPhases.indexOf(currentPhase);
  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / sectionPhases.length) * 100);
}

export function ProgressTracker({ currentPhase }: ProgressTrackerProps) {
  const totalPhases = PROGRESS_SECTIONS.flatMap(s => s.phases).length;
  const currentPhaseIndex = PROGRESS_SECTIONS.flatMap(s => s.phases).indexOf(currentPhase);
  const overallProgress = Math.round(((currentPhaseIndex + 1) / totalPhases) * 100);

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="bg-indigo-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-indigo-900">Assessment Progress</span>
          <span className="text-sm font-bold text-indigo-600">{overallProgress}%</span>
        </div>
        <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <p className="text-xs text-indigo-600 mt-2">
          {currentPhase === 'complete' 
            ? '✓ Assessment complete!' 
            : `Step ${currentPhaseIndex + 1} of ${totalPhases}`
          }
        </p>
      </div>

      {/* Section List */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Assessment Sections
        </h3>
        
        <div className="space-y-1">
          {PROGRESS_SECTIONS.map((section, index) => {
            const status = getSectionStatus(section.phases, currentPhase);
            const Icon = section.icon;
            const progress = status === 'current' 
              ? getPhaseProgress(section.phases, currentPhase) 
              : status === 'completed' ? 100 : 0;

            return (
              <div
                key={section.id}
                className={`
                  relative flex items-center gap-3 p-3 rounded-lg transition-all duration-200
                  ${status === 'current' 
                    ? 'bg-indigo-50 border border-indigo-200' 
                    : status === 'completed'
                      ? 'bg-green-50 border border-green-100'
                      : 'bg-gray-50 border border-gray-100'
                  }
                `}
              >
                {/* Status Icon */}
                <div className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  ${status === 'completed' 
                    ? 'bg-green-500 text-white' 
                    : status === 'current'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }
                `}>
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {/* Section Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`
                      text-sm font-medium truncate
                      ${status === 'current' 
                        ? 'text-indigo-900' 
                        : status === 'completed'
                          ? 'text-green-900'
                          : 'text-gray-500'
                      }
                    `}>
                      {section.label}
                    </span>
                    {status === 'current' && section.phases.length > 1 && (
                      <span className="text-xs text-indigo-600 font-medium">
                        {progress}%
                      </span>
                    )}
                  </div>
                  <p className={`
                    text-xs truncate
                    ${status === 'current' 
                      ? 'text-indigo-600' 
                      : status === 'completed'
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }
                  `}>
                    {section.description}
                  </p>
                  
                  {/* Progress bar for current section */}
                  {status === 'current' && section.phases.length > 1 && (
                    <div className="mt-2 w-full h-1 bg-indigo-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Connector Line */}
                {index < PROGRESS_SECTIONS.length - 1 && (
                  <div className={`
                    absolute left-[1.45rem] top-full w-0.5 h-2
                    ${status === 'completed' ? 'bg-green-300' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-semibold text-amber-900">Important</h4>
            <p className="text-xs text-amber-700 mt-1">
              If you're experiencing a medical emergency, please call 911 or go to your nearest emergency room immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgressTracker;
