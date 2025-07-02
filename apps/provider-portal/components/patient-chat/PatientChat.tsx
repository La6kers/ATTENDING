// Main Patient Chat Component with BioMistral-7B Integration

import React, { useEffect, useRef } from 'react';
import { usePatientChatStore } from '@/store/patientChatStore';
import { ChatMessage } from './ChatMessage';
import { ProgressTracker } from './ProgressTracker';
import { ChatInput } from './ChatInput';
import { EmergencyModal } from './EmergencyModal';
import { ClinicalSummary } from './ClinicalSummary';
import { AIStatusIndicator } from './AIStatusIndicator';
import { MedicalDisclaimerModal } from './MedicalDisclaimerModal';
import { Compass, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientChatProps {
  patientId?: string;
  className?: string;
}

export const PatientChat: React.FC<PatientChatProps> = ({ 
  patientId = 'patient-001',
  className 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showDisclaimer, setShowDisclaimer] = React.useState(true);
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = React.useState(false);
  
  const {
    messages,
    currentPhase,
    isAIProcessing,
    aiStatus,
    urgencyLevel,
    showEmergencyModal,
    showClinicalSummary,
    startNewSession,
    setEmergencyModal
  } = usePatientChatStore();

  // Initialize session on mount after disclaimer is accepted
  useEffect(() => {
    if (hasAcceptedDisclaimer) {
      startNewSession(patientId);
    }
  }, [patientId, hasAcceptedDisclaimer, startNewSession]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={cn(
      "flex h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600",
      className
    )}>
      <div className="flex w-full max-w-7xl mx-auto p-4 gap-4">
        {/* Sidebar */}
        <aside className="w-80 bg-gray-50 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-white p-6 border-b">
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-800">ATTENDING AI</h1>
              <div className="mt-2 inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                BioMistral-7B Medical AI
              </div>
            </div>
          </div>

          {/* Emergency Button */}
          <div className="p-4">
            <button
              onClick={() => setEmergencyModal(true)}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-5 h-5" />
              Emergency
            </button>
          </div>

          {/* AI Status */}
          <div className="px-4">
            <AIStatusIndicator status={aiStatus} urgencyLevel={urgencyLevel} />
          </div>

          {/* Progress Tracker */}
          <div className="flex-1 p-4 overflow-y-auto">
            <ProgressTracker currentPhase={currentPhase} />
          </div>

          {/* Quick Summary */}
          <div className="bg-white p-4 border-t">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Assessment</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="font-medium text-gray-700">
                  {currentPhase === 'clinical-summary' ? 'Complete' : 'In Progress'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phase:</span>
                <span className="font-medium text-gray-700">
                  {formatPhase(currentPhase)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Priority:</span>
                <span className={cn(
                  "font-medium",
                  urgencyLevel === 'high' ? 'text-red-600' :
                  urgencyLevel === 'moderate' ? 'text-yellow-600' :
                  'text-green-600'
                )}>
                  {urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
          {/* Chat Header */}
          <header className="bg-white p-6 border-b">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-3">
                <Compass className="w-7 h-7 text-purple-600" />
                BioMistral Medical Assessment
              </h2>
              <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                AI-Powered Clinical Interview Active
              </p>
            </div>
          </header>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              
              {isAIProcessing && (
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white flex-shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>BioMistral AI is analyzing your medical information</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <ChatInput />
        </main>
      </div>

      {/* Modals */}
      {showDisclaimer && !hasAcceptedDisclaimer && (
        <MedicalDisclaimerModal
          onAccept={() => {
            setHasAcceptedDisclaimer(true);
            setShowDisclaimer(false);
          }}
          onDecline={() => {
            // Redirect to home or show a message
            window.location.href = '/';
          }}
        />
      )}
      {showEmergencyModal && <EmergencyModal />}
      {showClinicalSummary && <ClinicalSummary />}
    </div>
  );
};

// Helper function to format phase names
function formatPhase(phase: string): string {
  const phaseMap: Record<string, string> = {
    'chief-complaint': 'Chief Complaint',
    'hpi-development': 'HPI Development',
    'review-of-systems': 'Review of Systems',
    'medical-history': 'Medical History',
    'risk-stratification': 'Risk Assessment',
    'clinical-summary': 'Clinical Summary'
  };
  return phaseMap[phase] || phase;
}
