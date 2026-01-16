// EmergencyProtocolModal.tsx
// Emergency protocol modal for critical clinical situations
// apps/provider-portal/components/shared/EmergencyProtocolModal.tsx

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  Phone,
  Ambulance,
  Brain,
  Heart,
  Activity,
  TestTube,
  FileImage,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export interface EmergencyProtocol {
  id: string;
  name: string;
  condition: string;
  urgency: 'immediate' | 'urgent' | 'emergent';
  steps: ProtocolStep[];
  statLabs: string[];
  statImaging: string[];
  specialistConsult?: string;
  dispositionOptions: string[];
}

export interface ProtocolStep {
  id: string;
  order: number;
  action: string;
  details?: string;
  timeframe?: string;
  completed?: boolean;
}

export interface EmergencyProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
  protocol?: EmergencyProtocol;
  patientName?: string;
  chiefComplaint?: string;
  redFlags?: string[];
  onOrderStatLabs?: (labCodes: string[]) => void;
  onOrderStatImaging?: (imagingCodes: string[]) => void;
  onRequestConsult?: (specialty: string) => void;
}

// Default emergency protocol for secondary headache
const SECONDARY_HEADACHE_PROTOCOL: EmergencyProtocol = {
  id: 'secondary-headache-001',
  name: 'Secondary Headache Evaluation',
  condition: 'Rule out life-threatening secondary causes of headache',
  urgency: 'emergent',
  steps: [
    {
      id: 'step-1',
      order: 1,
      action: 'Stabilize patient and assess airway/breathing/circulation',
      timeframe: 'Immediate',
    },
    {
      id: 'step-2',
      order: 2,
      action: 'Obtain detailed history focusing on red flags',
      details: 'Thunderclap onset, worst headache of life, fever, neck stiffness, altered mental status, focal neurologic deficits',
      timeframe: '5 minutes',
    },
    {
      id: 'step-3',
      order: 3,
      action: 'Perform focused neurological examination',
      details: 'Mental status, cranial nerves, motor/sensory, cerebellar function, meningeal signs',
      timeframe: '5-10 minutes',
    },
    {
      id: 'step-4',
      order: 4,
      action: 'Order STAT CT Head without contrast',
      details: 'To rule out hemorrhage, mass effect, hydrocephalus',
      timeframe: '15-30 minutes',
    },
    {
      id: 'step-5',
      order: 5,
      action: 'Order STAT laboratory studies',
      details: 'CBC, CMP, Coagulation studies, ESR/CRP, D-dimer if PE suspected',
      timeframe: '30-60 minutes',
    },
    {
      id: 'step-6',
      order: 6,
      action: 'Consider lumbar puncture if CT negative and SAH suspected',
      details: 'Look for xanthochromia, elevated opening pressure, cell count',
      timeframe: 'After CT results',
    },
    {
      id: 'step-7',
      order: 7,
      action: 'Consult Neurology/Neurosurgery as indicated',
      timeframe: 'Based on findings',
    },
  ],
  statLabs: ['CBC', 'CMP', 'PT/INR', 'PTT', 'ESR', 'CRP', 'D-DIMER'],
  statImaging: ['CT-HEAD-WO', 'CTA-HEAD-NECK'],
  specialistConsult: 'Neurology',
  dispositionOptions: [
    'Admit to ICU for close monitoring',
    'Admit to Neurology service',
    'Transfer to higher level of care',
    'Emergency department observation',
  ],
};

