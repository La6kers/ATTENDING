// ============================================================
// Chat Input - Message input with quick replies
// apps/provider-portal/components/chat/ChatInput.tsx
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { Send, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import { useProviderChatStore } from '@/store/providerChatStore';

const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    activeConversationId,
    sendMessage,
    isSending,
    quickReplies,
    getActiveConversation,
  } = useProviderChatStore();

  const activeConversation = getActiveConversation();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() || !activeConversationId || isSending) return;

    const messageText = message.trim();
    setMessage('');
    await sendMessage(activeConversationId, messageText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (replyMessage: string) => {
    setMessage(replyMessage);
    setShowQuickReplies(false);
    textareaRef.current?.focus();
  };

  // Check if conversation is claimable or closed
  const isClosed = activeConversation?.status === 'closed';
  const needsClaim = activeConversation?.status === 'open';

  if (isClosed) {
    return (
      <div className="p-4 text-center text-gray-500 bg-gray-50">
        This conversation has been closed
      </div>
    );
  }

  if (needsClaim) {
    return (
      <div className="p-4 text-center">
        <button
          onClick={() => activeConversationId && useProviderChatStore.getState().claimConversation(activeConversationId)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Claim this conversation to respond
        </button>
      </div>
    );
  }

  return (
    <div className="p-3">
      {/* Quick Replies Toggle */}
      <button
        onClick={() => setShowQuickReplies(!showQuickReplies)}
        className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 mb-2"
      >
        <Zap className="w-4 h-4" />
        Quick Replies
        {showQuickReplies ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* Quick Replies Panel */}
      {showQuickReplies && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply) => (
              <button
                key={reply.id}
                onClick={() => handleQuickReply(reply.message)}
                className={`
                  text-xs px-3 py-1.5 rounded-full border transition-colors
                  ${getCategoryColor(reply.category)}
                `}
              >
                {reply.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={isSending}
            className="
              w-full px-4 py-2.5 pr-12
              border border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
              resize-none
              disabled:bg-gray-50 disabled:cursor-not-allowed
            "
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className={`
            p-2.5 rounded-xl transition-all
            ${message.trim() && !isSending
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <Send className={`w-5 h-5 ${isSending ? 'animate-pulse' : ''}`} />
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs text-gray-400 mt-1.5">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
};

// Helper for quick reply category colors
function getCategoryColor(category: string): string {
  switch (category) {
    case 'greeting':
      return 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100';
    case 'followup':
      return 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100';
    case 'instruction':
      return 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100';
    case 'closing':
      return 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100';
  }
}

export default ChatInput;
