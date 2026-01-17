import React, { useState, useEffect } from 'react';
import { MessageCircle, Clock, AlertTriangle, User } from 'lucide-react';

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

const PatientMessaging = () => {
  const [messages, setMessages] = useState<ProviderMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ProviderMessage | null>(null);
  const [response, setResponse] = useState('');

  // Simulate real-time message updates
  useEffect(() => {
    // In a real app, this would be WebSocket or Server-Sent Events
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

    // Check immediately and then every 5 seconds
    checkForMessages();
    const interval = setInterval(checkForMessages, 5000);

    return () => clearInterval(interval);
  }, []);

  const markAsRead = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status: 'read' } : msg
    ));
    
    // Update localStorage
    const updatedMessages = messages.map(msg => 
      msg.id === messageId ? { ...msg, status: 'read' } : msg
    );
    localStorage.setItem('providerMessages', JSON.stringify(updatedMessages));
  };

  const sendResponse = (messageId: string) => {
    if (!response.trim()) return;

    // Mark as responded
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status: 'responded' } : msg
    ));

    // In a real app, this would send the response back to the patient
    alert(`Response sent to patient: "${response}"`);
    setResponse('');
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Patient Messages</h2>
          <p className="text-sm text-gray-600">Chat summaries and urgent communications</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            messages.filter(m => m.status === 'unread').length > 0 
              ? 'bg-red-100 text-red-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {messages.filter(m => m.status === 'unread').length} unread
          </span>
        </div>
      </div>

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
              className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                selectedMessage?.id === message.id ? 'ring-2 ring-blue-500' : ''
              } ${message.status === 'unread' ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}
              onClick={() => {
                setSelectedMessage(message);
                if (message.status === 'unread') {
                  markAsRead(message.id);
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
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
                  <AlertTriangle className="h-5 w-5 text-red-500 ml-3" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
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
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Chat Summary</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">
                    {selectedMessage.chatSummary}
                  </pre>
                </div>
              </div>

              {selectedMessage.medicalContext && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Medical Context</h4>
                  <div className="bg-blue-50 rounded-lg p-4 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <strong>Current Medications:</strong>
                        <ul className="mt-1 space-y-1">
                          {selectedMessage.medicalContext.currentMedications?.map((med, idx) => (
                            <li key={idx} className="text-gray-700">
                              {med.name} {med.dose} - {med.schedule}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>Recent Vitals:</strong>
                        <div className="mt-1 text-gray-700">
                          BP: {selectedMessage.medicalContext.recentVitals?.bloodPressure?.current}<br/>
                          HR: {selectedMessage.medicalContext.recentVitals?.heartRate?.current} bpm<br/>
                          Glucose: {selectedMessage.medicalContext.recentVitals?.glucose?.current} mg/dL
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Send Response</h4>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response to the patient..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
                <div className="flex justify-end space-x-3 mt-3">
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => sendResponse(selectedMessage.id)}
                    disabled={!response.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
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
