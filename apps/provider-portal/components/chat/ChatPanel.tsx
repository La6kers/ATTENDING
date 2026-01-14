// ============================================================
// Chat Panel - Slide-out Panel for Provider-Patient Chat
// apps/provider-portal/components/chat/ChatPanel.tsx
// ============================================================

import React, { useEffect } from 'react';
import { X, MessageCircle, AlertTriangle, Users } from 'lucide-react';
import { useProviderChatStore } from '@/store/providerChatStore';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import ChatInput from './ChatInput';

const ChatPanel: React.FC = () => {
  const {
    isPanelOpen,
    closePanel,
    activeConversationId,
    setActiveConversation,
    getActiveConversation,
    totalUnreadCount,
    fetchConversations,
    isLoading,
  } = useProviderChatStore();

  const activeConversation = getActiveConversation();

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  if (!isPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={closePanel}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5" />
            <h2 className="font-semibold">Patient Messages</h2>
            {totalUnreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalUnreadCount}
              </span>
            )}
          </div>
          <button
            onClick={closePanel}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation List */}
          <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[200px] border-r bg-gray-50`}>
            <div className="p-3 border-b bg-white">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>Conversations</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading...
                </div>
              ) : (
                <ConversationList />
              )}
            </div>
          </div>

          {/* Message Thread */}
          <div className={`${activeConversationId ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
            {activeConversation ? (
              <>
                {/* Conversation Header */}
                <div className="p-3 border-b bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveConversation(null)}
                      className="md:hidden p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {activeConversation.patientName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <UrgencyBadge level={activeConversation.urgencyLevel} />
                        <span>•</span>
                        <span>{activeConversation.status}</span>
                      </div>
                    </div>
                  </div>
                  {activeConversation.status === 'open' && (
                    <button
                      onClick={() => useProviderChatStore.getState().claimConversation(activeConversation.id)}
                      className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      Claim
                    </button>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto">
                  <MessageThread />
                </div>

                {/* Input */}
                <div className="border-t bg-white">
                  <ChatInput />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <MessageCircle className="w-12 h-12 mb-3" />
                <p>Select a conversation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Urgency Badge Component
const UrgencyBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors: Record<string, string> = {
    emergent: 'bg-red-100 text-red-700',
    stat: 'bg-orange-100 text-orange-700',
    urgent: 'bg-yellow-100 text-yellow-700',
    routine: 'bg-green-100 text-green-700',
  };

  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${colors[level] || colors.routine}`}>
      {level.toUpperCase()}
    </span>
  );
};

export default ChatPanel;
