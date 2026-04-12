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
import { Send, Mic, MicOff, ChevronLeft, MoreVertical, Volume2, VolumeX } from 'lucide-react';
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
  multiSelect?: boolean;
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
    <div className="px-4 py-2 bg-white/5 border-b border-white/10">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/50">Assessment Progress</span>
        <span className="text-xs font-medium text-attending-light">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-attending-primary to-attending-light transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {phase && <p className="text-xs text-white/40 mt-1">{formatPhaseName(phase)}</p>}
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
  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-attending-header to-attending-deep-navy text-white">
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
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ background: 'transparent' }}>
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
  autoFocus?: boolean;
}> = ({ value, onChange, onSend, disabled, showVoice, isListening, onVoiceToggle, autoFocus }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus text input when no quick replies are available
  useEffect(() => {
    if (autoFocus && !disabled) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus, disabled]);

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
    <div className="px-4 py-3 bg-[#0a3d4e]">
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
              w-full px-4 py-2.5 pr-12 rounded-2xl border border-white/20
              resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent
              disabled:bg-white/5 disabled:cursor-not-allowed
              bg-white/10 text-white placeholder-white/50
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
                ? 'bg-gradient-to-r from-attending-header to-attending-deep-navy text-white shadow-md hover:shadow-lg transform hover:scale-105'
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
  multiSelect = false,
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

  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Text-to-Speech: read assistant messages aloud when enabled
  useEffect(() => {
    if (!ttsEnabled || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'assistant' && lastMsg.content) {
      const utterance = new SpeechSynthesisUtterance(lastMsg.content);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [messages, ttsEnabled]);

  // Speech-to-Text: Web Speech API
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onInputChange(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, onInputChange]);

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-attending-header to-attending-deep-navy text-white">
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setTtsEnabled(!ttsEnabled); if (ttsEnabled) window.speechSynthesis.cancel(); }}
            className={`p-2 rounded-full transition-colors ${ttsEnabled ? 'bg-white/30' : 'hover:bg-white/20'}`}
            title={ttsEnabled ? 'Turn off read-aloud' : 'Read questions aloud'}
          >
            {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {progress > 0 && <ProgressBar progress={progress} phase={currentPhase} />}

      {/* Messages */}
      <MessageList messages={messages} isTyping={isTyping} />

      {/* Input — positioned ABOVE quick replies so user sees type/speak option first */}
      <InputArea
        value={inputValue}
        onChange={onInputChange}
        onSend={handleSend}
        disabled={disabled || isTyping}
        showVoice={showVoiceInput}
        isListening={isListening}
        onVoiceToggle={toggleVoice}
        autoFocus={quickReplies.length === 0}
      />

      {/* Quick Reply Buttons — below the input area */}
      {quickReplies.length > 0 && !isTyping && (
        <div className="px-4 py-2 bg-[#0a3d4e]/80 border-t border-white/5">
          <p className="text-[10px] text-white/40 mb-1.5 text-center">
            {multiSelect ? 'select all that apply, then tap Done' : 'or tap a quick reply'}
          </p>
          <QuickReplies
            replies={quickReplies}
            onSelect={handleQuickReply}
            disabled={disabled}
            columns={quickReplies.length <= 2 ? 2 : quickReplies.length <= 4 ? 2 : 3}
            multiSelect={multiSelect}
          />
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
