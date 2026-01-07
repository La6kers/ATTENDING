// COMPASS Chat Page - AI-Powered Medical Assessment
// Patient Portal: apps/patient-portal/pages/chat/index.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  Send, 
  AlertTriangle, 
  Phone, 
  ArrowLeft, 
  Loader2,
  Shield,
  Heart,
  CheckCircle,
  Info,
  ChevronRight
} from 'lucide-react';
import type { 
  ChatMessage, 
  AssessmentPhase, 
  UrgencyLevel,
  ClinicalData,
} from '@attending/shared';

// Phase configuration for progress tracking
const PHASE_CONFIG: Record<AssessmentPhase, { label: string; step: number }> = {
  'chief-complaint': { label: 'Chief Complaint', step: 1 },
  'hpi-development': { label: 'History of Present Illness', step: 2 },
  'review-of-systems': { label: 'Review of Systems', step: 3 },
  'medical-history': { label: 'Medical History', step: 4 },
  'risk-stratification': { label: 'Risk Assessment', step: 5 },
  'clinical-summary': { label: 'Summary', step: 6 },
};

const TOTAL_PHASES = 6;

// Emergency keywords for detection
const EMERGENCY_KEYWORDS = [
  'chest pain', 'can\'t breathe', 'difficulty breathing', 'bleeding heavily',
  'unconscious', 'stroke', 'heart attack', 'severe pain', 'suicidal',
  'overdose', 'poisoning', 'choking'
];

export default function CompassChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<AssessmentPhase>('chief-complaint');
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>('standard');
  const [showEmergencyBanner, setShowEmergencyBanner] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  
  // Clinical data accumulated during assessment
  const [clinicalData, setClinicalData] = useState<Partial<ClinicalData>>({
    chiefComplaint: '',
    hpi: {},
    ros: {},
    pmh: {},
    medications: [],
    allergies: [],
    riskFactors: [],
    redFlags: [],
  });

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm COMPASS, your AI medical assessment assistant. I'm here to help gather information about your health concerns before your visit.

**Important:** This is not a substitute for emergency care. If you're experiencing a medical emergency, please call 911 immediately.

To get started, please tell me: **What brings you in today?** Describe your main health concern or symptoms.`,
      timestamp: new Date().toISOString(),
      metadata: {
        phase: 'chief-complaint',
        quickReplies: [],
      },
    };
    setMessages([welcomeMessage]);
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for emergency keywords
  const checkForEmergency = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase();
    return EMERGENCY_KEYWORDS.some(keyword => lowerText.includes(keyword));
  }, []);

  // Handle message submission
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setQuickReplies([]);
    setIsLoading(true);

    // Check for emergency
    if (checkForEmergency(userMessage.content)) {
      setShowEmergencyBanner(true);
      setUrgencyLevel('high');
    }

    try {
      // Call AI service
      const response = await fetch('/api/chat/compass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: userMessage.content,
          currentPhase,
          clinicalData,
          messageHistory: messages.slice(-10), // Last 10 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        metadata: {
          phase: data.nextPhase,
          urgencyLevel: data.urgencyLevel,
          quickReplies: data.quickReplies || [],
          clinicalData: data.clinicalExtraction,
        },
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentPhase(data.nextPhase);
      setQuickReplies(data.quickReplies || []);
      
      if (data.urgencyLevel === 'high') {
        setUrgencyLevel('high');
        setShowEmergencyBanner(true);
      } else if (data.urgencyLevel === 'moderate' && urgencyLevel !== 'high') {
        setUrgencyLevel('moderate');
      }

      // Update clinical data
      if (data.clinicalExtraction) {
        setClinicalData(prev => ({
          ...prev,
          ...data.clinicalExtraction.extractedData,
          redFlags: [...(prev.redFlags || []), ...(data.clinicalExtraction.redFlags || [])],
          riskFactors: [...(prev.riskFactors || []), ...(data.clinicalExtraction.riskFactors || [])],
        }));
      }

      // Check if assessment is complete
      if (data.nextPhase === 'clinical-summary' && data.isComplete) {
        setIsComplete(true);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an issue processing your response. Please try again, or if the problem persists, contact support.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Handle quick reply selection
  const handleQuickReply = (reply: string) => {
    setInputValue(reply);
    // Auto-submit after brief delay
    setTimeout(() => {
      setInputValue(reply);
      handleSendMessage();
    }, 100);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  // Handle assessment completion
  const handleComplete = async () => {
    try {
      const response = await fetch('/api/assessments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          clinicalData,
          urgencyLevel,
          messages: messages.filter(m => m.role !== 'system'),
        }),
      });

      if (response.ok) {
        router.push('/chat/complete');
      }
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  // Calculate progress percentage
  const progressPercent = ((PHASE_CONFIG[currentPhase]?.step || 1) / TOTAL_PHASES) * 100;

  return (
    <>
      <Head>
        <title>COMPASS Assessment | ATTENDING Patient Portal</title>
        <meta name="description" content="AI-powered medical assessment" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800">
        {/* Emergency Banner */}
        {showEmergencyBanner && (
          <div className="bg-red-600 text-white px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
                <span className="font-semibold">
                  If this is an emergency, please call 911 immediately
                </span>
              </div>
              <a 
                href="tel:911" 
                className="flex items-center space-x-2 bg-white text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-50 transition"
              >
                <Phone className="h-5 w-5" />
                <span>Call 911</span>
              </a>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/')}
                className="flex items-center text-white/80 hover:text-white transition"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                <span>Back to Portal</span>
              </button>
              
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-400" />
                <span className="text-white text-sm">HIPAA Secure</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-white/80 text-sm mb-2">
                <span>{PHASE_CONFIG[currentPhase]?.label || 'Assessment'}</span>
                <span>Step {PHASE_CONFIG[currentPhase]?.step || 1} of {TOTAL_PHASES}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Chat Container */}
        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
            {/* Messages Area */}
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div 
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                        }}
                      />
                      <div className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        <span className="text-gray-500">COMPASS is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              {quickReplies.length > 0 && !isLoading && (
                <div className="px-6 py-3 border-t bg-gray-50">
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickReply(reply)}
                        className="px-4 py-2 bg-white border border-indigo-200 rounded-full text-sm text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              {!isComplete ? (
                <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
                  <div className="flex items-center space-x-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Type your response..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isLoading}
                      className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 border-t bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Assessment Complete
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Your information has been gathered. Click below to submit to your healthcare provider.
                    </p>
                    <button
                      onClick={handleComplete}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition flex items-center mx-auto"
                    >
                      Submit Assessment
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Urgency Indicator */}
          {urgencyLevel !== 'standard' && (
            <div className={`mt-4 p-4 rounded-xl flex items-center space-x-3 ${
              urgencyLevel === 'high' 
                ? 'bg-red-500/20 border border-red-400/50' 
                : 'bg-yellow-500/20 border border-yellow-400/50'
            }`}>
              <AlertTriangle className={`h-5 w-5 ${
                urgencyLevel === 'high' ? 'text-red-400' : 'text-yellow-400'
              }`} />
              <span className="text-white text-sm">
                {urgencyLevel === 'high' 
                  ? 'Your symptoms may require urgent attention. A provider will be notified immediately.'
                  : 'Based on your symptoms, we recommend speaking with a provider soon.'}
              </span>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
