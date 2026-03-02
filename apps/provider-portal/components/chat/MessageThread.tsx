// ============================================================
// Message Thread - Displays messages in a conversation
// apps/provider-portal/components/chat/MessageThread.tsx
// ============================================================

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Check, CheckCheck, Clock } from 'lucide-react';
import type { ChatMessage } from '@/store/providerChatStore';
import { useProviderChatStore } from '@/store/providerChatStore';
import { format, isToday, isYesterday } from 'date-fns';

const MessageThread: React.FC = () => {
  const { getActiveMessages, isTyping, activeConversationId: _activeConversationId } = useProviderChatStore();
  const messages = getActiveMessages();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get patient ID for typing indicator
  const patientId = useProviderChatStore.getState().getActiveConversation()?.patientId;
  const patientIsTyping = patientId ? isTyping[patientId] : false;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, patientIsTyping]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-gray-400">
        <p>No messages yet</p>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date}>
          {/* Date Separator */}
          <div className="flex items-center justify-center my-4">
            <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
              {date}
            </span>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {dateMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        </div>
      ))}

      {/* Typing Indicator */}
      {patientIsTyping && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <div className="flex space-x-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>Patient is typing...</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isProvider = message.senderType === 'provider';
  const isSystem = message.senderType === 'system';
  const isUrgent = message.metadata?.isUrgent;

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className={`
          max-w-[80%] px-4 py-2 rounded-lg text-sm
          ${isUrgent ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-gray-100 text-gray-600'}
        `}>
          {isUrgent && <AlertTriangle className="w-4 h-4 inline mr-1" />}
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isProvider ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        max-w-[75%] rounded-2xl px-4 py-2
        ${isProvider 
          ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-br-md' 
          : 'bg-gray-100 text-gray-800 rounded-bl-md'
        }
        ${isUrgent && !isProvider ? 'border-2 border-red-300 bg-red-50' : ''}
      `}>
        {/* Sender name for patient messages */}
        {!isProvider && (
          <p className="text-xs font-medium text-teal-600 mb-1">
            {message.senderName}
          </p>
        )}

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Timestamp and status */}
        <div className={`
          flex items-center justify-end gap-1 mt-1
          ${isProvider ? 'text-white/70' : 'text-gray-400'}
          text-xs
        `}>
          <span>{format(new Date(message.createdAt), 'h:mm a')}</span>
          {isProvider && <MessageStatus status={message.status} />}
        </div>
      </div>
    </div>
  );
};

const MessageStatus: React.FC<{ status: ChatMessage['status'] }> = ({ status }) => {
  switch (status) {
    case 'sent':
      return <Clock className="w-3 h-3" />;
    case 'delivered':
      return <Check className="w-3 h-3" />;
    case 'read':
      return <CheckCheck className="w-3 h-3" />;
    default:
      return null;
  }
};

// Helper to group messages by date
function groupMessagesByDate(messages: ChatMessage[]): Record<string, ChatMessage[]> {
  const groups: Record<string, ChatMessage[]> = {};

  for (const message of messages) {
    const date = new Date(message.createdAt);
    let dateKey: string;

    if (isToday(date)) {
      dateKey = 'Today';
    } else if (isYesterday(date)) {
      dateKey = 'Yesterday';
    } else {
      dateKey = format(date, 'MMMM d, yyyy');
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  }

  return groups;
}

export default MessageThread;
