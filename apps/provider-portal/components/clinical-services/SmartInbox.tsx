// =============================================================================
// ATTENDING AI - Smart Inbox Component
// apps/provider-portal/components/clinical-services/SmartInbox.tsx
// =============================================================================

import React, { useState, useEffect } from 'react';

interface InboxMessage {
  id: string;
  patientId: string;
  patientName: string;
  subject: string;
  content: string;
  receivedAt: Date;
  classification: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedAction: string;
  draftResponse: string;
  status: 'pending' | 'in-progress' | 'resolved';
}

const classificationLabels: Record<string, string> = {
  'refill-request': '💊 Refill Request',
  'symptom-report': '🩺 Symptom Report',
  'appointment-request': '📅 Appointment Request',
  'test-results-inquiry': '🔬 Test Results Inquiry',
  'billing-question': '💰 Billing Question',
  'general-inquiry': '❓ General Inquiry',
};

export const SmartInbox: React.FC = () => {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [stats, setStats] = useState({ critical: 0, high: 0, medium: 0, low: 0 });

  useEffect(() => {
    fetchMessages();
  }, [filterPriority]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = filterPriority !== 'all' ? `?priority=${filterPriority}` : '';
      const response = await fetch(`/api/inbox/smart${params}`);
      const data = await response.json();
      setMessages(data.messages.map((m: any) => ({ ...m, receivedAt: new Date(m.receivedAt) })));
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResponse = async (messageId: string, response: string) => {
    try {
      await fetch('/api/inbox/smart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, status: 'resolved', response }),
      });
      fetchMessages();
      setSelectedMessage(null);
    } catch (error) {
      console.error('Failed to send response:', error);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Smart Inbox</h2>
            <p className="text-gray-600">AI-triaged patient messages</p>
          </div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">All Messages</option>
            <option value="critical">Critical</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className={`rounded-lg p-3 text-center ${getPriorityBadge(key)}`}>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-sm capitalize">{key}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Message List */}
      <div className="divide-y">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No messages in inbox
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedMessage(message)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{message.patientName}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getPriorityBadge(message.priority)}`}>
                      {message.priority.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {classificationLabels[message.classification] || message.classification}
                    </span>
                  </div>
                  <div className="text-gray-800 mt-1">{message.subject}</div>
                  <div className="text-sm text-gray-500 mt-1 truncate">{message.content}</div>
                </div>
                <div className="text-sm text-gray-400">
                  {message.receivedAt.toLocaleTimeString()}
                </div>
              </div>
              <div className="mt-2 text-sm text-blue-600">
                💡 {message.suggestedAction}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">{selectedMessage.subject}</h3>
              <button onClick={() => setSelectedMessage(null)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">
                    {selectedMessage.patientName.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-semibold">{selectedMessage.patientName}</div>
                  <div className="text-sm text-gray-500">
                    {selectedMessage.receivedAt.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p>{selectedMessage.content}</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="text-sm font-semibold text-blue-800 mb-2">AI Analysis</div>
                <div className="text-sm text-blue-700">
                  <div>Classification: {classificationLabels[selectedMessage.classification]}</div>
                  <div>Suggested Action: {selectedMessage.suggestedAction}</div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Draft Response</label>
                <textarea
                  className="w-full border rounded-lg p-3"
                  rows={4}
                  defaultValue={selectedMessage.draftResponse}
                  id="response-text"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const response = (document.getElementById('response-text') as HTMLTextAreaElement)?.value;
                    handleSendResponse(selectedMessage.id, response);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send Response
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartInbox;
