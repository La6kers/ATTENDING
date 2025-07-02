// Progress Tracker Component for assessment phases

import React from 'react';
import { AssessmentPhase } from '@/types/medical';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressTrackerProps {
  currentPhase: AssessmentPhase;
  className?: string;
}

interface ProgressStep {
  phase: AssessmentPhase;
  label: string;
  number: number;
}

const progressSteps: ProgressStep[] = [
  { phase: 'chief-complaint', label: 'Chief Complaint', number: 1 },
  { phase: 'hpi-development', label: 'HPI Development', number: 2 },
  { phase: 'review-of-systems', label: 'Review of Systems', number: 3 },
  { phase: 'medical-history', label: 'Medical History', number: 4 },
  { phase: 'risk-stratification', label: 'Risk Assessment', number: 5 },
  { phase: 'clinical-summary', label: 'Clinical Summary', number: 6 }
];

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ 
  currentPhase, 
  className 
}) => {
  const currentStepIndex = progressSteps.findIndex(step => step.phase === currentPhase);

  const getStepStatus = (stepIndex: number): 'completed' | 'active' | 'pending' => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className={cn("bg-white rounded-xl p-4 shadow-sm", className)}>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Clinical Assessment</h3>
      <div className="space-y-3">
        {progressSteps.map((step, index) => {
          const status = getStepStatus(index);
          
          return (
            <div key={step.phase} className="flex items-center gap-3">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                  status === 'completed' && "bg-green-500 text-white",
                  status === 'active' && "bg-purple-600 text-white ring-4 ring-purple-100",
                  status === 'pending' && "bg-gray-200 text-gray-500"
                )}
              >
                {status === 'completed' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors duration-300",
                  status === 'completed' && "text-gray-700",
                  status === 'active' && "text-purple-600",
                  status === 'pending' && "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
