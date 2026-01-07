// Message Bubble Component
// apps/patient-portal/components/chat/MessageBubble.tsx

import React from 'react';
import { ChatMessage } from '../../store/useChatStore';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // System messages (emergency alerts, etc.)
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-3 text-sm text-red-800 shadow-sm max-w-lg">
          <div 
            className="font-medium"
            dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br/>') }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start gap-3 max-w-[75%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser 
            ? 'bg-gradient-to-r from-indigo-500 to-purple-600' 
            : 'bg-gray-100'
        }`}>
          <span className={isUser ? 'text-white text-sm' : 'text-gray-600'}>
            {isUser ? '👤' : '🩺'}
          </span>
        </div>

        {/* Message Bubble */}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm shadow-sm'
        }`}>
          {/* AI Header */}
          {!isUser && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
              <span className="text-xs font-semibold text-indigo-600">COMPASS AI</span>
              {message.metadata?.urgencyLevel && message.metadata.urgencyLevel !== 'standard' && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  message.metadata.urgencyLevel === 'high'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {message.metadata.urgencyLevel === 'high' ? '🚨 High Priority' : '⚠️ Moderate'}
                </span>
              )}
            </div>
          )}

          {/* Message Content */}
          <div 
            className={`text-sm leading-relaxed ${isUser ? '' : 'prose prose-sm max-w-none'}`}
            dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br/>') }}
          />

          {/* AI Thinking (collapsible debug info) */}
          {!isUser && message.metadata?.aiThinking && (
            <details className="mt-3 pt-2 border-t border-gray-100">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                💭 AI Reasoning
              </summary>
              <p className="mt-1 text-xs text-gray-400 italic">
                {message.metadata.aiThinking}
              </p>
            </details>
          )}

          {/* Timestamp */}
          <div className={`text-xs mt-2 ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export default MessageBubble;
