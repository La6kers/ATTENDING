// ============================================================
// COMPASS Standalone — Assessment Page
// Dark branded theme — Chat + Photo capture → Results display
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { ArrowLeft, Compass } from 'lucide-react';

import { useCompassStore } from '../store/useCompassStore';
import { useShallow } from 'zustand/react/shallow';
import { ChatContainer } from '../components/ChatContainer';
import { EmergencyBanner } from '../components/EmergencyBanner';
import type { QuickReply } from '@attending/shared/types/chat.types';

// Dynamic imports — loaded only when needed (code splitting)
const ResultsPanel = dynamic(() => import('../components/ResultsPanel').then(m => ({ default: m.ResultsPanel })), {
  loading: () => <div className="h-full flex items-center justify-center"><div className="w-10 h-10 border-4 border-attending-light-teal/30 border-t-attending-light-teal rounded-full animate-spin" /></div>,
});
const PhotoCapture = dynamic(() => import('../components/PhotoCapture').then(m => ({ default: m.PhotoCapture })), {
  ssr: false,
});

export default function AssessPage() {
  const router = useRouter();
  // Split selectors to reduce unnecessary re-renders
  const {
    isInitialized, initializeSession, messages, currentPhase, isProcessing,
    showEmergencyModal, setEmergencyModal, dismissEmergency,
    sendMessage, handleQuickReply: storeQuickReply, getProgress,
    assessmentData, urgencyLevel, redFlags, diagnosisResult, hpiNarrative,
    startNewAssessment, attachedImages, stagedImage, stageImage,
    clearStagedImage, sendImageMessage,
  } = useCompassStore(useShallow((s) => ({
    isInitialized: s.isInitialized,
    initializeSession: s.initializeSession,
    messages: s.messages,
    currentPhase: s.currentPhase,
    isProcessing: s.isProcessing,
    showEmergencyModal: s.showEmergencyModal,
    setEmergencyModal: s.setEmergencyModal,
    dismissEmergency: s.dismissEmergency,
    sendMessage: s.sendMessage,
    handleQuickReply: s.handleQuickReply,
    getProgress: s.getProgress,
    assessmentData: s.assessmentData,
    urgencyLevel: s.urgencyLevel,
    redFlags: s.redFlags,
    diagnosisResult: s.diagnosisResult,
    hpiNarrative: s.hpiNarrative,
    startNewAssessment: s.startNewAssessment,
    attachedImages: s.attachedImages,
    stagedImage: s.stagedImage,
    stageImage: s.stageImage,
    clearStagedImage: s.clearStagedImage,
    sendImageMessage: s.sendImageMessage,
  })));

  const [inputValue, setInputValue] = useState('');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);

  useEffect(() => {
    if (!isInitialized) initializeSession();
  }, [isInitialized, initializeSession]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const quickReplies: QuickReply[] = (lastAssistant?.metadata?.quickReplies as QuickReply[]) ?? [];
  const isMultiSelect = lastAssistant?.metadata?.multiSelect ?? false;

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

  const handlePhotoCapture = useCallback((base64: string, mimeType: string, bodyRegion?: string, shotLabel?: string) => {
    stageImage(base64, mimeType, bodyRegion, shotLabel);
  }, [stageImage]);

  const handlePhotoCaptureAll = useCallback(async (photos: { base64: string; mimeType: string; bodyRegion: string; shotLabel: string }[]) => {
    const { sendMultipleImages } = useCompassStore.getState();
    await sendMultipleImages(photos);
  }, []);

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
                <Compass className="w-5 h-5 text-attending-light-teal" />
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
              multiSelect={isMultiSelect}
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
          onCaptureAll={handlePhotoCaptureAll}
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
