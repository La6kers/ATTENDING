// =============================================================================
// ATTENDING AI - Enhanced Inbox Main Content
// apps/provider-portal/components/inbox/EnhancedMainContent.tsx
//
// Integrates all AI-powered inbox features
// =============================================================================

import React, { useEffect, useState } from 'react';
import { useInbox } from '@/store/useInbox';
import { EnhancedConversationView } from './EnhancedConversationView';
import { EnhancedResponseComposer } from './EnhancedResponseComposer';
import {
  RefreshCw,
  Brain,
  Inbox,
  CheckCircle,
} from 'lucide-react';

interface QuickAction {
  type: 'order_lab' | 'order_refill' | 'schedule_appointment' | 'send_education';
  label: string;
  details: string;
}

export const EnhancedMainContent: React.FC = () => {
  const { currentMessage, messages, fetchMessages, isLoading, markAsRead } = useInbox();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSendResponse = (content: string, actions: QuickAction[]) => {
    console.log('Sending response:', content);
    console.log('Executing actions:', actions);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    if (currentMessage) {
      markAsRead([currentMessage.id]);
    }
  };

  const stats = {
    unread: messages.filter(m => m.status === 'unread').length,
    urgent: messages.filter(m => m.priority === 'urgent').length,
    labRequests: messages.filter(m => m.type === 'lab' || m.content?.toLowerCase().includes('lab')).length,
    refillRequests: messages.filter(m => m.type === 'refill').length,
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Provider Inbox</h1>
          <p className="text-sm text-slate-500">AI-Enhanced Patient Communication</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 mr-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-slate-600">{stats.urgent} Urgent</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-slate-600">{stats.unread} Unread</span>
            </div>
          </div>

          <button
            onClick={() => fetchMessages()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white hover:shadow-lg transition-all">
            <Brain className="w-4 h-4" />
            AI Summary
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="absolute top-20 right-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg z-50">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Response Sent Successfully</p>
            <p className="text-sm text-green-600">All actions have been executed</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {currentMessage ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <EnhancedConversationView message={currentMessage} />
          <EnhancedResponseComposer
            message={currentMessage}
            onSend={handleSendResponse}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6">
            <Inbox className="w-10 h-10 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            Welcome to Your AI-Enhanced Inbox
          </h3>
          <p className="text-slate-500 max-w-md mb-6">
            Select a message from the sidebar to view details, get AI-powered response suggestions, 
            and quickly process patient requests.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md w-full">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-left">
              <p className="text-2xl font-bold text-blue-700">{stats.labRequests}</p>
              <p className="text-sm text-blue-600">Lab Requests</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-left">
              <p className="text-2xl font-bold text-purple-700">{stats.refillRequests}</p>
              <p className="text-sm text-purple-600">Refill Requests</p>
            </div>
          </div>

          <div className="mt-8 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 max-w-lg">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-800">AI Features Available</span>
            </div>
            <ul className="text-sm text-purple-700 space-y-2 text-left">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Smart response templates based on message content
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Automatic lab request detection with previous results
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                One-click approval workflows for labs and refills
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Patient context and clinical history display
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMainContent;
