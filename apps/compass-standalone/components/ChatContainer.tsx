// ============================================================
// COMPASS Standalone — Chat Container
// Main chat interface with header, progress, messages, input
// ============================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Mic, MicOff, ChevronLeft, Volume2, VolumeX, Camera } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { QuickReplies } from './QuickReplies';
import { StagedImagePreview } from './ImagePreview';
import { NumberPad } from './NumberPad';
import type { ChatMessage, QuickReply } from '@attending/shared/types/chat.types';
import type { CompassPhase } from '../store/useCompassStore';

// Sentinel value: quick reply that opens the numeric MRN keypad instead of sending text.
const MRN_PAD_SENTINEL = '__open_mrn_pad__';

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
  currentPhase?: CompassPhase;
  patientName?: string;
  disabled?: boolean;
  onPhotoClick?: () => void;
  stagedImage?: { dataUrl: string } | null;
  onRemoveStagedImage?: () => void;
  onSendImage?: (text?: string) => void;
  multiSelect?: boolean;
}

// ============================================================
// Progress Bar
// ============================================================

const formatPhaseName = (phase?: string): string => {
  if (!phase) return '';
  // Split on camelCase first, then restore the HPI acronym. The prior order
  // (replace hpi → HPI → then split on every capital) produced "H P I Severity"
  // because the split treated each letter of "HPI" as a word boundary.
  return phase
    .replace(/([A-Z])/g, ' $1')           // 'hpiSeverity' → 'hpi Severity'
    .replace(/^./, (s) => s.toUpperCase()) // 'Hpi Severity'
    .replace(/\bHpi\b/g, 'HPI')            // 'HPI Severity'
    .trim();
};

const ProgressBar: React.FC<{ progress: number; phase?: CompassPhase }> = ({ progress, phase }) => (
  <div className="px-4 py-2 bg-[#0A2D3D] border-b border-white/10">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-white/50">Assessment Progress</span>
      <span className="text-xs font-medium text-attending-light-teal">{Math.round(progress)}%</span>
    </div>
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-attending-light-teal to-attending-primary transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
    {phase && <p className="text-xs text-white/40 mt-1">{formatPhaseName(phase)}</p>}
  </div>
);

// ============================================================
// Message List
// ============================================================

