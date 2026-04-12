// ============================================================
// ATTENDING AI - Care Journey Panel
// apps/provider-portal/components/intelligence/CareJourneyPanel.tsx
//
// Visual care pathway tracking and management
// Revolutionary Feature: Automated care coordination at a glance
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  Map,
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Play,
  Pause,
  SkipForward,
  Calendar,
  User,
  FileText,
  Pill,
  Stethoscope,
  ArrowRight,
  MoreVertical,
} from 'lucide-react';

// Types from clinical-intelligence package
interface PatientJourney {
  id: string;
  patientId: string;
  pathwayId: string;
  pathwayName: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled' | 'escalated';
  startedAt: Date;
  expectedEndAt?: Date;
  completedAt?: Date;
  currentStepId?: string;
  stepProgress: StepProgress[];
  events: JourneyEvent[];
  alerts: JourneyAlert[];
  metrics: JourneyMetrics;
}

interface StepProgress {
  stepId: string;
  stepName: string;
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'overdue' | 'escalated';
  startedAt?: Date;
  completedAt?: Date;
  dueAt?: Date;
  assignedTo?: string;
  notes?: string;
  outcomes?: Record<string, any>;
}

interface JourneyEvent {
  id: string;
  timestamp: Date;
  type: string;
  description: string;
  triggeredBy: string;
  metadata?: Record<string, any>;
}

interface JourneyAlert {
  id: string;
  timestamp: Date;
  type: 'overdue' | 'escalation' | 'deviation' | 'reminder' | 'milestone';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  actionRequired?: string;
  acknowledged: boolean;
}

interface JourneyMetrics {
  daysInPathway: number;
  stepsCompleted: number;
  stepsTotal: number;
  percentComplete: number;
  overdueSteps: number;
  escalationCount: number;
  adherenceScore: number;
}

interface CareJourneyPanelProps {
  journey: PatientJourney;
  onCompleteStep?: (stepId: string) => void;
  onSkipStep?: (stepId: string, reason: string) => void;
  onPauseJourney?: () => void;
  onResumeJourney?: () => void;
  onAcknowledgeAlert?: (alertId: string) => void;
}

