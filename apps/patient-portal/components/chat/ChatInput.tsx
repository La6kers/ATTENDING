// ============================================================
// COMPASS Enhanced Chat Input Component
// apps/patient-portal/components/chat/ChatInput.tsx
//
// Integrated voice input, camera capture, and text messaging
// Revolutionary Feature: Multi-modal patient symptom reporting
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Camera, Loader2, X, Image as ImageIcon, Paperclip } from 'lucide-react';
import { VoiceInput } from '../media/VoiceInput';
import { CameraCapture } from '../media/CameraCapture';

interface Attachment {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  showVoiceInput?: boolean;
  showCameraInput?: boolean;
  maxAttachments?: number;
}

export function ChatInput({ 
  onSend, 
  onTyping,
  disabled = false, 
  placeholder = "Type your message or tap the microphone to speak...",
  showVoiceInput = true,
  showCameraInput = true,
  maxAttachments = 3
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Typing indicator
  useEffect(() => {
    if (message.length > 0) {
      onTyping?.(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        onTyping?.(false);
      }, 2000);
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, onTyping]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedMessage = message.trim();
    if ((trimmedMessage || attachments.length > 0) && !disabled && !isProcessing) {
      onSend(trimmedMessage, attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
      onTyping?.(false);
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [message, attachments, disabled, isProcessing, onSend, onTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Voice input handlers
  const handleVoiceTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setMessage(prev => {
        const newMessage = prev ? `${prev} ${text}` : text;
        return newMessage;
      });
    }
  }, []);

  const handleVoiceListeningChange = useCallback((isListening: boolean) => {
    setIsVoiceActive(isListening);
  }, []);

  // Camera capture handler
  const handleCameraCapture = useCallback((file: File, preview: string) => {
    if (attachments.length >= maxAttachments) {
      alert(`Maximum ${maxAttachments} attachments allowed`);
      return;
    }

    const newAttachment: Attachment = {
      id: `attachment-${Date.now()}`,
      file,
      preview,
      type: file.type.startsWith('video/') ? 'video' : 'image',
    };

    setAttachments(prev => [...prev, newAttachment]);
    setShowCamera(false);
  }, [attachments.length, maxAttachments]);

  // File upload handler
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = maxAttachments - attachments.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    filesToAdd.forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const preview = URL.createObjectURL(file);
        const newAttachment: Attachment = {
          id: `attachment-${Date.now()}-${Math.random()}`,
          file,
          preview,
          type: file.type.startsWith('video/') ? 'video' : 'image',
        };
        setAttachments(prev => [...prev, newAttachment]);
      }
    });

    // Reset input
    e.target.value = '';
  }, [attachments.length, maxAttachments]);

  // Remove attachment
  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  }, []);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      attachments.forEach(a => URL.revokeObjectURL(a.preview));
    };
  }, []);

  const canSend = (message.trim() || attachments.length > 0) && !disabled && !isProcessing;

  return (
    <>
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <CameraCapture
              onCapture={handleCameraCapture}
              onClose={() => setShowCamera(false)}
              mode="both"
              maxDuration={30}
              guideText="Take a photo of the affected area"
            />
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative flex-shrink-0">
                {attachment.type === 'image' ? (
                  <img
                    src={attachment.preview}
                    alt="Attachment"
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main Input Row */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex items-end gap-2">
            {/* Attachment Button */}
            {showCameraInput && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  disabled={disabled || attachments.length >= maxAttachments}
                  className="p-2.5 rounded-xl text-gray-500 hover:text-purple-600 hover:bg-purple-50 
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Take photo"
                >
                  <Camera className="w-5 h-5" />
                </button>
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || attachments.length >= maxAttachments}
                  className="p-2.5 rounded-xl text-gray-500 hover:text-purple-600 hover:bg-purple-50 
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            )}

            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isVoiceActive ? "Listening..." : placeholder}
                disabled={disabled || isVoiceActive}
                rows={1}
                className={`
                  w-full px-4 py-3 pr-12
                  border rounded-xl
                  resize-none
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                  placeholder:text-gray-400
                  disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
                  transition-all duration-200
                  ${isVoiceActive ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                `}
                style={{ maxHeight: '150px' }}
              />
              
              {/* Voice indicator */}
              {isVoiceActive && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-red-600">Recording</span>
                </div>
              )}
            </div>

            {/* Voice Input Button */}
            {showVoiceInput && (
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                onListeningChange={handleVoiceListeningChange}
                disabled={disabled}
                size="md"
                variant="inline"
                showWaveform={true}
                continuous={true}
              />
            )}

            {/* Send Button */}
            <button
              type="submit"
              disabled={!canSend}
              className={`
                p-3 rounded-xl transition-all duration-200
                ${canSend
                  ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
              aria-label="Send message"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Helper text */}
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <span>
              {showVoiceInput 
                ? 'Type, speak, or attach photos' 
                : 'Press Enter to send, Shift+Enter for new line'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Secure & encrypted
            </span>
          </div>
        </form>
      </div>
    </>
  );
}

export default ChatInput;
