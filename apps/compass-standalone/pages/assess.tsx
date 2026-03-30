// ============================================================
// COMPASS Standalone — Assessment Page
// Dark branded theme — Chat + Photo capture → Results display
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ArrowLeft, Stethoscope } from 'lucide-react';

import { useCompassStore } from '../store/useCompassStore';
import { ChatContainer } from '../components/ChatContainer';
import { ResultsPanel } from '../components/ResultsPanel';
import { EmergencyBanner } from '../components/EmergencyBanner';
import { PhotoCapture } from '../components/PhotoCapture';
import type { QuickReply } from '@attending/shared/types/chat.types';

export default function AssessPage() {
  const router = useRouter();
  const {
    isInitialized,
    initializeSession,
    messages,
    currentPhase,
    isProcessing,
    showEmergencyModal,
    setEmergencyModal,
    dismissEmergency,
    sendMessage,
    handleQuickReply: storeQuickReply,
    getProgress,
    assessmentData,
    urgencyLevel,
    redFlags,
    diagnosisResult,
    hpiNarrative,
    startNewAssessment,
    attachedImages,
    stagedImage,
    stageImage,
    clearStagedImage,
    sendImageMessage,
  } = useCompassStore();

  const [inputValue, setInputValue] = useState('');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);

  useEffect(() => {
    if (!isInitialized) initializeSession();
  }, [isInitialized, initializeSession]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const quickReplies: QuickReply[] = (lastAssistant?.metadata?.quickReplies as QuickReply[]) ?? [];

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return;
    setInputValue('');
    await sendMessage(text);
  }, [isProcessing, sendMessage]);

  const handleQuickReply = useCallback(async (reply: QuickReply) => {
    await storeQuickReply(reply);
  }, [storeQuickReply]);

  const handleBack = useCallback(() => {
    if (currentPhase !== 'results' && isInitialized) {
      if (confirm('Leave the assessment? Your progress will be lost.')) {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [currentPhase, isInitialized, router]);

  const handlePhotoCapture = useCallback((base64: string, mimeType: string) => {
    stageImage(base64, mimeType);
  }, [stageImage]);

  const handleSendImage = useCallback(async (text?: string) => {
    await sendImageMessage(text);
  }, [sendImageMessage]);

  const showResults = currentPhase === 'results';

  return (
    <>
      <Head>
        <title>COMPASS Assessment</title>
        <meta name="theme-color" content="#0C3547" />
      </Head>

      <div className="h-screen h-[100dvh] flex flex-col bg-attending-deep-navy">
        {/* Results header */}
        {showResults && (
          <header className="bg-attending-deep-navy border-b border-white/10 safe-area-top print:hidden">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-attending-light-teal" />
                <span className="text-lg font-bold text-white">COMPASS Results</span>
              </div>
            </div>
          </header>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {showResults ? (
            <div className="h-full overflow-y-auto bg-surface-bg">
              <ResultsPanel
                hpiNarrative={hpiNarrative}
                hpiData={assessmentData.hpi}
                chiefComplaint={assessmentData.chiefComplaint}
                diagnosisResult={diagnosisResult}
                redFlags={redFlags}
                urgencyLevel={urgencyLevel}
                onStartNew={() => startNewAssessment()}
                attachedImages={attachedImages}
                patientName={assessmentData.patientName}
                dateOfBirth={assessmentData.dateOfBirth}
                gender={assessmentData.gender}
              />
            </div>
          ) : isInitialized ? (
            <ChatContainer
              messages={messages}
              quickReplies={quickReplies}
              isTyping={isProcessing}
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSend={handleSend}
              onQuickReply={handleQuickReply}
              onBack={handleBack}
              progress={getProgress()}
              currentPhase={currentPhase}
              patientName={assessmentData.patientName}
              disabled={currentPhase === 'generating'}
              onPhotoClick={() => setShowPhotoCapture(true)}
              stagedImage={stagedImage}
              onRemoveStagedImage={clearStagedImage}
              onSendImage={handleSendImage}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-attending-light-teal/30 border-t-attending-light-teal rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-white/50">Initializing COMPASS...</p>
              </div>
            </div>
          )}
        </div>

        {/* Photo Capture Modal */}
        <PhotoCapture
          isOpen={showPhotoCapture}
          onClose={() => setShowPhotoCapture(false)}
          onCapture={handlePhotoCapture}
        />

        {/* Emergency Modal */}
        <EmergencyBanner
          isOpen={showEmergencyModal}
          symptoms={redFlags.map((rf) => rf.symptom)}
          patientName={assessmentData.patientName}
          onClose={() => setEmergencyModal(false)}
          onContinue={() => dismissEmergency()}
        />
      </div>
    </>
  );
}
