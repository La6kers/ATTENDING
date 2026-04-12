// =============================================================================
// ATTENDING AI - Unified Chat Input Component
// apps/shared/components/chat/ChatInput.tsx
//
// Shared chat input field used by both Patient and Provider portals.
// Handles text input, submission, and optional voice input.
// =============================================================================

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

// =============================================================================
// Props Interface
// =============================================================================

export interface ChatInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  showVoiceInput?: boolean;
  maxLength?: number;
  className?: string;
}

// =============================================================================
// Chat Input Component
// =============================================================================

export const ChatInput: React.FC<ChatInputProps> = ({
  value: controlledValue,
  onChange: controlledOnChange,
  onSend,
  placeholder = 'Type your message...',
  disabled = false,
  isLoading = false,
  showVoiceInput = false,
  maxLength = 2000,
  className = '',
}) => {
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use controlled or uncontrolled value
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = (newValue: string) => {
    if (controlledOnChange) {
      controlledOnChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  // Handle send
  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isLoading) return;

    onSend(trimmed);
    setValue('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle keyboard submit
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || isLoading;
  const canSend = value.trim().length > 0 && !isDisabled;

  return (
    <div className={`bg-white border-t border-gray-200 p-4 ${className}`}>
      <div className="flex items-end gap-3">
        {/* Voice Input Button (optional) */}
        {showVoiceInput && (
          <button
            type="button"
            disabled={isDisabled}
            className={`
              flex-shrink-0 p-2 rounded-full transition-colors
              ${isDisabled
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
              }
            `}
            title="Voice input (coming soon)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        )}

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            maxLength={maxLength}
            rows={1}
            className={`
              w-full px-4 py-3 rounded-2xl border resize-none transition-all
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
              ${isDisabled
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-gray-50 text-gray-800 border-gray-200 hover:border-purple-300'
              }
            `}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />

          {/* Character count (when near limit) */}
          {value.length > maxLength * 0.8 && (
            <span
              className={`
                absolute bottom-1 right-14 text-xs
                ${value.length >= maxLength ? 'text-red-500' : 'text-gray-400'}
              `}
            >
              {value.length}/{maxLength}
            </span>
          )}
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={`
            flex-shrink-0 p-3 rounded-full transition-all
            ${canSend
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
          title="Send message"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-400 mt-2 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
};

export default ChatInput;
