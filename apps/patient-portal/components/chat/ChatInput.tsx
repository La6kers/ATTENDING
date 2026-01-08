// ============================================================
// COMPASS Chat Input Component
// apps/patient-portal/components/chat/ChatInput.tsx
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Paperclip, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showVoiceInput?: boolean;
}

export function ChatInput({ 
  onSend, 
  disabled = false, 
  placeholder = "Type your message...",
  showVoiceInput = false 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoiceInput = () => {
    // Voice input implementation would go here
    setIsListening(!isListening);
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="border-t border-gray-200 bg-white p-4"
    >
      <div className="flex items-end gap-3">
        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={`
              w-full px-4 py-3 pr-12
              border border-gray-300 rounded-xl
              resize-none
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              placeholder:text-gray-400
              disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
              transition-all duration-200
            `}
            style={{ maxHeight: '150px' }}
          />
          
          {/* Character count for long messages */}
          {message.length > 200 && (
            <span className="absolute right-3 bottom-3 text-xs text-gray-400">
              {message.length}/500
            </span>
          )}
        </div>

        {/* Voice Input Button */}
        {showVoiceInput && (
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={disabled}
            className={`
              p-3 rounded-xl transition-all duration-200
              ${isListening 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>
        )}

        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className={`
            p-3 rounded-xl transition-all duration-200
            ${message.trim() && !disabled
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
          aria-label="Send message"
        >
          {disabled ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Helper text */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          Secure & encrypted
        </span>
      </div>
    </form>
  );
}

export default ChatInput;
