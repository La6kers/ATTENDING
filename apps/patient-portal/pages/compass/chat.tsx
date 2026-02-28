// ============================================================
// ATTENDING AI — COMPASS Chat (Assessment Flow)
// apps/patient-portal/pages/compass/chat.tsx
//
// Rebranded for ATTENDING teal. Wires useChatStore (Zustand)
// to ChatContainer for the OLDCARTS assessment flow.
//
// URL formats:
//   /compass/chat?demo=true      — demo mode
//   /compass/chat?session=<id>   — after verify on landing page
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AlertTriangle, CheckCircle, Clock, WifiOff, Stethoscope, ArrowLeft, Home } from 'lucide-react';

import { useChatStore } from '../../store/useChatStore';
import { ChatContainer } from '../../components/assessment/ChatContainer';
import { EmergencyModal } from '../../components/assessment/EmergencyModal';
import type { QuickReply } from '../../components/assessment/QuickReplies';

// ============================================================
// Submission Success
// ============================================================

const SubmissionSuccess: React.FC<{
  queuePosition?: number;
  triageLevel?: string;
  onNewAssessment: () => void;
  onGoHome: () => void;
}> = ({ queuePosition, triageLevel, onNewAssessment, onGoHome }) => {
  const isUrgent = triageLevel === 'EMERGENCY' || triageLevel === 'HIGH';

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-5">
      <div className="max-w-md w-full text-center">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isUrgent ? 'bg-red-100' : 'bg-green-100'
          }`}
          style={{ boxShadow: isUrgent ? '0 4px 14px rgba(220,38,38,0.2)' : '0 4px 14px rgba(34,197,94,0.2)' }}
        >
          {isUrgent ? (
            <AlertTriangle className="w-10 h-10 text-red-600" />
          ) : (
            <CheckCircle className="w-10 h-10 text-green-600" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-attending-deep-navy mb-2">
          {isUrgent ? 'Urgent Assessment Submitted' : 'Assessment Submitted'}
        </h1>

        <p className="text-sm text-attending-200 mb-6">
          {isUrgent
            ? 'Your assessment has been flagged as urgent. A provider has been notified.'
            : 'Your assessment is in the review queue. Your provider will be prepared for your visit.'}
        </p>

        {queuePosition && (
          <div className="inline-flex items-center gap-2 bg-attending-50 text-attending-primary border border-attending-200 rounded-full px-4 py-2 mb-6">
            <Clock className="w-4 h-4" />
            <span className="font-medium text-sm">
              {isUrgent ? 'Priority review' : `Queue position: #${queuePosition}`}
            </span>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm font-semibold text-amber-800 mb-1">Medical Emergency?</p>
          <p className="text-sm text-amber-700">
            If your condition worsens, call <strong>911</strong> or go to your nearest emergency room.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onGoHome}
            className="w-full py-3.5 bg-attending-primary text-white rounded-xl font-semibold hover:shadow-teal transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </button>
          <button
            onClick={onNewAssessment}
            className="w-full py-3 bg-white border border-light text-attending-primary rounded-xl font-semibold hover:bg-attending-50 transition-all"
          >
            Start New Assessment
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Main
// ============================================================

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
    urgencyLevel,
    redFlags,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    queuePosition?: number;
    triageLevel?: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Init session
  useEffect(() => {
    if (!isInitialized) {
      if (session && typeof session === 'string') {
        try {
          const stored = sessionStorage.getItem('compass-session');
          if (stored) JSON.parse(stored);
        } catch { /* ignore */ }
      }
      initializeSession();
    }
  }, [isInitialized, initializeSession, session]);

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  const quickReplies: QuickReply[] =
    (lastAssistantMessage?.metadata?.quickReplies as QuickReply[]) ?? [];

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isAIProcessing) return;
      setInputValue('');
      if (text === 'submit') {
        await handleSubmitAssessment();
        return;
      }
      await sendMessage(text);
    },
    [isAIProcessing, sendMessage] // eslint-disable-line
  );

  const handleQuickReply = useCallback(
    async (reply: QuickReply) => {
      const value = reply.value || reply.text;
      if (value === 'submit') {
        await handleSubmitAssessment();
        return;
      }
      await storeHandleQuickReply(reply);
    },
    [storeHandleQuickReply] // eslint-disable-line
  );

  const handleSubmitAssessment = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitAssessment();
      setSubmissionResult({ triageLevel: urgencyLevel?.toUpperCase() });
    } catch {
      setSubmitError('Failed to submit assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, submitAssessment, urgencyLevel]);

  const handleBack = useCallback(() => {
    if (currentPhase !== 'complete' && isInitialized) {
      if (confirm('Leave the assessment? Your progress will be saved.')) {
        router.push('/home');
      }
    } else {
      router.push('/home');
    }
  }, [currentPhase, isInitialized, router]);

  const handleNewAssessment = useCallback(() => {
    resetSession();
    setSubmissionResult(null);
    setSubmitError(null);
    initializeSession();
  }, [resetSession, initializeSession]);

  // Success screen
  if (currentPhase === 'complete' && submissionResult) {
    return (
      <SubmissionSuccess
        queuePosition={submissionResult.queuePosition}
        triageLevel={submissionResult.triageLevel}
        onNewAssessment={handleNewAssessment}
        onGoHome={() => router.push('/home')}
      />
    );
  }

  return (
    <>
      <Head>
        <title>COMPASS Assessment | ATTENDING AI</title>
        <meta name="theme-color" content="#0C4C5E" />
      </Head>

      <div className="h-screen h-[100dvh] flex flex-col bg-surface-bg">
        {/* Header */}
        <header className="bg-white border-b border-light safe-area-top">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={handleBack}
              className="w-9 h-9 rounded-full bg-attending-50 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-attending-deep-navy" />
            </button>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-attending-primary" />
              <span className="text-lg font-bold text-attending-deep-navy">COMPASS</span>
            </div>
          </div>
        </header>

        {/* Demo notice */}
        {demo === 'true' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
            <p className="text-xs text-amber-700 font-medium">
              Demo Mode — responses are not saved to a patient record
            </p>
          </div>
        )}

        {/* Submit error */}
        {submitError && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2">
            <div className="flex items-center gap-2 max-w-lg mx-auto">
              <WifiOff className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">{submitError}</p>
              <button onClick={() => setSubmitError(null)} className="text-red-400 hover:text-red-600 text-lg">
                ×
              </button>
            </div>
          </div>
        )}

        {/* Chat */}
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
                <div className="w-12 h-12 border-4 border-attending-200 border-t-attending-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-attending-200">Initializing COMPASS...</p>
              </div>
            </div>
          )}
        </div>

        {/* Emergency Modal */}
        <EmergencyModal
          isOpen={showEmergencyModal}
          emergencyType="Medical Emergency"
          symptoms={redFlags.map((rf) => (typeof rf === 'string' ? rf : rf.symptom))}
          patientName={assessmentData.patientName?.split(' ')[0]}
          onClose={() => setEmergencyModal(false)}
          onCall911={() => {
            if (typeof window !== 'undefined') window.location.href = 'tel:911';
          }}
          onFindER={() => {
            if (typeof window !== 'undefined')
              window.open('https://www.google.com/maps/search/emergency+room+near+me', '_blank');
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
