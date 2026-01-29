import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Clock, 
  AlertTriangle, 
  User, 
  Sparkles, 
  RefreshCw, 
  Check, 
  X,
  Send,
  Edit3 
} from 'lucide-react';

interface ProviderMessage {
  id: string;
  patientId: string;
  patientName: string;
  chatSummary: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  timestamp: string;
  messageType: 'chat-summary' | 'urgent-alert' | 'general';
  status: 'unread' | 'read' | 'responded';
  medicalContext?: {
    currentMedications: any[];
    recentVitals: any;
    activeAlerts: any[];
  };
}

// AI Response Generator (simulated)
const generateAIResponse = (message: ProviderMessage): string => {
  const patientFirstName = message.patientName.split(' ')[0];
  const isUrgent = message.urgencyLevel === 'high';
  
  // Generate contextual response based on message content
  if (message.chatSummary.toLowerCase().includes('medication') || 
      message.chatSummary.toLowerCase().includes('refill')) {
    return `Dear ${patientFirstName},

Thank you for reaching out about your medication. I've reviewed your request and your current prescription history.

I've approved your refill request and sent it to your pharmacy. It should be ready for pickup within 2-4 hours.

Please remember to:
• Take your medication as prescribed
• Contact us if you experience any side effects
• Schedule a follow-up appointment if you haven't had one in the past 6 months

If you have any questions or concerns, don't hesitate to reach out.

Best regards,
Dr. Reed`;
  }
  
  if (message.chatSummary.toLowerCase().includes('pain') || 
      message.chatSummary.toLowerCase().includes('symptom')) {
    return `Dear ${patientFirstName},

Thank you for reporting your symptoms. I've carefully reviewed your message${isUrgent ? ' and understand this is urgent' : ''}.

Based on what you've described, I recommend the following:

${isUrgent ? '**IMPORTANT:** Given the severity of your symptoms, please consider going to the emergency room if symptoms worsen or if you experience any of the following: difficulty breathing, chest pain, severe dizziness, or loss of consciousness.\n\n' : ''}1. Continue monitoring your symptoms
2. Keep a log of when symptoms occur and their severity
3. Stay hydrated and get adequate rest

I'd like to schedule a follow-up appointment to evaluate your condition further. Please use our online portal or call our office to schedule at your earliest convenience.

Best regards,
Dr. Reed`;
  }
  
  if (message.chatSummary.toLowerCase().includes('lab') || 
      message.chatSummary.toLowerCase().includes('test') ||
      message.chatSummary.toLowerCase().includes('result')) {
    return `Dear ${patientFirstName},

Thank you for your inquiry about your lab results.

I've reviewed your recent lab work and would like to discuss the findings with you. ${isUrgent ? 'Some results require prompt attention.' : 'Overall, most values are within normal ranges.'}

I've ordered the following labs for you:
• Complete Blood Count (CBC)
• Basic Metabolic Panel
• Lipid Panel

**Preparation:** Please fast for 12 hours before your blood draw (water is okay).

After we receive your results, I'll follow up with you to discuss next steps.

Best regards,
Dr. Reed`;
  }
  
  // Default response
  return `Dear ${patientFirstName},

Thank you for reaching out. I've reviewed your message and appreciate you keeping us informed about your health.

I will look into this matter and get back to you as soon as possible. If your condition changes or you have any urgent concerns, please don't hesitate to contact our office directly or seek emergency care if needed.

Best regards,
Dr. Reed`;
};

