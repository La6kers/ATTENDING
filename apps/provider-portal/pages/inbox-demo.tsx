import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { generateMockMessages } from '../lib/mockData';
import type { Message } from '../store/useInbox';

const InboxDemoPage: NextPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading mock data
    setTimeout(() => {
      const mockMessages = generateMockMessages(25);
      setMessages(mockMessages);
      setLoading(false);
    }, 500);
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'lab': return 'bg-green-100 text-green-800';
      case 'phone': return 'bg-purple-100 text-purple-800';
      case 'refill': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-600 p-5">
      <div className="container mx-auto max-w-7xl rounded-2xl bg-white/95 shadow-xl backdrop-blur-xl">
        <div className="flex h-[calc(100vh-2.5rem)]">
          {/* Sidebar */}
          <div className="w-80 border-r border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 p-6">
              <h1 className="mb-2 text-2xl font-bold text-blue-500">ATTENDING AI</h1>
              <div className="text-sm text-slate-500">Dr. Sarah Chen, MD | Internal Medicine</div>
            </div>
            
            <div className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Messages ({messages.length})</h2>
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {loading ? (
                  <div className="text-center text-slate-500">Loading messages...</div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => setSelectedMessage(message)}
                      className={`cursor-pointer rounded-lg border p-3 transition-all hover:shadow-md ${
                        selectedMessage?.id === message.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white'
                      } ${getPriorityColor(message.priority)}`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-semibold text-sm">{message.patientDetails.name}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className={`inline-block rounded px-2 py-1 text-xs font-medium ${getTypeColor(message.type)}`}>
                        {message.type.toUpperCase()}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                        {message.preview}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white">
            <div className="border-b border-slate-200 p-6">
              <h1 className="text-3xl font-bold text-slate-800">Provider Inbox Demo</h1>
              <div className="text-sm text-slate-500">AI-Enhanced Communication Hub with Mock Data</div>
            </div>

            {selectedMessage ? (
              <div className="p-6">
                {/* Patient Info */}
                <div className="mb-6 rounded-xl bg-slate-50 p-5">
                  <h3 className="mb-3 text-lg font-semibold">Patient Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-slate-600">Name:</span>{' '}
                      <span className="text-slate-800">{selectedMessage.patientDetails.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-600">Age:</span>{' '}
                      <span className="text-slate-800">{selectedMessage.patientDetails.age}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-600">MRN:</span>{' '}
                      <span className="text-slate-800">{selectedMessage.patientDetails.mrn}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-600">Last Visit:</span>{' '}
                      <span className="text-slate-800">{selectedMessage.patientDetails.lastVisit}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <span className="font-medium text-slate-600">Conditions:</span>{' '}
                    <span className="text-slate-800">{selectedMessage.patientDetails.conditions.join(', ')}</span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-slate-600">Allergies:</span>{' '}
                    <span className="text-slate-800">{selectedMessage.patientDetails.allergies.join(', ')}</span>
                  </div>
                </div>

                {/* AI Analysis */}
                {selectedMessage.aiAnalysis && (
                  <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 p-5">
                    <h3 className="mb-3 text-lg font-semibold">AI Analysis</h3>
                    <p className="mb-3 text-sm text-slate-700">{selectedMessage.aiAnalysis.summary}</p>
                    <div className="space-y-2">
                      <div>
                        <h4 className="text-sm font-medium text-slate-700">Recommendations:</h4>
                        <ul className="mt-1 list-disc list-inside text-sm text-slate-600">
                          {selectedMessage.aiAnalysis.recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message Content */}
                <div className="rounded-xl bg-slate-50 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{selectedMessage.subject}</h3>
                    <span className={`rounded px-3 py-1 text-xs font-medium ${getTypeColor(selectedMessage.type)}`}>
                      {selectedMessage.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-slate-700">
                    {selectedMessage.content}
                  </div>
                </div>

                {/* Medications for Refill Requests */}
                {selectedMessage.type === 'refill' && selectedMessage.medications && (
                  <div className="mt-6 rounded-xl bg-amber-50 p-5">
                    <h3 className="mb-3 text-lg font-semibold">Requested Medications</h3>
                    <ul className="list-disc list-inside text-sm text-slate-700">
                      {selectedMessage.medications.map((med, idx) => (
                        <li key={idx}>{med}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-slate-500">
                <div>
                  <div className="mb-4 text-5xl">📧</div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-700">
                    Welcome to Your AI-Enhanced Inbox
                  </h3>
                  <p>Select a message from the sidebar to view details</p>
                  <p className="mt-4 text-sm">
                    This demo shows {messages.length} mock medical messages with AI analysis
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxDemoPage;
