// ============================================================
// COMPASS Chat Page - Enhanced with WebSocket
// apps/patient-portal/pages/chat/index.tsx
//
// Main chat interface for patient symptom assessment
// ============================================================

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useChatStore } from '../../store/useChatStore';
import { ChatContainer } from '../../components/chat/ChatContainer';
import { useWebSocket } from '../../hooks/useWebSocket';
import { CheckCircle, Wifi, WifiOff, Clock, AlertCircle } from 'lucide-react';

export default function CompassChatPage() {
  const router = useRouter();
  const { 
    sessionId,
    isInitialized, 
    initializeSession, 
    resetSession,
    currentPhase,
  } = useChatStore();

  // WebSocket connection
  const { 
    isConnected, 
    isConnecting, 
    queuePosition,
    error: wsError 
  } = useWebSocket({
    sessionId: sessionId || '',
    autoConnect: !!sessionId,
  });

  const [showConnectionStatus, setShowConnectionStatus] = useState(false);

  // Initialize session on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeSession();
    }
  }, [isInitialized, initializeSession]);

  // Handle page unload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isInitialized && currentPhase !== 'complete') {
        e.preventDefault();
        e.returnValue = 'You have an assessment in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isInitialized, currentPhase]);

  return (
    <>
      <Head>
        <title>COMPASS - Health Assessment | ATTENDING</title>
        <meta 
          name="description" 
          content="AI-powered symptom assessment chatbot" 
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="h-screen flex flex-col bg-gray-50">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentPhase !== 'complete' && isInitialized) {
                  if (confirm('Are you sure you want to leave? Your progress will be saved.')) {
                    router.push('/');
                  }
                } else {
                  router.push('/');
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Back to portal"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">COMPASS Assessment</h1>
              <p className="text-xs text-gray-500">Powered by ATTENDING AI</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Status Indicator */}
            <button
              onClick={() => setShowConnectionStatus(!showConnectionStatus)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              {isConnecting ? (
                <>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <span className="hidden sm:inline">Connecting...</span>
                </>
              ) : isConnected ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="hidden sm:inline">Connected</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                  <span className="hidden sm:inline">Offline Mode</span>
                </>
              )}
            </button>

            {/* Queue Position (shown after submission) */}
            {queuePosition && currentPhase === 'complete' && (
              <div className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg">
                <Clock className="w-4 h-4" />
                <span>Queue: #{queuePosition}</span>
              </div>
            )}

            {/* Reset Button */}
            <button
              onClick={() => {
                if (confirm('Are you sure you want to start over? Your current progress will be lost.')) {
                  resetSession();
                  initializeSession();
                }
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Start Over
            </button>
          </div>
        </header>

        {/* Connection Status Dropdown */}
        {showConnectionStatus && (
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-start gap-3 text-sm">
                {isConnected ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">Real-time connection active</p>
                      <p className="text-gray-500 mt-1">
                        Your assessment will be sent directly to available providers when submitted.
                      </p>
                    </div>
                  </>
                ) : wsError ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">Working in offline mode</p>
                      <p className="text-gray-500 mt-1">
                        Your assessment will be queued and submitted when connection is restored.
                        {wsError && <span className="text-red-500 block mt-1">Error: {wsError}</span>}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">Connecting to server...</p>
                      <p className="text-gray-500 mt-1">
                        Please wait while we establish a connection.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submission Success Banner */}
        {currentPhase === 'complete' && (
          <div className="bg-green-50 border-b border-green-200 px-4 py-4">
            <div className="max-w-3xl mx-auto flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900">Assessment Submitted Successfully!</h3>
                <p className="text-green-700 text-sm mt-1">
                  Your assessment has been sent to our care team. 
                  {queuePosition && (
                    <span> You are #{queuePosition} in the review queue.</span>
                  )}
                </p>
                <p className="text-green-600 text-xs mt-2">
                  A provider will review your information shortly. If your condition worsens, 
                  please call 911 or visit the nearest emergency room.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chat Container */}
        <main className="flex-1 overflow-hidden">
          {isInitialized ? (
            <ChatContainer />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Initializing COMPASS...</p>
              </div>
            </div>
          )}
        </main>

        {/* Footer Disclaimer */}
        <footer className="bg-gray-100 border-t border-gray-200 px-4 py-2">
          <p className="text-xs text-gray-500 text-center">
            <strong>Disclaimer:</strong> COMPASS is for informational purposes only and does not provide medical advice, diagnosis, or treatment. 
            For medical emergencies, call 911 immediately.
          </p>
        </footer>
      </div>
    </>
  );
}
