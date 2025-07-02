// Chat Input Component with voice and media support

import React, { useState, useRef, KeyboardEvent } from 'react';
import { usePatientChatStore } from '@/store/patientChatStore';
import { Send, Mic, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ className }) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { sendMessage, isAIProcessing } = usePatientChatStore();

  const handleSend = async () => {
    if (message.trim() && !isAIProcessing) {
      await sendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    // In production, this would integrate with speech-to-text API
    if (!isRecording) {
      console.log('Starting voice recording...');
      // Simulate voice input
      setTimeout(() => {
        setMessage('I have been experiencing severe headaches for the past three days');
        setIsRecording(false);
      }, 2000);
    } else {
      console.log('Stopping voice recording...');
    }
  };

  const handleCameraInput = () => {
    // In production, this would open camera/file upload
    console.log('Camera input requested');
    alert('Camera functionality would allow you to upload images of symptoms, medications, or medical documents.');
  };

  return (
    <div className={cn("bg-white border-t p-4", className)}>
      <div className="flex gap-3 items-center">
        {/* Media Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCameraInput}
            className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors duration-200 shadow-sm hover:shadow-md"
            title="Add photo"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button
            onClick={handleVoiceInput}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md",
              isRecording 
                ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                : "bg-green-500 hover:bg-green-600",
              "text-white"
            )}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            id="chat-input"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your symptoms or chief complaint..."
            disabled={isAIProcessing}
            className={cn(
              "w-full px-4 py-2.5 pr-12 rounded-full border-2 transition-all duration-200",
              "focus:outline-none focus:border-purple-500",
              isAIProcessing 
                ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                : "bg-white border-gray-300 hover:border-gray-400"
            )}
          />
          {isRecording && (
            <div className="absolute right-14 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-500 font-medium">Recording...</span>
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || isAIProcessing}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm",
            message.trim() && !isAIProcessing
              ? "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-md text-white cursor-pointer"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Status Text */}
      {isAIProcessing && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          BioMistral AI is processing your response...
        </p>
      )}
    </div>
  );
};
