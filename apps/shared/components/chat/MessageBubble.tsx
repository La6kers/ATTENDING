// =============================================================================
// ATTENDING AI - Unified Message Bubble Component
// apps/shared/components/chat/MessageBubble.tsx
//
// Shared message bubble component used by both Patient and Provider portals.
// Handles user/assistant messages with proper styling and metadata display.
// =============================================================================

import React from 'react';
import type { ChatMessage, MessageRole, UrgencyLevel } from '../../types/chat.types';
import { formatMessageTime, URGENCY_CONFIG } from '../../types/chat.types';

// =============================================================================
// Props Interface
// =============================================================================

export interface MessageBubbleProps {
  message: ChatMessage;
  variant?: 'patient' | 'provider';
  showTimestamp?: boolean;
  showAvatar?: boolean;
  className?: string;
}

// =============================================================================
// Avatar Component
// =============================================================================

const MessageAvatar: React.FC<{
  role: MessageRole;
  variant: 'patient' | 'provider';
}> = ({ role, variant }) => {
  if (role === 'user') {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm font-medium">
          {variant === 'patient' ? 'You' : 'P'}
        </span>
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
      <span className="text-white text-lg">🩺</span>
    </div>
  );
};

// =============================================================================
// Red Flag Indicator
// =============================================================================

const RedFlagIndicator: React.FC = () => (
  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
    Red Flag
  </span>
);

// =============================================================================
// Message Bubble Component
// =============================================================================

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  variant = 'patient',
  showTimestamp = true,
  showAvatar = true,
  className = '',
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const hasRedFlag = message.metadata?.isRedFlag || message.metadata?.redFlagDetected;

  // System messages
  if (isSystem) {
    return (
      <div className={`flex justify-center my-2 ${className}`}>
        <div className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 ${className}`}
    >
      {/* Avatar - Assistant (left side) */}
      {showAvatar && !isUser && (
        <div className="mr-3">
          <MessageAvatar role={message.role} variant={variant} />
        </div>
      )}

      <div className={`max-w-[70%] ${isUser ? 'order-1' : 'order-2'}`}>
        {/* Message Content */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
          }`}
        >
          {/* Red Flag Badge */}
          {hasRedFlag && !isUser && (
            <div className="mb-2">
              <RedFlagIndicator />
            </div>
          )}

          {/* Message Text */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>

          {/* Clinical Note (if present) */}
          {message.metadata?.clinicalNote && !isUser && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 italic">
                {message.metadata.clinicalNote}
              </p>
            </div>
          )}
        </div>

        {/* Timestamp */}
        {showTimestamp && (
          <div
            className={`mt-1 text-xs text-gray-400 ${
              isUser ? 'text-right' : 'text-left'
            }`}
          >
            {formatMessageTime(message.timestamp)}
          </div>
        )}
      </div>

      {/* Avatar - User (right side) */}
      {showAvatar && isUser && (
        <div className="ml-3 order-2">
          <MessageAvatar role={message.role} variant={variant} />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
