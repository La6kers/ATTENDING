// ============================================================
// ATTENDING AI - Clinical Pathway Automation
// apps/provider-portal/components/pathways/ClinicalPathwayPanel.tsx
//
// Phase 8: Automate evidence-based clinical protocols
// Embeds guidelines directly into the clinical workflow
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Stethoscope,
  FileText,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Heart,
  Brain,
  Thermometer,
  Syringe,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface PathwayStep {
  id: string;
  order: number;
  name: string;
  description: string;
  action: 'order' | 'assess' | 'calculate' | 'decision' | 'notify' | 'document';
  timeLimit?: string;
  autoOrder?: boolean;
  items?: PathwayItem[];
  completed?: boolean;
  completedAt?: Date;
  skipped?: boolean;
  result?: string;
}

export interface PathwayItem {
  id: string;
  name: string;
  type: 'lab' | 'imaging' | 'medication' | 'procedure' | 'assessment';
  code?: string;
  ordered?: boolean;
  result?: string;
}

export interface ClinicalPathway {
  id: string;
  name: string;
  description: string;
  icon: 'heart' | 'brain' | 'thermometer' | 'activity';
  urgency: 'critical' | 'urgent' | 'standard';
  trigger: {
    symptoms: string[];
    riskFactors?: string[];
    vitalSigns?: Record<string, { min?: number; max?: number }>;
  };
  steps: PathwayStep[];
  guidelines: string;
  references: string[];
}

export interface ActivePathway extends ClinicalPathway {
  startedAt: Date;
  currentStep: number;
  patientId: string;
  patientName: string;
  completedSteps: string[];
}

// ============================================================
// PATHWAY DEFINITIONS
// ============================================================