const MessageList: React.FC<{ messages: ChatMessage[]; isTyping?: boolean }> = ({ messages, isTyping }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Jump to bottom on every new message / typing indicator change so the
    // latest response is always pinned to the bottom of the viewport.
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isTyping]);

  const typingMsg: ChatMessage = { id: 'typing', role: 'assistant', content: '', timestamp: new Date().toISOString() };

  return (
    // Outer: scrollable viewport. Inner: flex column with `justify-end` so that
    // when there are few messages they visually stick to the bottom of the chat
    // area and each new response pushes older ones upward.
    <div className="flex-1 overflow-y-auto bg-attending-deep-navy">
      <div className="min-h-full flex flex-col justify-end px-4 py-4 space-y-2">
        {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
        {isTyping && <MessageBubble message={typingMsg} isTyping />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

// ============================================================
// Input Area
// ============================================================

const InputArea: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isListening?: boolean;
  onVoiceToggle?: () => void;
  onPhotoClick?: () => void;
  stagedImage?: { dataUrl: string } | null;
  onRemoveStagedImage?: () => void;
  autoFocus?: boolean;
}> = ({ value, onChange, onSend, disabled, isListening, onVoiceToggle, onPhotoClick, stagedImage, onRemoveStagedImage, autoFocus }) => {
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
      if (value.trim()) onSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  };

  const hasContent = value.trim() || stagedImage;

  return (
    <div className="px-4 py-3 bg-[#0A2D3D]">
      {/* Staged image preview */}
      {stagedImage && (
        <div className="mb-2">
          <StagedImagePreview dataUrl={stagedImage.dataUrl} onRemove={onRemoveStagedImage || (() => {})} />
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          onClick={onPhotoClick}
          disabled={disabled}
          style={{ height: '44px', width: '44px' }}
          className="flex-shrink-0 rounded-full flex items-center justify-center transition-colors bg-white/10 text-white/60 hover:bg-white/20 hover:text-attending-light-teal disabled:opacity-50"
          title="Add photo"
          aria-label="Add photo"
        >
          <Camera className="w-5 h-5" />
        </button>
        <button
          onClick={onVoiceToggle}
          disabled={disabled}
          style={{ height: '44px', width: '44px' }}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          aria-pressed={isListening}
          className={`flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${
            isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/10 text-white/60 hover:bg-white/20'
          } disabled:opacity-50`}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleInput}
          onKeyPress={handleKeyPress}
          onFocus={() => {
            // Ensure the input scrolls into view after the virtual keyboard
            // animates open on mobile (fires after the viewport resize).
            setTimeout(() => {
              inputRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
            }, 300);
          }}
          placeholder={stagedImage ? "Add a description (optional)..." : "Type your message..."}
          disabled={disabled}
          rows={1}
          // 16px minimum font-size prevents iOS Safari from zooming on focus,
          // which is another common cause of the "keypad covers input" bug.
          className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl border border-white/20 bg-white/10 resize-none focus:outline-none focus:ring-2 focus:ring-attending-light-teal/50 focus:border-transparent disabled:bg-white/5 text-white placeholder-white/40 text-base"
          style={{ maxHeight: '120px', fontSize: '16px' }}
        />
        <button
          onClick={onSend}
          disabled={disabled || !hasContent}
          style={{ height: '44px', width: '44px' }}
          aria-label="Send message"
          className={`flex-shrink-0 rounded-full flex items-center justify-center transition-all ${
            hasContent
              ? 'bg-attending-primary text-white shadow-md hover:shadow-teal transform hover:scale-105'
              : 'bg-white/10 text-white/30'
          } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================

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
  onPhotoClick,
  stagedImage,
  onRemoveStagedImage,
  onSendImage,
  multiSelect = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [showMrnPad, setShowMrnPad] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // If the current phase is no longer welcome (e.g., user completed MRN entry),
  // dismiss the keypad so it doesn't reappear on subsequent phases.
  useEffect(() => {
    if (currentPhase !== 'welcome' && showMrnPad) setShowMrnPad(false);
  }, [currentPhase, showMrnPad]);

  const handleSend = useCallback(() => {
    // If there's a staged image, send it
    if (stagedImage && onSendImage) {
      onSendImage(inputValue.trim() || undefined);
      onInputChange('');
      return;
    }
    if (inputValue.trim() && !disabled) {
      onSend(inputValue.trim());
      onInputChange('');
    }
  }, [inputValue, disabled, onSend, onInputChange, stagedImage, onSendImage]);

  const handleQuickReply = useCallback((reply: QuickReply) => {
    // Intercept the "Enter MRN" sentinel — open the numeric keypad instead of
    // sending a message. The actual MRN value is submitted from the pad.
    if ((reply.value || reply.text) === MRN_PAD_SENTINEL) {
      setShowMrnPad(true);
      return;
    }
    if (onQuickReply) onQuickReply(reply);
    else onSend(reply.value || reply.text);
  }, [onQuickReply, onSend]);

  const handleMrnSubmit = useCallback((mrn: string) => {
    setShowMrnPad(false);
    onSend(mrn);
  }, [onSend]);

  // TTS
  useEffect(() => {
    if (!ttsEnabled || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'assistant' && last.content) {
      const u = new SpeechSynthesisUtterance(last.content);
      u.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  }, [messages, ttsEnabled]);

  // STT
  const toggleVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported. Try Chrome or Edge.'); return; }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (e: any) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      onInputChange(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, onInputChange]);

  return (
    <div className="flex flex-col h-full bg-attending-deep-navy">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0A2D3D] border-b border-white/10 text-white">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1 hover:bg-white/20 rounded-full transition-colors" aria-label="Go back">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            {/* Compass icon with brand gold gradient (matches website gold accents) */}
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="compassGoldGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFD166" />
                  <stop offset="100%" stopColor="#F0A500" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="10" stroke="url(#compassGoldGradient)" />
              <path
                d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"
                stroke="url(#compassGoldGradient)"
              />
            </svg>
            <div>
              <h1 className="font-semibold text-sm">COMPASS</h1>
              {patientName && <p className="text-xs text-white/80">{patientName}</p>}
            </div>
          </div>
        </div>
        <button
          onClick={() => { setTtsEnabled(!ttsEnabled); if (ttsEnabled) window.speechSynthesis.cancel(); }}
          className={`p-2 rounded-full transition-colors ${ttsEnabled ? 'bg-white/30' : 'hover:bg-white/20'}`}
          title={ttsEnabled ? 'Turn off read-aloud' : 'Read questions aloud'}
          aria-label={ttsEnabled ? 'Turn off read-aloud' : 'Read questions aloud'}
          aria-pressed={ttsEnabled}
        >
          {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Progress */}
      {progress > 0 && <ProgressBar progress={progress} phase={currentPhase} />}

      {/* Messages */}
      <MessageList messages={messages} isTyping={isTyping} />

      {/* Footer: either the numeric MRN keypad, or the normal input + quick replies */}
      {showMrnPad ? (
        <NumberPad
          onSubmit={handleMrnSubmit}
          onCancel={() => setShowMrnPad(false)}
          minLength={1}
          maxLength={12}
          label="Enter MRN"
        />
      ) : (
        <>
          <InputArea
            value={inputValue}
            onChange={onInputChange}
            onSend={handleSend}
            disabled={disabled || isTyping}
            isListening={isListening}
            onVoiceToggle={toggleVoice}
            onPhotoClick={onPhotoClick}
            stagedImage={stagedImage}
            onRemoveStagedImage={onRemoveStagedImage}
            autoFocus={quickReplies.length === 0}
          />

          {quickReplies.length > 0 && !isTyping && (
            <div className="px-4 py-2 bg-[#0A2D3D]/80 border-t border-white/5">
              <p className="text-xs text-white/50 mb-1.5 text-center">
                {multiSelect ? 'Select all that apply, then tap Done' : 'Or tap a quick reply'}
              </p>
              <QuickReplies replies={quickReplies} onSelect={handleQuickReply} disabled={disabled} multiSelect={multiSelect} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
