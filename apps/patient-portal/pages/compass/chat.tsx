// =============================================================================
// COMPASS Chat Page
// apps/patient-portal/pages/compass/chat.tsx
//
// The COMPASS landing page (/compass) redirects here after verification or
// in demo mode. This page wires the useChatStore (Zustand) state to the
// ChatContainer component from components/assessment/.
//
// URL formats:
//   /compass/chat?demo=true          — demo mode, no auth required
//   /compass/chat?session=<id>       — after verify step on landing page
//
// Submission flow:
//   User completes all phases → useChatStore.submitAssessment()
//     → POST /api/assessments/submit
//       → PatientAssessment row in DB
//         → Provider dashboard queue shows it immediately
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AlertTriangle, CheckCircle, Clock, WifiOff } from 'lucide-react';

import { useChatStore } from '../../store/useChatStore';
import { ChatContainer } from '../../components/assessment/ChatContainer';
import { EmergencyModal } from '../../components/assessment/EmergencyModal';
import type { QuickReply } from '../../components/assessment/QuickReplies';

// =============================================================================
// Submission Success Screen
// =============================================================================

const SubmissionSuccess: React.FC<{
  queuePosition?: number;
  triageLevel?: string;
  onNewAssessment: () => void;
}> = ({ queuePosition, triageLevel, onNewAssessment }) => {
  const isUrgent = triageLevel === 'EMERGENCY' || triageLevel === 'HIGH';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg ${
          isUrgent ? 'bg-red-100' : 'bg-green-100'
        }`}>
          {isUrgent
            ? <AlertTriangle className="w-10 h-10 text-red-600" />
            : <CheckCircle className="w-10 h-10 text-green-600" />
          }
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isUrgent ? 'Urgent Assessment Submitted' : 'Assessment Submitted'}
        </h1>

        <p className="text-gray-600 mb-6">
          {isUrgent
            ? 'Your assessment has been flagged as urgent and a provider has been notified immediately.'
            : 'Your assessment is in the review queue. A provider will be prepared for your visit.'
          }
        </p>

        {queuePosition && (
          <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-4 py-2 mb-6">
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              {isUrgent ? 'Priority review' : `Queue position: #${queuePosition}`}
            </span>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm font-semibold text-amber-800 mb-1">Medical Emergency?</p>
          <p className="text-sm text-amber-700">
            If your condition worsens, call <strong>911</strong> immediately or go to your nearest emergency room.
          </p>
        </div>

        <button
          onClick={onNewAssessment}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
        >
          Start New Assessment
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export default function CompassChatPage() {
  const router = useRouter();
  const { demo, session } = router.query;

  const {
    isInitialized,
    initializeSession,
    resetSession,
    messages,
    currentPhase,
    isAIProcessing,
    showEmergencyModal,
    setEmergencyModal,
    handleEmergency,
    sendMessage,
    handleQuickReply: storeHandleQuickReply,
    submitAssessment,
    getProgress,
    assessmentData,
    urgencyLevel,   // top-level store field, not inside assessmentData
    redFlags,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    queuePosition?: number;
    triageLevel?: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize or restore session on mount
  useEffect(() => {
    if (!isInitialized) {
      if (session && typeof session === 'string') {
        try {
          const stored = sessionStorage.getItem('compass-session');
          if (stored) {
            JSON.parse(stored); // validate; actual merge handled by store
          }
        } catch (_) { /* ignore parse errors */ }
      }
      initializeSession();
    }
  }, [isInitialized, initializeSession, session]);

  // Extract quick replies from the latest assistant message
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  const quickReplies: QuickReply[] =
    (lastAssistantMessage?.metadata?.quickReplies as QuickReply[]) ?? [];

  // Handle text send
  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isAIProcessing) return;
    setInputValue('');

    if (text === 'submit') {
      await handleSubmitAssessment();
      return;
    }

    await sendMessage(text);
  }, [isAIProcessing, sendMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle quick reply selection
  const handleQuickReply = useCallback(async (reply: QuickReply) => {
    const value = reply.value || reply.text;
    if (value === 'submit') {
      await handleSubmitAssessment();
      return;
    }
    await storeHandleQuickReply(reply);
  }, [storeHandleQuickReply]); // eslint-disable-line react-hooks/exhaustive-deps

  // Submit assessment to backend via the store action
  // useChatStore.submitAssessment() calls POST /api/assessments/submit internally
  const handleSubmitAssessment = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitAssessment();
      // Store transitions currentPhase to 'complete' on success
      setSubmissionResult({
        triageLevel: urgencyLevel?.toUpperCase(),
      });
    } catch (_) {
      setSubmitError('Failed to submit assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, submitAssessment, urgencyLevel]);

  // Back navigation — preserve progress warning
  const handleBack = useCallback(() => {
    if (currentPhase !== 'complete' && isInitialized) {
      if (confirm('Are you sure you want to leave? Your progress will be saved.')) {
        router.push('/compass');
      }
    } else {
      router.push('/compass');
    }
  }, [currentPhase, isInitialized, router]);

  // Start fresh
  const handleNewAssessment = useCallback(() => {
    resetSession();
    setSubmissionResult(null);
    setSubmitError(null);
    initializeSession();
  }, [resetSession, initializeSession]);

  // Show success screen after submission completes
  if (currentPhase === 'complete' && submissionResult) {
    return (
      <SubmissionSuccess
        queuePosition={submissionResult.queuePosition}
        triageLevel={submissionResult.triageLevel}
        onNewAssessment={handleNewAssessment}
      />
    );
  }

  return (
    <>
      <Head>
        <title>COMPASS Assessment | ATTENDING AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#7c3aed" />
      </Head>

      <div className="h-screen flex flex-col bg-gradient-to-b from-purple-50 to-white">

        {/* Demo mode notice */}
        {demo === 'true' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
            <p className="text-xs text-amber-700 font-medium">
              Demo Mode — responses will not be saved to a real patient record
            </p>
          </div>
        )}

        {/* Submission error */}
        {submitError && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2">
            <div className="flex items-center gap-2 max-w-3xl mx-auto">
              <WifiOff className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">{submitError}</p>
              <button
                onClick={() => setSubmitError(null)}
                className="text-red-400 hover:text-red-600 text-lg leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Chat interface — fills remaining height */}
        <div className="flex-1 overflow-hidden">
          {isInitialized ? (
            <ChatContainer
              messages={messages}
              quickReplies={quickReplies}
              isTyping={isAIProcessing || isSubmitting}
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSend={handleSend}
              onQuickReply={handleQuickReply}
              onBack={handleBack}
              progress={getProgress()}
              currentPhase={currentPhase}
              patientName={assessmentData.patientName || undefined}
              disabled={currentPhase === 'complete' || isSubmitting}
              showVoiceInput={false}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 text-sm">Initializing COMPASS...</p>
              </div>
            </div>
          )}
        </div>

        {/* Emergency Modal — triggered when critical red flags detected */}
        <EmergencyModal
          isOpen={showEmergencyModal}
          emergencyType="Medical Emergency"
          symptoms={redFlags.map((rf) => (typeof rf === 'string' ? rf : rf.symptom))}
          patientName={assessmentData.patientName?.split(' ')[0]}
          onClose={() => setEmergencyModal(false)}
          onCall911={() => {
            if (typeof window !== 'undefined') {
              window.location.href = 'tel:911';
            }
          }}
          onFindER={() => {
            if (typeof window !== 'undefined') {
              window.open('https://www.google.com/maps/search/emergency+room+near+me', '_blank');
            }
          }}
          onContinueAssessment={() => {
            setEmergencyModal(false);
            handleEmergency();
          }}
        />
      </div>
    </>
  );
}
