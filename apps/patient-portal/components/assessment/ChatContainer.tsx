// =============================================================================
// ATTENDING AI - Chat Container Component
// apps/patient-portal/components/assessment/ChatContainer.tsx
//
// Main chat interface for COMPASS assessment.
// Contains message list, input field, quick replies, and progress indicator.
//
// UPDATED: Uses unified types from @attending/shared/types
// =============================================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Mic, MicOff, ChevronLeft, MoreVertical } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { QuickReplies } from './QuickReplies';

// Import unified types from shared
import type { ChatMessage, QuickReply, DetailedAssessmentPhase } from '../../../shared/types/chat.types';

// ============================================================================
// Props Interface
// ============================================================================

export interface ChatContainerProps {
  messages: ChatMessage[];
  quickReplies?: QuickReply[];
  isTyping?: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (message: string) => void;
  onQuickReply?: (reply: QuickReply) => void;
  onBack?: () => void;
  progress?: number;
  currentPhase?: DetailedAssessmentPhase;
  patientName?: string;
  disabled?: boolean;
  showVoiceInput?: boolean;
}

// ============================================================================
// Progress Bar
// ============================================================================

const ProgressBar: React.FC<{ progress: number; phase?: DetailedAssessmentPhase }> = ({ progress, phase }) => {
  // Format phase name for display
  const formatPhaseName = (phaseName?: string): string => {
    if (!phaseName) return '';
    return phaseName
      .replace(/_/g, ' ')
      .replace(/hpi/g, 'HPI')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <div className="px-4 py-2 bg-white/80 backdrop-blur border-b border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Assessment Progress</span>
        <span className="text-xs font-medium text-purple-600">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {phase && <p className="text-xs text-gray-400 mt-1">{formatPhaseName(phase)}</p>}
    </div>
  );
};

// ============================================================================
// Header
// ============================================================================

const ChatHeader: React.FC<{
  patientName?: string;
  onBack?: () => void;
}> = ({ patientName, onBack }) => (
  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
    <div className="flex items-center gap-3">
      {onBack && (
        <button onClick={onBack} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <div>
        <h1 className="font-semibold">COMPASS Assessment</h1>
        {patientName && <p className="text-xs text-white/80">{patientName}</p>}
      </div>
    </div>
    <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
      <MoreVertical className="w-5 h-5" />
    </button>
  </div>
);

// ============================================================================
// Message List
// ============================================================================

const MessageList: React.FC<{
  messages: ChatMessage[];
  isTyping?: boolean;
}> = ({ messages, isTyping }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Create typing indicator message
  const typingMessage: ChatMessage = {
    id: 'typing',
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString(),
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Typing indicator */}
      {isTyping && <MessageBubble message={typingMessage} isTyping={true} />}

      <div ref={bottomRef} />
    </div>
  );
};

// ============================================================================
// Input Area
// ============================================================================

const InputArea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  showVoice?: boolean;
  isListening?: boolean;
  onVoiceToggle?: () => void;
}> = ({ value, onChange, onSend, disabled, showVoice, isListening, onVoiceToggle }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);

    // Auto-resize
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="px-4 py-3 bg-white border-t border-gray-200">
      <div className="flex items-end gap-2">
        {/* Voice input button */}
        {showVoice && (
          <button
            onClick={onVoiceToggle}
            disabled={disabled}
            className={`
              p-2 rounded-full transition-colors
              ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              disabled:opacity-50
            `}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={handleInput}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={disabled}
            rows={1}
            className={`
              w-full px-4 py-2.5 pr-12 rounded-2xl border border-gray-200
              resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              text-gray-800 placeholder-gray-400
            `}
            style={{ maxHeight: '120px' }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className={`
            p-2.5 rounded-full transition-all
            ${
              value.trim()
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                : 'bg-gray-100 text-gray-400'
            }
            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
          `}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  quickReplies = [],
  isTyping = false,
  inputValue,
  onInputChange,
  onSend,
  onQuickReply,
  onBack,
  progress = 0,
  currentPhase,
  patientName,
  disabled = false,
  showVoiceInput = false,
}) => {
  const [isListening, setIsListening] = useState(false);

  const handleSend = useCallback(() => {
    if (inputValue.trim() && !disabled) {
      onSend(inputValue.trim());
      onInputChange('');
    }
  }, [inputValue, disabled, onSend, onInputChange]);

  const handleQuickReply = useCallback(
    (reply: QuickReply) => {
      if (onQuickReply) {
        onQuickReply(reply);
      } else {
        // Default: send as message
        onSend(reply.value || reply.text);
      }
    },
    [onQuickReply, onSend]
  );

  const toggleVoice = useCallback(() => {
    setIsListening(!isListening);
    // Voice recognition implementation would go here
  }, [isListening]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <ChatHeader patientName={patientName} onBack={onBack} />

      {/* Progress Bar */}
      {progress > 0 && <ProgressBar progress={progress} phase={currentPhase} />}

      {/* Messages */}
      <MessageList messages={messages} isTyping={isTyping} />

      {/* Quick Replies */}
      {quickReplies.length > 0 && !isTyping && (
        <div className="px-4 pb-2">
          <QuickReplies
            replies={quickReplies}
            onSelect={handleQuickReply}
            disabled={disabled}
            columns={quickReplies.length <= 2 ? 2 : quickReplies.length <= 4 ? 2 : 3}
          />
        </div>
      )}

      {/* Input */}
      <InputArea
        value={inputValue}
        onChange={onInputChange}
        onSend={handleSend}
        disabled={disabled || isTyping}
        showVoice={showVoiceInput}
        isListening={isListening}
        onVoiceToggle={toggleVoice}
      />
    </div>
  );
};

export default ChatContainer;