const PatientMessaging = () => {
  const [messages, setMessages] = useState<ProviderMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ProviderMessage | null>(null);
  const [response, setResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIDraft, setShowAIDraft] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Simulate real-time message updates
  useEffect(() => {
    const checkForMessages = () => {
      try {
        const storedMessages = localStorage.getItem('providerMessages');
        if (storedMessages) {
          const parsedMessages = JSON.parse(storedMessages);
          setMessages(parsedMessages);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    checkForMessages();
    const interval = setInterval(checkForMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  // Generate AI response when message is selected
  useEffect(() => {
    if (selectedMessage && !response) {
      handleGenerateAI();
    }
  }, [selectedMessage]);

  const handleGenerateAI = async () => {
    if (!selectedMessage) return;
    
    setIsGenerating(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      const generatedResponse = generateAIResponse(selectedMessage);
      setAiDraft(generatedResponse);
      setShowAIDraft(true);
    } catch (error) {
      console.error('Failed to generate AI response:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseDraft = () => {
    setResponse(aiDraft);
    setShowAIDraft(false);
    textareaRef.current?.focus();
  };

  const markAsRead = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status: 'read' } : msg
    ));
    
    const updatedMessages = messages.map(msg => 
      msg.id === messageId ? { ...msg, status: 'read' } : msg
    );
    localStorage.setItem('providerMessages', JSON.stringify(updatedMessages));
  };

  const sendResponse = (messageId: string) => {
    if (!response.trim()) return;

    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status: 'responded' } : msg
    ));

    alert(`Response sent to patient: "${response}"`);
    setResponse('');
    setAiDraft('');
    setShowAIDraft(false);
    setSelectedMessage(null);
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread': return 'bg-blue-100 text-blue-800';
      case 'read': return 'bg-gray-100 text-gray-800';
      case 'responded': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Patient Messages</h2>
            <p className="text-sm text-gray-600">Chat summaries and urgent communications</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              messages.filter(m => m.status === 'unread').length > 0 
                ? 'bg-red-100 text-red-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {messages.filter(m => m.status === 'unread').length} unread
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Messages Yet</h3>
            <p className="text-gray-500">Patient messages and chat summaries will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedMessage?.id === message.id ? 'ring-2 ring-purple-500' : ''
                } ${message.status === 'unread' ? 'border-purple-200 bg-purple-50' : 'border-gray-200'}`}
                onClick={() => {
                  setSelectedMessage(message);
                  setResponse('');
                  setAiDraft('');
                  setShowAIDraft(false);
                  if (message.status === 'unread') {
                    markAsRead(message.id);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{message.patientName}</span>
                        <span className="text-sm text-gray-500">({message.patientId})</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(message.urgencyLevel)}`}>
                        {message.urgencyLevel} priority
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                        {message.status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {message.chatSummary.length > 150 
                        ? `${message.chatSummary.substring(0, 150)}...` 
                        : message.chatSummary}
                    </p>

                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(message.timestamp).toLocaleString()}
                    </div>
                  </div>

                  {message.urgencyLevel === 'high' && (
                    <AlertTriangle className="h-5 w-5 text-red-500 ml-3 animate-pulse" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Message from {selectedMessage.patientName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedMessage.timestamp).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedMessage(null);
                    setResponse('');
                    setAiDraft('');
                    setShowAIDraft(false);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Chat Summary */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 text-sm uppercase tracking-wide">
                  Patient Message Summary
                </h4>
                <div className="clinical-note-modern bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <div className="whitespace-pre-wrap">{selectedMessage.chatSummary}</div>
                </div>
              </div>

              {/* Medical Context */}
              {selectedMessage.medicalContext && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 text-sm uppercase tracking-wide">
                    Medical Context
                  </h4>
                  <div className="bg-blue-50 rounded-xl p-5 text-sm border border-blue-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <strong className="text-blue-900">Current Medications:</strong>
                        <ul className="mt-2 space-y-1">
                          {selectedMessage.medicalContext.currentMedications?.map((med, idx) => (
                            <li key={idx} className="text-blue-800">
                              • {med.name} {med.dose} - {med.schedule}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong className="text-blue-900">Recent Vitals:</strong>
                        <div className="mt-2 text-blue-800 space-y-1">
                          <div>BP: {selectedMessage.medicalContext.recentVitals?.bloodPressure?.current}</div>
                          <div>HR: {selectedMessage.medicalContext.recentVitals?.heartRate?.current} bpm</div>
                          <div>Glucose: {selectedMessage.medicalContext.recentVitals?.glucose?.current} mg/dL</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Draft Suggestion */}
              {showAIDraft && aiDraft && !response && (
                <div className="ai-suggestion-card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="ai-suggestion-badge">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI-Generated Draft Response
                    </div>
                    <button
                      onClick={() => setShowAIDraft(false)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="ai-draft-preview mb-4">
                    <div className="whitespace-pre-wrap">{aiDraft}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleUseDraft}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 
                               bg-gradient-to-r from-purple-600 to-indigo-600 text-white 
                               rounded-xl font-medium hover:shadow-lg transition-all"
                    >
                      <Check className="w-4 h-4" />
                      Use This Draft & Edit
                    </button>
                    <button
                      onClick={handleGenerateAI}
                      disabled={isGenerating}
                      className="flex items-center gap-2 py-2.5 px-4 border-2 border-purple-200 
                               text-purple-700 rounded-xl font-medium hover:bg-purple-50 transition-all"
                    >
                      <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                      Regenerate
                    </button>
                  </div>
                </div>
              )}

              {/* Response Composer */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 text-sm uppercase tracking-wide">
                    Your Response
                    {response && <span className="ml-2 text-purple-600 normal-case">(editing)</span>}
                  </h4>
                  {!showAIDraft && !response && (
                    <button
                      onClick={handleGenerateAI}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium
                               bg-gradient-to-r from-purple-600 to-indigo-600 text-white
                               rounded-lg hover:shadow-md transition-all"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate AI Draft
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                <textarea
                  ref={textareaRef}
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response or click 'Generate AI Draft' above for a suggested response..."
                  className="message-composer-textarea w-full resize-none"
                  rows={8}
                />
                
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => {
                      setSelectedMessage(null);
                      setResponse('');
                      setAiDraft('');
                      setShowAIDraft(false);
                    }}
                    className="px-4 py-2.5 text-gray-600 hover:text-gray-800 font-medium rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => sendResponse(selectedMessage.id)}
                    disabled={!response.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 
                             text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 
                             disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-4 h-4" />
                    Send Response
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientMessaging;
