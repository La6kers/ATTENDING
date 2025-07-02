// Quick Replies Component for chat suggestions

import React, { useState } from 'react';
import { usePatientChatStore } from '@/store/patientChatStore';
import { cn } from '@/lib/utils';
import { Check, Send } from 'lucide-react';

interface QuickRepliesProps {
  replies: string[];
  className?: string;
}

export const QuickReplies: React.FC<QuickRepliesProps> = ({ replies, className }) => {
  const { sendMessage, messages } = usePatientChatStore();
  const [selectedReplies, setSelectedReplies] = useState<string[]>([]);
  
  // Get the last AI message to determine if multiple selections are allowed
  const lastAIMessage = messages.filter(m => m.role === 'assistant').pop();
  const lastMessageContent = lastAIMessage?.content.toLowerCase() || '';
  
  // Determine if this is a multiple choice question based on context
  const allowsMultipleSelection = 
    lastMessageContent.includes('any of the following') ||
    lastMessageContent.includes('select all') ||
    lastMessageContent.includes('which of these') ||
    (lastMessageContent.includes('symptoms') && replies.some(r => r.toLowerCase().includes('multiple'))) ||
    replies.some(r => r.toLowerCase().includes('multiple'));
  
  // Auto-submit for single answer questions
  const shouldAutoSubmit = 
    replies.length === 1 || 
    replies.every(r => ['yes', 'no', 'not sure'].includes(r.toLowerCase())) ||
    lastMessageContent.includes('scale of 1-10') ||
    lastMessageContent.includes('when exactly');

  const handleQuickReply = (reply: string) => {
    if (shouldAutoSubmit || !allowsMultipleSelection) {
      // Single selection - send immediately
      sendMessage(reply);
    } else {
      // Multiple selection - toggle selection
      setSelectedReplies(prev => {
        if (prev.includes(reply)) {
          return prev.filter(r => r !== reply);
        } else {
          return [...prev, reply];
        }
      });
    }
  };

  const handleSubmitMultiple = () => {
    if (selectedReplies.length > 0) {
      const message = selectedReplies.join(', ');
      sendMessage(message);
      setSelectedReplies([]);
    }
  };

  return (
    <div className={cn("mt-3", className)}>
      <div className="grid grid-cols-2 gap-2">
        {replies.map((reply, index) => {
          const isSelected = selectedReplies.includes(reply);
          return (
            <button
              key={index}
              onClick={() => handleQuickReply(reply)}
              className={cn(
                "relative text-xs font-medium py-2 px-3 rounded-full transition-all duration-200 text-center",
                isSelected
                  ? "bg-green-500 text-white border-2 border-green-600 hover:bg-green-600"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 hover:border-gray-300"
              )}
            >
              {reply}
              {isSelected && allowsMultipleSelection && (
                <Check className="absolute top-1 right-1 w-3 h-3" />
              )}
            </button>
          );
        })}
      </div>
      
      {allowsMultipleSelection && !shouldAutoSubmit && selectedReplies.length > 0 && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={handleSubmitMultiple}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium py-2 px-6 rounded-full hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Submit Selected ({selectedReplies.length})
          </button>
        </div>
      )}
      
      {allowsMultipleSelection && !shouldAutoSubmit && selectedReplies.length === 0 && (
        <p className="text-xs text-gray-500 text-center mt-2">
          Select all that apply, then submit
        </p>
      )}
    </div>
  );
};
