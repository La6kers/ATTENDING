// ============================================================
// Chat Toggle Button - Floating button to open chat panel
// apps/provider-portal/components/chat/ChatToggleButton.tsx
// ============================================================

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useProviderChatStore } from '@/store/providerChatStore';

interface ChatToggleButtonProps {
  className?: string;
}

const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({ className = '' }) => {
  const { openPanel, totalUnreadCount, getUrgentConversations } = useProviderChatStore();
  const urgentCount = getUrgentConversations().length;

  return (
    <button
      onClick={openPanel}
      className={`
        relative p-3 rounded-full shadow-lg transition-all
        hover:shadow-xl hover:scale-105 active:scale-95
        ${urgentCount > 0 
          ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
        }
        ${className}
      `}
      title={`${totalUnreadCount} unread messages`}
    >
      <MessageCircle className="w-6 h-6 text-white" />
      
      {/* Unread Badge */}
      {totalUnreadCount > 0 && (
        <span className="
          absolute -top-1 -right-1
          bg-red-500 text-white text-xs font-bold
          min-w-[20px] h-5 px-1.5
          rounded-full flex items-center justify-center
          border-2 border-white
        ">
          {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
        </span>
      )}

      {/* Urgent Pulse Ring */}
      {urgentCount > 0 && (
        <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-75" />
      )}
    </button>
  );
};

export default ChatToggleButton;
