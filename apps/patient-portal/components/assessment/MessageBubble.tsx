// =============================================================================
// ATTENDING AI - Chat Message Bubble Component
// apps/patient-portal/components/assessment/MessageBubble.tsx
//
// Individual chat message component for COMPASS assessment conversation.
// Supports user messages, AI responses, and system notifications.
//
// UPDATED: Uses unified ChatMessage type from @attending/shared/types
// =============================================================================

import React from 'react';
import { User, Bot, AlertTriangle, Info, CheckCircle } from 'lucide-react';

// Import unified types from shared
import type { ChatMessage, MessageRole } from '../../../shared/types/chat.types';
import { formatMessageTime } from '../../../shared/types/chat.types';

// Re-export types for convenience
export type { ChatMessage as Message, MessageRole };

// ============================================================================
// Props Interface
// ============================================================================

export interface MessageBubbleProps {
  message: ChatMessage;
  isTyping?: boolean;
  showTimestamp?: boolean;
  showAvatar?: boolean;
}

// ============================================================================
// Avatar Component
// ============================================================================

const Avatar: React.FC<{ role: MessageRole; isEmergency?: boolean }> = ({ role, isEmergency }) => {
  if (role === 'user') {
    return (
      <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center shadow-md">
        <User className="w-5 h-5 text-white" />
      </div>
    );
  }

  if (role === 'system') {
    return (
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
        <Info className="w-5 h-5 text-white" />
      </div>
    );
  }

  // Assistant
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
        isEmergency ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-br from-teal-600 to-teal-800'
      }`}
    >
      {isEmergency ? <AlertTriangle className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
    </div>
  );
};

// ============================================================================
// Typing Indicator
// ============================================================================

const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1 py-2 px-3">
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);

// ============================================================================
// Parse content with markdown/HTML
// ============================================================================

const parseContent = (content: string): React.ReactNode => {
  // Handle line breaks
  const lines = content.split('\n');

  return lines.map((line, lineIdx) => {
    // Check for list items
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return (
        <li key={lineIdx} className="ml-4 list-disc">
          {parseInlineFormatting(line.substring(2))}
        </li>
      );
    }

    // Check for numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      return (
        <li key={lineIdx} className="ml-4 list-decimal">
          {parseInlineFormatting(numberedMatch[2])}
        </li>
      );
    }

    // Regular paragraph
    if (line.trim()) {
      return (
        <p key={lineIdx} className="mb-2 last:mb-0">
          {parseInlineFormatting(line)}
        </p>
      );
    }

    return <br key={lineIdx} />;
  });
};

const parseInlineFormatting = (text: string): React.ReactNode => {
  // Handle **bold** and <strong>
  let parts: React.ReactNode[] = [text];

  // Bold with **
  parts = parts.flatMap((part, idx) => {
    if (typeof part !== 'string') return part;
    const boldParts = part.split(/\*\*(.+?)\*\*/g);
    return boldParts.map((p, i) => (i % 2 === 1 ? <strong key={`bold-${idx}-${i}`}>{p}</strong> : p));
  });

  // Bold with <strong>
  parts = parts.flatMap((part, idx) => {
    if (typeof part !== 'string') return part;
    const strongParts = part.split(/<strong>(.+?)<\/strong>/g);
    return strongParts.map((p, i) => (i % 2 === 1 ? <strong key={`strong-${idx}-${i}`}>{p}</strong> : p));
  });

  // Italic with *
  parts = parts.flatMap((part, idx) => {
    if (typeof part !== 'string') return part;
    const italicParts = part.split(/\*(.+?)\*/g);
    return italicParts.map((p, i) => (i % 2 === 1 ? <em key={`italic-${idx}-${i}`}>{p}</em> : p));
  });

  return <>{parts}</>;
};

// ============================================================================
// Component
// ============================================================================

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isTyping = false,
  showTimestamp = true,
  showAvatar = true,
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isEmergency = message.metadata?.isEmergency;
  const hasRedFlag = message.metadata?.redFlagDetected || message.metadata?.isRedFlag;

  // System message styling
  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-fade-in">
        <div
          className={`
          flex items-center gap-2 px-4 py-2 rounded-full text-sm
          ${isEmergency ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}
        `}
        >
          {isEmergency ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        flex gap-3 mb-4 animate-fade-in
        ${isUser ? 'flex-row-reverse' : 'flex-row'}
      `}
    >
      {/* Avatar */}
      {showAvatar && (
        <div className="flex-shrink-0">
          <Avatar role={message.role} isEmergency={isEmergency} />
        </div>
      )}

      {/* Message Content */}
      <div
        className={`
        flex flex-col max-w-[80%]
        ${isUser ? 'items-end' : 'items-start'}
      `}
      >
        {/* Bubble */}
        <div
          className={`
          relative px-4 py-3 rounded-2xl shadow-sm
          ${
            isUser
              ? 'bg-gradient-to-br from-teal-600 to-teal-800 text-white rounded-tr-sm'
              : hasRedFlag
                ? 'bg-red-50 text-gray-800 border-2 border-red-300 rounded-tl-sm'
                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm'
          }
        `}
        >
          {/* Red flag indicator */}
          {hasRedFlag && (
            <div className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-3 h-3 text-white" />
            </div>
          )}

          {/* Message content */}
          {isTyping ? <TypingIndicator /> : <div className="text-sm leading-relaxed">{parseContent(message.content)}</div>}
        </div>

        {/* Timestamp */}
        {showTimestamp && !isTyping && (
          <span
            className={`
            text-xs text-gray-400 mt-1 px-1
            ${isUser ? 'text-right' : 'text-left'}
          `}
          >
            {formatMessageTime(message.timestamp)}
          </span>
        )}

        {/* Confidence indicator for AI messages */}
        {!isUser && message.metadata?.aiConfidence && (
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
            <CheckCircle className="w-3 h-3" />
            <span>{Math.round(message.metadata.aiConfidence * 100)}% confident</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