const EmergencyProtocolModal: React.FC<EmergencyProtocolModalProps> = ({
  isOpen,
  onClose,
  protocol = SECONDARY_HEADACHE_PROTOCOL,
  patientName = 'Patient',
  chiefComplaint,
  redFlags = [],
  onOrderStatLabs,
  onOrderStatImaging,
  onRequestConsult,
}) => {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [labsOrdered, setLabsOrdered] = useState(false);
  const [imagingOrdered, setImagingOrdered] = useState(false);
  const [consultRequested, setConsultRequested] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCompletedSteps(new Set());
      setLabsOrdered(false);
      setImagingOrdered(false);
      setConsultRequested(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const handleOrderStatLabs = () => {
    if (onOrderStatLabs) {
      onOrderStatLabs(protocol.statLabs);
    }
    setLabsOrdered(true);
  };

  const handleOrderStatImaging = () => {
    if (onOrderStatImaging) {
      onOrderStatImaging(protocol.statImaging);
    }
    setImagingOrdered(true);
  };

  const handleRequestConsult = () => {
    if (onRequestConsult && protocol.specialistConsult) {
      onRequestConsult(protocol.specialistConsult);
    }
    setConsultRequested(true);
  };

  const completionPercentage = Math.round((completedSteps.size / protocol.steps.length) * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header - Red gradient for emergency */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">🚨 Emergency Protocol Activated</h2>
                  <p className="text-red-100 mt-1">{protocol.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Patient Context */}
            <div className="mt-4 bg-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{patientName}</p>
                  {chiefComplaint && (
                    <p className="text-red-100 text-sm">Chief Complaint: {chiefComplaint}</p>
                  )}
                </div>
                {redFlags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {redFlags.map((flag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-red-500 rounded-full text-sm font-medium"
                      >
                        ⚠️ {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Protocol Progress</span>
                <span>{completionPercentage}% Complete</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* STAT Labs */}
              <button
                onClick={handleOrderStatLabs}
                disabled={labsOrdered}
                className={`p-4 rounded-xl border-2 transition-all ${
                  labsOrdered
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'bg-red-50 border-red-300 hover:border-red-500 text-red-700 hover:shadow-lg'
                }`}
              >
                <div className="flex items-center gap-3">
                  {labsOrdered ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <TestTube className="w-6 h-6" />
                  )}
                  <div className="text-left">
                    <p className="font-semibold">
                      {labsOrdered ? 'STAT Labs Ordered' : 'Order STAT Labs'}
                    </p>
                    <p className="text-sm opacity-75">
                      {protocol.statLabs.length} critical tests
                    </p>
                  </div>
                </div>
              </button>

              {/* STAT Imaging */}
              <button
                onClick={handleOrderStatImaging}
                disabled={imagingOrdered}
                className={`p-4 rounded-xl border-2 transition-all ${
                  imagingOrdered
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'bg-red-50 border-red-300 hover:border-red-500 text-red-700 hover:shadow-lg'
                }`}
              >
                <div className="flex items-center gap-3">
                  {imagingOrdered ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <FileImage className="w-6 h-6" />
                  )}
                  <div className="text-left">
                    <p className="font-semibold">
                      {imagingOrdered ? 'STAT Imaging Ordered' : 'Order STAT Imaging'}
                    </p>
                    <p className="text-sm opacity-75">
                      {protocol.statImaging.length} urgent studies
                    </p>
                  </div>
                </div>
              </button>

              {/* Specialist Consult */}
              {protocol.specialistConsult && (
                <button
                  onClick={handleRequestConsult}
                  disabled={consultRequested}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    consultRequested
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'bg-orange-50 border-orange-300 hover:border-orange-500 text-orange-700 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {consultRequested ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Brain className="w-6 h-6" />
                    )}
                    <div className="text-left">
                      <p className="font-semibold">
                        {consultRequested ? 'Consult Requested' : `Request ${protocol.specialistConsult}`}
                      </p>
                      <p className="text-sm opacity-75">Urgent consultation</p>
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Emergency Contacts */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Emergency Contacts
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-red-600 font-medium">Code Team</p>
                  <p className="text-red-800">Dial 1111</p>
                </div>
                <div>
                  <p className="text-red-600 font-medium">Rapid Response</p>
                  <p className="text-red-800">Dial 2222</p>
                </div>
                <div>
                  <p className="text-red-600 font-medium">Neurology On-Call</p>
                  <p className="text-red-800">Dial 3333</p>
                </div>
                <div>
                  <p className="text-red-600 font-medium">Transfer Center</p>
                  <p className="text-red-800">Dial 4444</p>
                </div>
              </div>
            </div>

            {/* Protocol Steps */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-600" />
                Protocol Steps
              </h3>
              <div className="space-y-3">
                {protocol.steps.map((step) => {
                  const isCompleted = completedSteps.has(step.id);
                  return (
                    <div
                      key={step.id}
                      onClick={() => toggleStep(step.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isCompleted
                          ? 'bg-green-50 border-green-300'
                          : 'bg-white border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <span className="font-semibold">{step.order}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${isCompleted ? 'text-green-800' : 'text-gray-900'}`}>
                            {step.action}
                          </p>
                          {step.details && (
                            <p className={`text-sm mt-1 ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                              {step.details}
                            </p>
                          )}
                        </div>
                        {step.timeframe && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            {step.timeframe}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Disposition Options */}
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Disposition Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {protocol.dispositionOptions.map((option, idx) => (
                  <button
                    key={idx}
                    className="p-3 text-left rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4 text-purple-600" />
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 p-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Protocol activated at {new Date().toLocaleTimeString()}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Mark all steps complete
                  const allStepIds = new Set(protocol.steps.map(s => s.id));
                  setCompletedSteps(allStepIds);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Mark Protocol Complete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyProtocolModal;
