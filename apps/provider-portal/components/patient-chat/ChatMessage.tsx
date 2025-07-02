// Chat Message Component

import React from 'react';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { Compass, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickReplies } from './QuickReplies';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800 max-w-md">
          <div dangerouslySetInnerHTML={{ __html: message.content }} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3", isUser && "justify-end")}>
      {!isUser && (
        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white flex-shrink-0">
          <Compass className="w-5 h-5" />
        </div>
      )}
      
      <div className={cn("flex flex-col max-w-[80%]", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 shadow-sm",
            isUser
              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-none"
              : "bg-white rounded-tl-none"
          )}
        >
          <div 
            className={cn("text-sm leading-relaxed", isUser ? "text-white" : "text-gray-700")}
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        </div>

        {/* AI Thinking Indicator */}
        {!isUser && message.metadata?.aiThinking && (
          <div className="mt-2 bg-green-50 border-l-4 border-green-500 rounded-r-lg px-3 py-2">
            <p className="text-xs text-green-700 italic">
              🧠 {message.metadata.aiThinking}
            </p>
          </div>
        )}

        {/* Quick Replies */}
        {!isUser && message.metadata?.quickReplies && message.metadata.quickReplies.length > 0 && (
          <QuickReplies replies={message.metadata.quickReplies} />
        )}

        {/* Clinical Data Extraction (for debugging/transparency) */}
        {!isUser && message.metadata?.clinicalData && process.env.NODE_ENV === 'development' && (
          <details className="mt-2 text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">Clinical Data Extracted</summary>
            <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(message.metadata.clinicalData, null, 2)}
            </pre>
          </details>
        )}
      </div>

      {isUser && (
        <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 flex-shrink-0">
          <User className="w-5 h-5" />
        </div>
      )}
    </div>
  );
};