export function CareJourneyPanel({
  journey,
  onCompleteStep,
  onSkipStep,
  onPauseJourney,
  onResumeJourney,
  onAcknowledgeAlert,
}: CareJourneyPanelProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipReason, setSkipReason] = useState('');

  const statusColors = {
    pending: 'bg-gray-100 text-gray-600 border-gray-300',
    active: 'bg-blue-100 text-blue-700 border-blue-300',
    paused: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    completed: 'bg-green-100 text-green-700 border-green-300',
    cancelled: 'bg-red-100 text-red-700 border-red-300',
    escalated: 'bg-orange-100 text-orange-700 border-orange-300',
  };

  const stepStatusIcons = {
    pending: <Circle className="w-5 h-5 text-gray-400" />,
    active: <Play className="w-5 h-5 text-blue-500" />,
    completed: <CheckCircle className="w-5 h-5 text-green-500" />,
    skipped: <SkipForward className="w-5 h-5 text-gray-400" />,
    overdue: <AlertTriangle className="w-5 h-5 text-red-500" />,
    escalated: <AlertTriangle className="w-5 h-5 text-orange-500" />,
  };

  const alertSeverityColors = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
  };

  const unacknowledgedAlerts = journey.alerts.filter(a => !a.acknowledged);
  const currentStep = journey.stepProgress.find(s => s.stepId === journey.currentStepId);

  const handleSkipStep = (stepId: string) => {
    if (skipReason.trim()) {
      onSkipStep?.(stepId, skipReason);
      setShowSkipModal(false);
      setSkipReason('');
      setSelectedStep(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{journey.pathwayName}</h2>
              <p className="text-teal-200 text-sm">
                Started {new Date(journey.startedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[journey.status]}`}>
              {journey.status.charAt(0).toUpperCase() + journey.status.slice(1)}
            </span>
            {journey.status === 'active' && onPauseJourney && (
              <button
                onClick={onPauseJourney}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}
            {journey.status === 'paused' && onResumeJourney && (
              <button
                onClick={onResumeJourney}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-teal-200 mb-1">
            <span>{journey.metrics.stepsCompleted} of {journey.metrics.stepsTotal} steps</span>
            <span>{journey.metrics.percentComplete}% complete</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${journey.metrics.percentComplete}%` }}
            />
          </div>
        </div>

        {/* Quick metrics */}
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{journey.metrics.daysInPathway}</div>
            <div className="text-teal-200">Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{journey.metrics.adherenceScore}%</div>
            <div className="text-teal-200">Adherence</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${journey.metrics.overdueSteps > 0 ? 'text-red-300' : 'text-white'}`}>
              {journey.metrics.overdueSteps}
            </div>
            <div className="text-teal-200">Overdue</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${journey.metrics.escalationCount > 0 ? 'text-orange-300' : 'text-white'}`}>
              {journey.metrics.escalationCount}
            </div>
            <div className="text-teal-200">Escalations</div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="space-y-2">
            {unacknowledgedAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border flex items-start justify-between ${alertSeverityColors[alert.severity]}`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{alert.message}</div>
                    {alert.actionRequired && (
                      <div className="text-sm opacity-80 mt-0.5">{alert.actionRequired}</div>
                    )}
                  </div>
                </div>
                {onAcknowledgeAlert && (
                  <button
                    onClick={() => onAcknowledgeAlert(alert.id)}
                    className="text-xs px-2 py-1 bg-white/50 rounded hover:bg-white/80"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Step Highlight */}
      {currentStep && (
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
            <Play className="w-4 h-4" />
            Current Step
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">{currentStep.stepName}</h3>
              {currentStep.dueAt && (
                <div className="flex items-center gap-1 text-sm text-blue-700 mt-1">
                  <Clock className="w-3 h-3" />
                  Due: {new Date(currentStep.dueAt).toLocaleDateString()}
                </div>
              )}
              {currentStep.assignedTo && (
                <div className="flex items-center gap-1 text-sm text-blue-700">
                  <User className="w-3 h-3" />
                  {currentStep.assignedTo}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedStep(currentStep.stepId);
                  setShowSkipModal(true);
                }}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => onCompleteStep?.(currentStep.stepId)}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Complete Step
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step Timeline */}
      <div className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Care Pathway Steps</h3>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-6 bottom-6 w-0.5 bg-gray-200" />
          
          <div className="space-y-4">
            {journey.stepProgress.map((step, index) => (
              <div
                key={step.stepId}
                className={`relative pl-12 ${
                  step.status === 'completed' || step.status === 'skipped' ? 'opacity-60' : ''
                }`}
              >
                {/* Status icon */}
                <div className="absolute left-0 w-9 h-9 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center z-10">
                  {stepStatusIcons[step.status]}
                </div>
                
                {/* Step content */}
                <div className={`p-4 rounded-lg border ${
                  step.status === 'active' ? 'border-blue-300 bg-blue-50' :
                  step.status === 'overdue' ? 'border-red-300 bg-red-50' :
                  step.status === 'escalated' ? 'border-orange-300 bg-orange-50' :
                  'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{step.stepName}</h4>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {step.dueAt && (
                          <span className={`flex items-center gap-1 ${
                            step.status === 'overdue' ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {step.status === 'overdue' ? 'Overdue: ' : 'Due: '}
                            {new Date(step.dueAt).toLocaleDateString()}
                          </span>
                        )}
                        {step.assignedTo && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <User className="w-3 h-3" />
                            {step.assignedTo}
                          </span>
                        )}
                        {step.completedAt && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            Completed: {new Date(step.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {step.notes && (
                        <p className="mt-2 text-sm text-gray-600">{step.notes}</p>
                      )}
                    </div>
                    
                    {step.status === 'pending' && (
                      <button className="p-1 hover:bg-gray-200 rounded" aria-label="More options">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Events */}
      {journey.events.length > 0 && (
        <div className="px-6 pb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {journey.events.slice(-5).reverse().map(event => (
              <div key={event.id} className="flex items-start gap-3 text-sm">
                <div className="w-1 h-1 mt-2 bg-gray-400 rounded-full flex-shrink-0" />
                <div>
                  <p className="text-gray-700">{event.description}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(event.timestamp).toLocaleString()} • {event.triggeredBy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skip Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Skip Step</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for skipping this step. This will be documented in the patient's care record.
            </p>
            <textarea
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Enter reason for skipping..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSkipModal(false);
                  setSkipReason('');
                  setSelectedStep(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedStep && handleSkipStep(selectedStep)}
                disabled={!skipReason.trim()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                Skip Step
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CareJourneyPanel;