export const CLINICAL_PATHWAYS: ClinicalPathway[] = [
  {
    id: 'acs-evaluation',
    name: 'Acute Coronary Syndrome Evaluation',
    description: 'Rapid evaluation protocol for patients with chest pain and ACS risk factors',
    icon: 'heart',
    urgency: 'critical',
    trigger: {
      symptoms: ['chest pain', 'chest pressure', 'chest tightness', 'substernal pain'],
      riskFactors: ['diabetes', 'hypertension', 'smoking', 'family history CAD', 'hyperlipidemia'],
      vitalSigns: {
        systolicBP: { max: 180 },
        heartRate: { min: 50, max: 120 },
      },
    },
    steps: [
      {
        id: 'acs-1',
        order: 1,
        name: 'Immediate ECG',
        description: 'Obtain 12-lead ECG within 10 minutes of presentation',
        action: 'order',
        timeLimit: '10 minutes',
        autoOrder: true,
        items: [
          { id: 'ecg-12', name: '12-Lead ECG', type: 'procedure', code: '93000' },
        ],
      },
      {
        id: 'acs-2',
        order: 2,
        name: 'Cardiac Biomarkers',
        description: 'STAT troponin and BNP',
        action: 'order',
        timeLimit: '15 minutes',
        autoOrder: true,
        items: [
          { id: 'trop-i', name: 'Troponin I', type: 'lab', code: '84484' },
          { id: 'bnp', name: 'BNP', type: 'lab', code: '83880' },
          { id: 'cmp', name: 'Comprehensive Metabolic Panel', type: 'lab', code: '80053' },
        ],
      },
      {
        id: 'acs-3',
        order: 3,
        name: 'Initial Treatment',
        description: 'Aspirin and nitroglycerin if not contraindicated',
        action: 'order',
        timeLimit: '15 minutes',
        items: [
          { id: 'asa', name: 'Aspirin 325mg PO', type: 'medication', code: 'N0220' },
          { id: 'ntg', name: 'Nitroglycerin 0.4mg SL PRN', type: 'medication', code: 'C1659' },
        ],
      },
      {
        id: 'acs-4',
        order: 4,
        name: 'HEART Score Calculation',
        description: 'Calculate HEART score for risk stratification',
        action: 'calculate',
        items: [
          { id: 'heart', name: 'HEART Score', type: 'assessment' },
        ],
      },
      {
        id: 'acs-5',
        order: 5,
        name: 'Risk Stratification Decision',
        description: 'Determine disposition based on HEART score',
        action: 'decision',
      },
    ],
    guidelines: 'ACC/AHA 2021 Chest Pain Guidelines',
    references: [
      'Amsterdam EA, et al. 2014 AHA/ACC Guideline for the Management of Patients with Non-ST-Elevation Acute Coronary Syndromes.',
      'Six AJ, et al. Chest pain in the emergency room: value of the HEART score.',
    ],
  },
  {
    id: 'stroke-alert',
    name: 'Stroke Alert Protocol',
    description: 'Rapid evaluation for acute stroke with door-to-needle time optimization',
    icon: 'brain',
    urgency: 'critical',
    trigger: {
      symptoms: ['sudden weakness', 'facial droop', 'arm weakness', 'speech difficulty', 'sudden confusion'],
    },
    steps: [
      {
        id: 'stroke-1',
        order: 1,
        name: 'NIH Stroke Scale',
        description: 'Perform NIHSS assessment immediately',
        action: 'assess',
        timeLimit: '5 minutes',
        items: [
          { id: 'nihss', name: 'NIH Stroke Scale', type: 'assessment' },
        ],
      },
      {
        id: 'stroke-2',
        order: 2,
        name: 'STAT CT Head',
        description: 'Non-contrast CT head to rule out hemorrhage',
        action: 'order',
        timeLimit: '15 minutes',
        autoOrder: true,
        items: [
          { id: 'ct-head', name: 'CT Head without Contrast', type: 'imaging', code: '70450' },
        ],
      },
      {
        id: 'stroke-3',
        order: 3,
        name: 'Labs',
        description: 'STAT glucose, coagulation studies, and CBC',
        action: 'order',
        timeLimit: '15 minutes',
        autoOrder: true,
        items: [
          { id: 'glucose', name: 'Glucose, POC', type: 'lab', code: '82947' },
          { id: 'pt-inr', name: 'PT/INR', type: 'lab', code: '85610' },
          { id: 'cbc', name: 'CBC with Diff', type: 'lab', code: '85025' },
        ],
      },
      {
        id: 'stroke-4',
        order: 4,
        name: 'tPA Decision',
        description: 'Evaluate for thrombolytic therapy within 4.5 hours of symptom onset',
        action: 'decision',
        timeLimit: '45 minutes',
      },
    ],
    guidelines: 'AHA/ASA 2019 Acute Ischemic Stroke Guidelines',
    references: [
      'Powers WJ, et al. 2019 Update to the 2018 Guidelines for the Early Management of Acute Ischemic Stroke.',
    ],
  },
  {
    id: 'sepsis-bundle',
    name: 'Sepsis 3-Hour Bundle',
    description: 'Early sepsis identification and treatment protocol',
    icon: 'thermometer',
    urgency: 'critical',
    trigger: {
      symptoms: ['fever', 'chills', 'altered mental status', 'hypotension'],
      vitalSigns: {
        temperature: { min: 38.3 },
        heartRate: { min: 90 },
        respiratoryRate: { min: 20 },
        systolicBP: { max: 90 },
      },
    },
    steps: [
      {
        id: 'sepsis-1',
        order: 1,
        name: 'Lactate Level',
        description: 'Measure serum lactate level',
        action: 'order',
        timeLimit: '30 minutes',
        autoOrder: true,
        items: [
          { id: 'lactate', name: 'Lactate, Serum', type: 'lab', code: '83605' },
        ],
      },
      {
        id: 'sepsis-2',
        order: 2,
        name: 'Blood Cultures',
        description: 'Obtain blood cultures before antibiotics',
        action: 'order',
        timeLimit: '45 minutes',
        autoOrder: true,
        items: [
          { id: 'bcx-aerobic', name: 'Blood Culture, Aerobic', type: 'lab', code: '87040' },
          { id: 'bcx-anaerobic', name: 'Blood Culture, Anaerobic', type: 'lab', code: '87040' },
        ],
      },
      {
        id: 'sepsis-3',
        order: 3,
        name: 'Broad-Spectrum Antibiotics',
        description: 'Administer antibiotics within 1 hour',
        action: 'order',
        timeLimit: '1 hour',
        items: [
          { id: 'vanc', name: 'Vancomycin 25mg/kg IV', type: 'medication' },
          { id: 'zosyn', name: 'Piperacillin-Tazobactam 4.5g IV', type: 'medication' },
        ],
      },
      {
        id: 'sepsis-4',
        order: 4,
        name: 'IV Fluid Resuscitation',
        description: '30 mL/kg crystalloid for hypotension or lactate ≥4',
        action: 'order',
        timeLimit: '3 hours',
        items: [
          { id: 'lr-bolus', name: 'Lactated Ringers 30mL/kg IV', type: 'medication' },
        ],
      },
      {
        id: 'sepsis-5',
        order: 5,
        name: 'Reassess & Document',
        description: 'Reassess volume status and perfusion',
        action: 'document',
        timeLimit: '6 hours',
      },
    ],
    guidelines: 'Surviving Sepsis Campaign 2021 Guidelines',
    references: [
      'Evans L, et al. Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021.',
    ],
  },
];

