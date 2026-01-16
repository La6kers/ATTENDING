// =============================================================================
// ATTENDING AI - Assessment Chat Interface
// apps/patient-portal/components/assessment/AssessmentChat.tsx
//
// Main chat interface for the COMPASS patient assessment flow.
// Integrates XState machine, quick replies, and emergency detection.
// =============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMachine } from '@xstate/react';
import { 
  Send, 
  ArrowLeft, 
  RotateCcw, 
  AlertTriangle,
  MessageSquare,
  User,
  Bot,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { assessmentMachine } from '@/machines/assessmentMachine';
import { EmergencyModal } from './EmergencyModal';
import { QuickReplies, PainScaleReplies, type QuickReply } from './QuickReplies';

// ============================================================================
// Helper Functions
// ============================================================================

// Convert string array to QuickReply array
const stringsToQuickReplies = (strings: string[]): QuickReply[] =>
  strings.map((text, index) => ({
    id: `qr-${index}`,
    text,
    value: text.toLowerCase(),
  }));

// ============================================================================
// Types
// ============================================================================

interface AssessmentChatProps {
  patientName?: string;
  onComplete?: (data: any) => void;
  onEmergency?: (type: string) => void;
}

// ============================================================================
// Phase Questions Configuration
// ============================================================================

const PHASE_QUESTIONS: Record<string, {
  question: string;
  quickReplies?: string[];
  inputType?: 'text' | 'select' | 'pain-scale' | 'multiselect';
}> = {
  chiefComplaint: {
    question: "What brings you in today? Please describe your main concern or symptom.",
    quickReplies: ['Pain', 'Fever', 'Breathing problems', 'Nausea/Vomiting', 'Injury', 'Other'],
    inputType: 'text',
  },
  hpiOnset: {
    question: "When did this symptom first start?",
    quickReplies: ['Just now', 'Today', 'Yesterday', 'Few days ago', 'Week ago', 'Longer than a week'],
  },
  hpiLocation: {
    question: "Where exactly is the symptom located?",
    quickReplies: ['Head', 'Chest', 'Abdomen', 'Back', 'Arms/Legs', 'Multiple areas'],
  },
  hpiDuration: {
    question: "Is the symptom constant or does it come and go?",
    quickReplies: ['Constant', 'Comes and goes', 'Getting worse', 'Getting better', 'Stays the same'],
  },
  hpiCharacter: {
    question: "How would you describe the quality of the symptom?",
    quickReplies: ['Sharp', 'Dull', 'Aching', 'Burning', 'Throbbing', 'Pressure'],
  },
  hpiSeverity: {
    question: "On a scale of 0-10, how severe is your symptom?",
    inputType: 'pain-scale',
  },
  hpiTiming: {
    question: "Is there a specific time when the symptom is worse?",
    quickReplies: ['Morning', 'Evening', 'Night', 'After eating', 'With activity', 'No pattern'],
  },
  hpiContext: {
    question: "What were you doing when the symptom started?",
    quickReplies: ['Resting', 'Working', 'Exercising', 'Sleeping', 'Eating', 'Other activity'],
  },
  hpiModifying: {
    question: "What makes your symptom better or worse?",
    quickReplies: ['Rest helps', 'Movement helps', 'Medication helps', 'Nothing helps', 'Eating makes it worse', 'Activity makes it worse'],
  },
  reviewOfSystems: {
    question: "Have you experienced any of these additional symptoms?",
    quickReplies: ['Fever/Chills', 'Nausea/Vomiting', 'Fatigue', 'Headache', 'Dizziness', 'None of these'],
    inputType: 'multiselect',
  },
  medicalHistory: {
    question: "Do you have any chronic medical conditions?",
    quickReplies: ['None', 'Diabetes', 'High Blood Pressure', 'Heart Disease', 'Asthma/COPD', 'Other'],
    inputType: 'multiselect',
  },
  medications: {
    question: "What medications are you currently taking?",
    quickReplies: ['None', 'Blood pressure meds', 'Diabetes meds', 'Pain relievers', 'Heart meds', 'Other'],
    inputType: 'text',
  },
  allergies: {
    question: "Do you have any allergies to medications or other substances?",
    quickReplies: ['No known allergies', 'Penicillin', 'Sulfa drugs', 'Aspirin/NSAIDs', 'Food allergies', 'Other'],
  },
  socialHistory: {
    question: "A few questions about your lifestyle - do you smoke or drink alcohol?",
    quickReplies: ['Non-smoker, no alcohol', 'Former smoker', 'Current smoker', 'Social drinker', 'Prefer not to say'],
  },
  riskAssessment: {
    question: "Is there anything else you think I should know about your health?",
    quickReplies: ['No, that covers it', 'Yes, I have more to add'],
    inputType: 'text',
  },
  summary: {
    question: "I've gathered all the information. Would you like to review the summary before we connect you with a provider?",
    quickReplies: ['Review Summary', 'Connect with Provider'],
  },
};

// ============================================================================
// Component
// ============================================================================

export const AssessmentChat: React.FC<AssessmentChatProps> = ({
  patientName = 'there',
  onComplete,
  onEmergency,
}) => {
  const [state, send] = useMachine(assessmentMachine);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { 
    currentPhase, 
    messages, 
    redFlags, 
    urgencyLevel, 
    isEmergency,
    emergencyType,
    progressPercent,
    patientName: contextPatientName,
    chiefComplaint,
    hpiData,
  } = state.context;

  // For compatibility - component uses 'demographics' but machine uses direct fields
  const demographics = { firstName: (contextPatientName || patientName).split(' ')[0] };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start assessment on mount
  useEffect(() => {
    if (state.matches('idle')) {
      send({ type: 'START', patientName });
    }
  }, [send, patientName, state]);

  // Add assistant message for current phase
  useEffect(() => {
    const phaseConfig = PHASE_QUESTIONS[currentPhase];
    if (phaseConfig && !messages.some(m => m.phase === currentPhase && m.role === 'assistant')) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        send({
          type: 'ADD_MESSAGE',
          message: {
            role: 'assistant',
            content: phaseConfig.question,
            phase: currentPhase,
            quickReplies: phaseConfig.quickReplies,
          },
        });
        setIsTyping(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, messages, send]);

  // Handle text submission
  const handleSubmit = useCallback((text: string) => {
    if (!text.trim()) return;

    // Add user message
    send({
      type: 'ADD_MESSAGE',
      message: { role: 'user', content: text, phase: currentPhase },
    });

    // Route based on current phase
    switch (currentPhase) {
      case 'chiefComplaint':
        send({ type: 'SUBMIT_CHIEF_COMPLAINT', complaint: text });
        break;
      case 'hpiOnset':
        send({ type: 'SUBMIT_HPI_DATA', field: 'onset', value: text });
        break;
      case 'hpiLocation':
        send({ type: 'SUBMIT_HPI_DATA', field: 'location', value: text });
        break;
      case 'hpiDuration':
        send({ type: 'SUBMIT_HPI_DATA', field: 'duration', value: text });
        break;
      case 'hpiCharacter':
        send({ type: 'SUBMIT_HPI_DATA', field: 'character', value: text });
        break;
      case 'hpiTiming':
        send({ type: 'SUBMIT_HPI_DATA', field: 'timing', value: text });
        break;
      case 'hpiContext':
        send({ type: 'SUBMIT_HPI_DATA', field: 'context', value: text });
        break;
      case 'hpiModifying':
        send({ type: 'SUBMIT_HPI_DATA', field: 'modifyingFactors', value: { aggravating: [text] } });
        break;
      default:
        send({ type: 'NEXT' });
    }

    setInputValue('');
    setSelectedMulti([]);
  }, [currentPhase, send]);

  // Handle quick reply selection
  const handleQuickReply = useCallback((reply: QuickReply | string) => {
    const value = typeof reply === 'string' ? reply : (reply.value || reply.text);
    const phaseConfig = PHASE_QUESTIONS[currentPhase];
    
    if (phaseConfig?.inputType === 'multiselect') {
      // Toggle selection for multiselect
      setSelectedMulti(prev => 
        prev.includes(value) 
          ? prev.filter(v => v !== value)
          : [...prev, value]
      );
      return;
    }

    // Check for emergency triggers
    if (value.toLowerCase().includes('emergency')) {
      send({ type: 'TRIGGER_EMERGENCY', emergencyType: 'User Reported' });
      return;
    }

    handleSubmit(value);
  }, [currentPhase, handleSubmit, send]);

  // Handle pain scale selection
  const handlePainScale = useCallback((value: number) => {
    send({
      type: 'ADD_MESSAGE',
      message: { role: 'user', content: `Pain level: ${value}/10`, phase: currentPhase },
    });
    send({ type: 'SUBMIT_HPI_DATA', field: 'severity', value });
  }, [currentPhase, send]);

  // Handle multiselect submission
  const handleMultiSubmit = useCallback(() => {
    if (selectedMulti.length > 0) {
      handleSubmit(selectedMulti.join(', '));
    }
  }, [selectedMulti, handleSubmit]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    send({ type: 'BACK' });
  }, [send]);

  // Handle reset
  const handleReset = useCallback(() => {
    if (confirm('Are you sure you want to start over?')) {
      send({ type: 'RESET' });
    }
  }, [send]);

  // Render message bubble
  const renderMessage = (message: typeof messages[0]) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-slide-up`}
      >
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mr-2">
            <Bot className="w-5 h-5 text-white" />
          </div>
        )}
        <div
          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-md'
              : isSystem
              ? 'bg-amber-50 border border-amber-200 text-amber-800'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          <span className={`text-xs mt-1 block ${isUser ? 'text-purple-200' : 'text-gray-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ml-2">
            <User className="w-5 h-5 text-gray-600" />
          </div>
        )}
      </div>
    );
  };

  // Get current phase config
  const currentPhaseConfig = PHASE_QUESTIONS[currentPhase];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={state.matches('idle') || state.matches('welcome')}
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-semibold text-gray-800">COMPASS Assessment</h1>
            <p className="text-xs text-gray-500">
              {Math.round(progressPercent)}% complete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {redFlags.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              {redFlags.length} Alert{redFlags.length > 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={handleReset}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Start over"
          >
            <RotateCcw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-200">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(renderMessage)}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies / Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 space-y-3">
        {/* Pain Scale */}
        {currentPhaseConfig?.inputType === 'pain-scale' && (
          <PainScaleReplies onSelect={handlePainScale} />
        )}

        {/* Quick Replies */}
        {currentPhaseConfig?.quickReplies && currentPhaseConfig.inputType !== 'pain-scale' && (
          <div>
            <QuickReplies
              replies={stringsToQuickReplies(currentPhaseConfig.quickReplies)}
              onSelect={handleQuickReply}
              columns={currentPhaseConfig.quickReplies.length > 4 ? 3 : 2}
            />
            {currentPhaseConfig.inputType === 'multiselect' && selectedMulti.length > 0 && (
              <button
                onClick={handleMultiSubmit}
                className="mt-3 w-full py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                Continue with {selectedMulti.length} selected
              </button>
            )}
          </div>
        )}

        {/* Text Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(inputValue);
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your response..."
            className="flex-1 px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl 
                       hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all shadow-md hover:shadow-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Emergency Modal */}
      <EmergencyModal
        isOpen={isEmergency}
        emergencyType={emergencyType}
        redFlags={redFlags}
        patientName={demographics?.firstName}
        onDismiss={() => send({ type: 'DISMISS_EMERGENCY' })}
        onCall911={() => {
          send({ type: 'CALL_911' });
          onEmergency?.(emergencyType || 'Unknown');
        }}
        onContinueAssessment={() => {
          send({ type: 'DISMISS_EMERGENCY' });
          send({ type: 'NEXT' });
        }}
      />

      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AssessmentChat;
