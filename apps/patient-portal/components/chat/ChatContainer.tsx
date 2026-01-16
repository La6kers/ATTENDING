// COMPASS Chat Container - Main chat interface component
// apps/patient-portal/components/chat/ChatContainer.tsx

import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { MessageBubble } from './MessageBubble';
import { QuickReplies } from './QuickReplies';
import { ChatInput } from './ChatInput';
import { ProgressTracker } from './ProgressTracker';
import { EmergencyModal } from './EmergencyModal';

export function ChatContainer() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    currentPhase,
    isAIProcessing,
    urgencyLevel,
    showEmergencyModal,
    sendMessage,
    handleQuickReply,
    setEmergencyModal,
    handleEmergency,
  } = useChatStore();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get quick replies from last assistant message
  const lastMessage = messages[messages.length - 1];
  const quickReplies = lastMessage?.role === 'assistant' 
    ? lastMessage.metadata?.quickReplies || []
    : [];

  return (
    <div className="flex h-full">
      {/* Sidebar with Progress Tracker */}
      <aside className="w-80 bg-white/95 backdrop-blur-md border-r border-purple-100 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-lg">🩺</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">COMPASS</h1>
              <p className="text-xs text-gray-500">Clinical Assessment AI</p>
            </div>
          </div>
        </div>

        {/* Emergency Button */}
        <div className="p-4">
          <button
            onClick={() => setEmergencyModal(true)}
            className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
          >
            <span>🚨</span>
            Emergency? Call 911
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="flex-1 p-4 overflow-y-auto">
          <ProgressTracker currentPhase={currentPhase} />
        </div>

        {/* Urgency Indicator */}
        {urgencyLevel !== 'standard' && (
          <div className={`p-4 border-t ${
            urgencyLevel === 'high' 
              ? 'bg-red-50 border-red-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-2">
              <span>{urgencyLevel === 'high' ? '🚨' : '⚠️'}</span>
              <span className={`text-sm font-medium ${
                urgencyLevel === 'high' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {urgencyLevel === 'high' ? 'High Priority' : 'Moderate Priority'}
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Typing Indicator */}
          {isAIProcessing && (
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <span>🩺</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm">COMPASS is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {quickReplies.length > 0 && !isAIProcessing && (
          <QuickReplies options={quickReplies} onSelect={handleQuickReply} />
        )}

        {/* Input Area */}
        <ChatInput
          onSend={sendMessage}
          disabled={isAIProcessing}
          placeholder="Type your response or select an option above..."
        />
      </main>

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <EmergencyModal
          onClose={() => setEmergencyModal(false)}
          onConfirmEmergency={handleEmergency}
        />
      )}
    </div>
  );
}

export default ChatContainer;
