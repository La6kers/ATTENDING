import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { 
  MessageCircle, Calendar, FileText, Activity, Bell, User, Heart, Clock,
  AlertCircle, ChevronRight, Send, Shield, Stethoscope, Phone, AlertTriangle,
  Pill, ChevronDown, Eye, EyeOff, Settings, LogOut, Zap, TrendingUp,
  Loader2, CheckCircle, XCircle, Info, Thermometer, Droplet, Wind
} from 'lucide-react';

// Types
interface ChatMessage {
  id: string;
  sender: 'patient' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatContext {
  messages: ChatMessage[];
  medicalContext: any;
  urgencyLevel: 'low' | 'normal' | 'high';
}

const ImprovedPatientPortal = () => {
  const router = useRouter();
  // Enhanced state management
  const [user, setUser] = useState({
    name: "Sarah Johnson",
    id: "PT-2024-0892",
    photoUrl: null,
    preferredLanguage: "en",
    accessibilityMode: false
  });

  const [sessionTimeout, setSessionTimeout] = useState(900); // 15 minutes
  const [showEmergencyOptions, setShowEmergencyOptions] = useState(false);
  const [aiConsent, setAiConsent] = useState(true);
  const [chatContext, setChatContext] = useState<ChatContext>({
    messages: [],
    medicalContext: {},
    urgencyLevel: 'normal'
  });

  // Session timeout warning
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTimeout(prev => {
        if (prev <= 60) {
          // Show warning
        }
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Emergency keyword detection
  const EMERGENCY_KEYWORDS = ['chest pain', 'can\'t breathe', 'bleeding', 'unconscious', 'stroke', 'heart attack'];
  
  const checkUrgency = (message: string) => {
    const lowerMessage = message.toLowerCase();
    return EMERGENCY_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
  };

  // Enhanced health data with trends
  const healthData = {
    vitals: {
      bloodPressure: { current: "120/80", trend: "stable", history: [118, 120, 119, 120] },
      heartRate: { current: 72, trend: "improving", average: 75 },
      weight: { current: 145, trend: "decreasing", change: -3 },
      glucose: { current: 95, trend: "stable", lastMeal: "2 hours ago" }
    },
    medications: [
      { name: "Lisinopril", dose: "10mg", schedule: "Daily", adherence: 94, refillDue: "Feb 15" },
      { name: "Metformin", dose: "500mg", schedule: "Twice daily", adherence: 87, refillDue: "Feb 28" }
    ],
    appointments: {
      upcoming: { date: "Feb 3, 2025", time: "2:30 PM", provider: "Dr. Chen", type: "Follow-up" },
      recent: { date: "Jan 15, 2025", summary: "Routine checkup - all normal" }
    },
    alerts: [
      { type: "info", message: "Lab results available for review", priority: "medium" },
      { type: "warning", message: "Medication refill needed soon", priority: "high" },
      { type: "success", message: "Blood pressure improving", priority: "low" }
    ]
  };

  const [activeView, setActiveView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // COMPASS Chat Integration
  const openCompassChat = () => {
    // Store medical context for the chat session
    const medicalContext = {
      patientId: user.id,
      currentMedications: healthData.medications,
      recentVitals: healthData.vitals,
      alerts: healthData.alerts,
      timestamp: new Date().toISOString()
    };
    sessionStorage.setItem('compass-context', JSON.stringify(medicalContext));
    
    // Navigate to the COMPASS chat page
    router.push('/chat');
  };

  const sendChatSummaryToProvider = async () => {
    try {
      setIsLoading(true);
      
      // Prepare the chat summary
      const summary = {
        patientId: user.id,
        patientName: user.name,
        chatSummary: chatContext.messages.length > 0 
          ? chatContext.messages.map(msg => `${msg.sender}: ${msg.content}`).join('\n')
          : 'Patient initiated chat session but no messages recorded yet.',
        urgencyLevel: chatContext.urgencyLevel,
        timestamp: new Date().toISOString(),
        messageType: 'chat-summary' as const,
        medicalContext: {
          currentMedications: healthData.medications,
          recentVitals: healthData.vitals,
          activeAlerts: healthData.alerts
        }
      };

      // Send to provider portal API
      const response = await fetch('/api/send-to-provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(summary)
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${result.message}\n\nMessage ID: ${result.messageId}\n\nYour care team will review this information and may follow up with you.`);
        
        // Clear the current chat context after sending
        setChatContext({
          messages: [],
          medicalContext: {},
          urgencyLevel: 'normal'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error sending summary to provider:', error);
      alert('❌ Failed to send summary to provider. Please try again or contact your care team directly.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Emergency Banner */}
      <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center">
          <Phone className="h-4 w-4 mr-2 animate-pulse" />
          <span className="font-medium">Emergency? Call 911</span>
        </div>
        <button 
          onClick={() => setShowEmergencyOptions(!showEmergencyOptions)}
          className="flex items-center bg-red-700 px-3 py-1 rounded hover:bg-red-800 transition-colors"
          aria-label="Show urgent care options"
        >
          Urgent Care Options
          <ChevronDown className={`h-3 w-3 ml-1 transform transition-transform ${showEmergencyOptions ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Emergency Options Dropdown */}
      {showEmergencyOptions && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <button className="flex items-center p-2 bg-white rounded border border-red-200 hover:border-red-400 transition-colors">
              <Phone className="h-4 w-4 text-red-600 mr-2" />
              <div className="text-left">
                <div className="font-medium text-red-900">Nurse Hotline</div>
                <div className="text-red-700">1-800-XXX-XXXX</div>
              </div>
            </button>
            <button className="flex items-center p-2 bg-white rounded border border-red-200 hover:border-red-400 transition-colors">
              <MapPin className="h-4 w-4 text-red-600 mr-2" />
              <div className="text-left">
                <div className="font-medium text-red-900">Nearest ER</div>
                <div className="text-red-700">2.3 miles away</div>
              </div>
            </button>
            <button className="flex items-center p-2 bg-white rounded border border-red-200 hover:border-red-400 transition-colors">
              <Video className="h-4 w-4 text-red-600 mr-2" />
              <div className="text-left">
                <div className="font-medium text-red-900">Virtual Urgent Care</div>
                <div className="text-red-700">~10 min wait</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Stethoscope className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">ATTENDING Patient Portal</h1>
                <p className="text-xs text-gray-500">Secure Patient Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Session Timer */}
              <div className="hidden md:flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                <span>Session: {Math.floor(sessionTimeout / 60)}:{(sessionTimeout % 60).toString().padStart(2, '0')}</span>
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors" aria-label="View notifications">
                <Bell className="h-5 w-5" />
                {healthData.alerts.length > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-3 border-l pl-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">ID: {user.id}</p>
                </div>
                <div className="relative">
                  <button className="flex items-center p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                    <User className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'health-chat', label: 'Health Assistant', icon: MessageCircle },
              { id: 'vitals', label: 'Vitals & Tracking', icon: Heart },
              { id: 'medications', label: 'Medications', icon: Pill },
              { id: 'records', label: 'Health Records', icon: FileText },
              { id: 'appointments', label: 'Appointments', icon: Calendar }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeView === item.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-current={activeView === item.id ? 'page' : undefined}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeView === 'dashboard' && (
          <div className="space-y-6">
            {/* Health Score Card */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Your Health Score: 85/100</h2>
                  <p className="text-blue-100">Great job! You're on track with your health goals.</p>
                  <div className="flex items-center mt-4 space-x-4">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      <span className="text-sm">Improving</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">3 goals met this week</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/20 rounded-full p-4">
                  <Heart className="h-12 w-12" />
                </div>
              </div>
            </div>

            {/* COMPASS Chat Quick Access */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">COMPASS Health Assistant</h3>
                  <p className="text-purple-100">Get instant answers to your health questions</p>
                </div>
                <button
                  onClick={openCompassChat}
                  className="bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Start Chat
                </button>
              </div>
            </div>

            {/* Priority Alerts */}
            {healthData.alerts.length > 0 && (
              <div className="space-y-3">
                {healthData.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center p-4 rounded-lg border ${
                      alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      alert.type === 'info' ? 'bg-blue-50 border-blue-200' :
                      'bg-green-50 border-green-200'
                    }`}
                    role="alert"
                  >
                    {alert.type === 'warning' ? <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" /> :
                     alert.type === 'info' ? <Info className="h-5 w-5 text-blue-600 mr-3" /> :
                     <CheckCircle className="h-5 w-5 text-green-600 mr-3" />}
                    <div className="flex-1">
                      <p className={`font-medium ${
                        alert.type === 'warning' ? 'text-yellow-900' :
                        alert.type === 'info' ? 'text-blue-900' :
                        'text-green-900'
                      }`}>{alert.message}</p>
                    </div>
                    <button className="text-gray-500 hover:text-gray-700">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Vitals Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Vitals Summary</h3>
                  <Activity className="h-4 w-4 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Blood Pressure</span>
                    <span className="text-sm font-medium">{healthData.vitals.bloodPressure.current}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Heart Rate</span>
                    <span className="text-sm font-medium">{healthData.vitals.heartRate.current} bpm</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Glucose</span>
                    <span className="text-sm font-medium">{healthData.vitals.glucose.current} mg/dL</span>
                  </div>
                </div>
              </div>

              {/* Medication Adherence */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Medication Adherence</h3>
                  <Pill className="h-4 w-4 text-gray-400" />
                </div>
                <div className="mb-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold text-gray-900">91%</span>
                    <span className="text-xs text-green-600">+4% this month</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '91%' }} />
                </div>
              </div>

              {/* Next Appointment */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Next Appointment</h3>
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-lg font-semibold text-gray-900">{healthData.appointments.upcoming.date}</p>
                <p className="text-sm text-gray-600">{healthData.appointments.upcoming.time}</p>
                <p className="text-xs text-gray-500 mt-1">Dr. {healthData.appointments.upcoming.provider}</p>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Quick Actions</h3>
                  <Zap className="h-4 w-4 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors text-sm">
                    Request Prescription Refill
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors text-sm">
                    Message Provider
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors text-sm">
                    View Test Results
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {[
                  { date: '2 hours ago', event: 'Blood pressure reading logged', icon: Activity, type: 'vitals' },
                  { date: 'Yesterday', event: 'Lab results available', icon: FileText, type: 'results' },
                  { date: '3 days ago', event: 'Medication refill requested', icon: Pill, type: 'medication' },
                  { date: '1 week ago', event: 'Appointment completed with Dr. Chen', icon: Calendar, type: 'appointment' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      item.type === 'vitals' ? 'bg-blue-100' :
                      item.type === 'results' ? 'bg-green-100' :
                      item.type === 'medication' ? 'bg-purple-100' :
                      'bg-gray-100'
                    }`}>
                      <item.icon className={`h-4 w-4 ${
                        item.type === 'vitals' ? 'text-blue-600' :
                        item.type === 'results' ? 'text-green-600' :
                        item.type === 'medication' ? 'text-purple-600' :
                        'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.event}</p>
                      <p className="text-xs text-gray-500">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'health-chat' && (
          <div className="max-w-4xl mx-auto">
            {/* AI Consent Banner */}
            {!aiConsent && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-yellow-900">AI Assistant Consent Required</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      To use our AI health assistant, please review and accept our terms for AI-powered health guidance.
                    </p>
                    <button className="mt-2 text-sm font-medium text-yellow-900 underline hover:text-yellow-800">
                      Review Terms & Enable
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Medical Disclaimer */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Medical Disclaimer</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    This AI assistant provides general health information only. For medical advice, diagnosis, or treatment, 
                    please consult your healthcare provider. In emergencies, call 911 immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Chat Interface */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Health Assistant - COMPASS</h3>
                    <p className="text-sm text-gray-600">Powered by medical AI • Responses shared with your care team</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={openCompassChat}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Open Full Chat
                    </button>
                    <span className="flex items-center text-xs text-gray-500">
                      <Shield className="h-3 w-3 mr-1" />
                      Encrypted
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Messages Area */}
              <div className="h-96 overflow-y-auto p-4 bg-gray-50">
                {chatContext.messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Start a Health Conversation</h4>
                    <p className="text-sm text-gray-600 mb-6">I can help with questions about your health, medications, and symptoms</p>
                    
                    {/* Suggested Topics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                      {[
                        { icon: Pill, text: "Medication side effects", context: "medications" },
                        { icon: Thermometer, text: "Symptom checker", context: "symptoms" },
                        { icon: Activity, text: "Health goals", context: "wellness" },
                        { icon: FileText, text: "Test results explained", context: "results" }
                      ].map((topic, idx) => (
                        <button
                          key={idx}
                          className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-left"
                          onClick={openCompassChat}
                        >
                          <topic.icon className="h-5 w-5 text-blue-500 mr-3" />
                          <span className="text-sm text-gray-700">{topic.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Render chat messages with enhanced styling */}
                  </div>
                )}
              </div>

              {/* Input Area with Context Indicators */}
              <div className="border-t border-gray-200 p-4">
                {chatContext.urgencyLevel === 'high' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-sm text-red-800">
                      Your message contains urgent symptoms. Consider calling 911 or visiting an emergency room.
                    </span>
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your health question or click 'Open Full Chat' above..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        openCompassChat();
                      }
                    }}
                  />
                  <button 
                    onClick={openCompassChat}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    Your conversation is private and encrypted
                  </span>
                  <button 
                    onClick={sendChatSummaryToProvider}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Generate provider summary
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional views placeholder */}
        {activeView !== 'dashboard' && activeView !== 'health-chat' && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <FileText className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeView.charAt(0).toUpperCase() + activeView.slice(1).replace('-', ' ')} View
            </h3>
            <p className="text-gray-500">This section is under development</p>
          </div>
        )}
      </main>

      {/* Accessibility Features */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {/* Screen reader announcements */}
      </div>
    </div>
  );
};

// Utility components
const MapPin = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Video = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

export default ImprovedPatientPortal;