// ============================================================
// COMPONENTS
// ============================================================

const PathwayIcon: React.FC<{ icon: ClinicalPathway['icon']; className?: string }> = ({ icon, className }) => {
  const icons = {
    heart: Heart,
    brain: Brain,
    thermometer: Thermometer,
    activity: Activity,
  };
  const Icon = icons[icon];
  return <Icon className={className} />;
};

const PathwayStepCard: React.FC<{
  step: PathwayStep;
  isActive: boolean;
  onComplete: (stepId: string, result?: string) => void;
  onSkip: (stepId: string) => void;
  onOrderItem: (stepId: string, itemId: string) => void;
}> = ({ step, isActive, onComplete, onSkip, onOrderItem }) => {
  const [expanded, setExpanded] = useState(isActive);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && !step.completed) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, step.completed]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeLimitSeconds = step.timeLimit ? parseInt(step.timeLimit) * 60 : null;
  const isOverTime = timeLimitSeconds && elapsedTime > timeLimitSeconds;

  return (
    <div
      className={`border rounded-lg transition-all ${
        step.completed
          ? 'border-emerald-200 bg-emerald-50'
          : step.skipped
          ? 'border-slate-200 bg-slate-50 opacity-60'
          : isActive
          ? 'border-teal-300 bg-teal-50 shadow-md'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step.completed
                ? 'bg-emerald-500 text-white'
                : step.skipped
                ? 'bg-slate-400 text-white'
                : isActive
                ? 'bg-teal-500 text-white'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            {step.completed ? (
              <CheckCircle size={18} />
            ) : (
              <span className="font-semibold text-sm">{step.order}</span>
            )}
          </div>

          {/* Step Info */}
          <div>
            <h4 className="font-semibold text-slate-900">{step.name}</h4>
            <p className="text-sm text-slate-500">{step.description}</p>
          </div>
        </div>

        {/* Time & Actions */}
        <div className="flex items-center gap-4">
          {step.timeLimit && !step.completed && !step.skipped && (
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                isOverTime ? 'text-red-600' : 'text-slate-600'
              }`}
            >
              <Clock size={14} />
              {formatTime(elapsedTime)} / {step.timeLimit}
            </div>
          )}
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          {/* Items to Order */}
          {step.items && step.items.length > 0 && (
            <div className="mt-4 space-y-2">
              {step.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center ${
                        item.ordered
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {item.ordered ? <CheckCircle size={14} /> : <FileText size={14} />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      {item.code && (
                        <p className="text-xs text-slate-500">Code: {item.code}</p>
                      )}
                    </div>
                  </div>
                  {!item.ordered && !step.completed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOrderItem(step.id, item.id);
                      }}
                      className="px-3 py-1 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors"
                    >
                      Order
                    </button>
                  )}
                  {item.result && (
                    <span className="text-sm font-medium text-emerald-600">{item.result}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Auto-Order Badge */}
          {step.autoOrder && !step.completed && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              <Zap size={14} />
              Orders will be placed automatically when pathway is activated
            </div>
          )}

          {/* Action Buttons */}
          {!step.completed && !step.skipped && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => onComplete(step.id)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle size={16} />
                Mark Complete
              </button>
              <button
                onClick={() => onSkip(step.id)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Skip Step
              </button>
            </div>
          )}

          {/* Completed Info */}
          {step.completed && step.completedAt && (
            <div className="mt-3 text-sm text-emerald-600">
              ✓ Completed at {step.completedAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const ClinicalPathwayPanel: React.FC<{
  patientId: string;
  patientName: string;
  symptoms?: string[];
  onPathwayComplete?: (pathwayId: string, steps: PathwayStep[]) => void;
}> = ({ patientId, patientName, symptoms = [], onPathwayComplete }) => {
  const [activePathway, setActivePathway] = useState<ActivePathway | null>(null);
  const [availablePathways, setAvailablePathways] = useState<ClinicalPathway[]>([]);
  const [showPathwaySelector, setShowPathwaySelector] = useState(false);

  // Detect applicable pathways based on symptoms
  useEffect(() => {
    const applicable = CLINICAL_PATHWAYS.filter((pathway) =>
      pathway.trigger.symptoms.some((trigger) =>
        symptoms.some((symptom) =>
          symptom.toLowerCase().includes(trigger.toLowerCase())
        )
      )
    );
    setAvailablePathways(applicable.length > 0 ? applicable : CLINICAL_PATHWAYS);
  }, [symptoms]);

  const activatePathway = (pathway: ClinicalPathway) => {
    setActivePathway({
      ...pathway,
      startedAt: new Date(),
      currentStep: 0,
      patientId,
      patientName,
      completedSteps: [],
    });
    setShowPathwaySelector(false);
  };

  const handleStepComplete = (stepId: string) => {
    if (!activePathway) return;

    const updatedSteps = activePathway.steps.map((step) =>
      step.id === stepId
        ? { ...step, completed: true, completedAt: new Date() }
        : step
    );

    const completedSteps = [...activePathway.completedSteps, stepId];
    const nextIncompleteStep = updatedSteps.findIndex(
      (s) => !s.completed && !s.skipped
    );

    setActivePathway({
      ...activePathway,
      steps: updatedSteps,
      completedSteps,
      currentStep: nextIncompleteStep >= 0 ? nextIncompleteStep : activePathway.steps.length,
    });

    // Check if pathway is complete
    if (updatedSteps.every((s) => s.completed || s.skipped)) {
      onPathwayComplete?.(activePathway.id, updatedSteps);
    }
  };

  const handleStepSkip = (stepId: string) => {
    if (!activePathway) return;

    const updatedSteps = activePathway.steps.map((step) =>
      step.id === stepId ? { ...step, skipped: true } : step
    );

    const nextIncompleteStep = updatedSteps.findIndex(
      (s) => !s.completed && !s.skipped
    );

    setActivePathway({
      ...activePathway,
      steps: updatedSteps,
      currentStep: nextIncompleteStep >= 0 ? nextIncompleteStep : activePathway.steps.length,
    });
  };

  const handleOrderItem = (stepId: string, itemId: string) => {
    if (!activePathway) return;

    const updatedSteps = activePathway.steps.map((step) =>
      step.id === stepId
        ? {
            ...step,
            items: step.items?.map((item) =>
              item.id === itemId ? { ...item, ordered: true } : item
            ),
          }
        : step
    );

    setActivePathway({
      ...activePathway,
      steps: updatedSteps,
    });
  };

  const resetPathway = () => {
    setActivePathway(null);
  };

  // Calculate progress
  const completedCount = activePathway?.steps.filter((s) => s.completed).length || 0;
  const totalCount = activePathway?.steps.length || 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Stethoscope className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">Clinical Pathways</h2>
              <p className="text-teal-200 text-sm">Evidence-based care protocols</p>
            </div>
          </div>
          {activePathway && (
            <button
              onClick={resetPathway}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {!activePathway ? (
          // Pathway Selector
          <div>
            {availablePathways.length > 0 && symptoms.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle size={16} />
                  <span className="font-medium">
                    {availablePathways.length} recommended pathway(s) based on symptoms
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {availablePathways.map((pathway) => (
                <div
                  key={pathway.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-all cursor-pointer"
                  onClick={() => activatePathway(pathway)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        pathway.urgency === 'critical'
                          ? 'bg-red-100 text-red-600'
                          : pathway.urgency === 'urgent'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      <PathwayIcon icon={pathway.icon} className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{pathway.name}</h3>
                      <p className="text-sm text-slate-500">{pathway.description}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {pathway.steps.length} steps • {pathway.guidelines}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        pathway.urgency === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : pathway.urgency === 'urgent'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {pathway.urgency.toUpperCase()}
                    </span>
                    <ArrowRight className="text-slate-400" size={20} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Active Pathway View
          <div>
            {/* Pathway Info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    activePathway.urgency === 'critical'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  <PathwayIcon icon={activePathway.icon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{activePathway.name}</h3>
                  <p className="text-sm text-slate-500">
                    Patient: {patientName} • Started {activePathway.startedAt.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-teal-600">
                  {completedCount}/{totalCount}
                </p>
                <p className="text-sm text-slate-500">Steps completed</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {activePathway.steps.map((step, index) => (
                <PathwayStepCard
                  key={step.id}
                  step={step}
                  isActive={index === activePathway.currentStep}
                  onComplete={handleStepComplete}
                  onSkip={handleStepSkip}
                  onOrderItem={handleOrderItem}
                />
              ))}
            </div>

            {/* Guidelines Reference */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-700">Guideline Reference</p>
              <p className="text-sm text-slate-600">{activePathway.guidelines}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalPathwayPanel;
