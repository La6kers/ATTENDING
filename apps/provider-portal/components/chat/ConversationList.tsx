// ============================================================
// Conversation List - Shows all patient conversations
// apps/provider-portal/components/chat/ConversationList.tsx
// ============================================================

import React from 'react';
import { AlertTriangle, Clock, CheckCircle, User } from 'lucide-react';
import { useProviderChatStore, ChatConversation } from '@/store/providerChatStore';
import { formatDistanceToNow } from 'date-fns';

const ConversationList: React.FC = () => {
  const { 
    conversations, 
    activeConversationId, 
    setActiveConversation 
  } = useProviderChatStore();

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={activeConversationId === conv.id}
          onClick={() => setActiveConversation(conv.id)}
        />
      ))}
    </div>
  );
};

interface ConversationItemProps {
  conversation: ChatConversation;
  isActive: boolean;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const urgencyColors: Record<string, string> = {
    emergent: 'border-l-red-500 bg-red-50',
    stat: 'border-l-orange-500 bg-orange-50',
    urgent: 'border-l-yellow-500 bg-yellow-50',
    routine: 'border-l-green-500',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    open: <Clock className="w-3 h-3 text-yellow-600" />,
    claimed: <User className="w-3 h-3 text-blue-600" />,
    closed: <CheckCircle className="w-3 h-3 text-green-600" />,
  };

  const isUrgent = conversation.urgencyLevel === 'emergent' || conversation.urgencyLevel === 'stat';

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-3 border-l-4 transition-colors
        ${urgencyColors[conversation.urgencyLevel] || ''}
        ${isActive ? 'bg-purple-50 border-l-purple-600' : 'hover:bg-gray-100'}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isUrgent && (
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            )}
            <span className="font-medium text-gray-900 text-sm truncate">
              {conversation.patientName}
            </span>
          </div>
          
          {conversation.lastMessage && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {conversation.lastMessage.sender === 'provider' && (
                <span className="text-purple-600">You: </span>
              )}
              {conversation.lastMessage.content}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {conversation.unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </span>
          )}
          <div className="flex items-center gap-1">
            {statusIcons[conversation.status]}
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: false })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

export default ConversationList;
