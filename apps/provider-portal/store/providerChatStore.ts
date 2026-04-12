// ============================================================
// Provider Chat Store - Zustand Store for Chat Management
// apps/provider-portal/store/providerChatStore.ts
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ============================================================
// TYPES
// ============================================================

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: 'patient' | 'provider' | 'system';
  content: string;
  contentType: 'text' | 'quick-reply' | 'attachment' | 'system';
  metadata?: {
    attachmentUrl?: string;
    attachmentType?: string;
    isUrgent?: boolean;
    readAt?: string;
  };
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  patientId: string;
  patientName: string;
  assessmentId?: string;
  providerId?: string;
  providerName?: string;
  status: 'open' | 'claimed' | 'closed';
  urgencyLevel: 'routine' | 'urgent' | 'stat' | 'emergent';
  lastMessage?: {
    content: string;
    timestamp: string;
    sender: 'patient' | 'provider' | 'system';
  };
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuickReply {
  id: string;
  label: string;
  message: string;
  category: 'greeting' | 'followup' | 'instruction' | 'closing';
}

interface ProviderChatState {
  // State
  conversations: ChatConversation[];
  activeConversationId: string | null;
  messages: Record<string, ChatMessage[]>;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  isPanelOpen: boolean;
  isTyping: Record<string, boolean>; // patientId -> isTyping
  
  // Quick replies
  quickReplies: QuickReply[];
  
  // Unread counts
  totalUnreadCount: number;
  
  // Actions
  setConversations: (conversations: ChatConversation[]) => void;
  addConversation: (conversation: ChatConversation) => void;
  updateConversation: (id: string, updates: Partial<ChatConversation>) => void;
  removeConversation: (id: string) => void;
  
  setActiveConversation: (id: string | null) => void;
  
  setMessages: (conversationId: string, messages: ChatMessage[]) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessageStatus: (conversationId: string, messageId: string, status: ChatMessage['status']) => void;
  
  setTyping: (patientId: string, isTyping: boolean) => void;
  
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed
  getActiveConversation: () => ChatConversation | null;
  getActiveMessages: () => ChatMessage[];
  getUrgentConversations: () => ChatConversation[];
  
  // API Actions
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  claimConversation: (conversationId: string) => Promise<void>;
  closeConversation: (conversationId: string, reason?: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
}

// ============================================================
// DEFAULT QUICK REPLIES
// ============================================================

const defaultQuickReplies: QuickReply[] = [
  {
    id: 'qr-1',
    label: 'Reviewing',
    message: 'I\'m reviewing your assessment now. I\'ll be with you shortly.',
    category: 'greeting',
  },
  {
    id: 'qr-2',
    label: 'More Info',
    message: 'Thank you for the information. Can you provide more details about when this started?',
    category: 'followup',
  },
  {
    id: 'qr-3',
    label: 'Ordering Tests',
    message: 'Based on your symptoms, I\'m ordering some tests to help diagnose your condition. You\'ll receive instructions shortly.',
    category: 'instruction',
  },
  {
    id: 'qr-4',
    label: 'Go to ER',
    message: '⚠️ Based on your symptoms, I recommend you go to the nearest Emergency Room immediately. Please call 911 if needed.',
    category: 'instruction',
  },
  {
    id: 'qr-5',
    label: 'Schedule Visit',
    message: 'I recommend we schedule an in-person visit to evaluate your symptoms further. Our staff will contact you to arrange an appointment.',
    category: 'instruction',
  },
  {
    id: 'qr-6',
    label: 'Treatment Plan',
    message: 'I\'ve reviewed your case and am sending you a treatment plan. Please follow the instructions and let me know if you have questions.',
    category: 'closing',
  },
];

// ============================================================
// STORE
// ============================================================

export const useProviderChatStore = create<ProviderChatState>()(
  immer((set, get) => ({
    // Initial State
    conversations: [],
    activeConversationId: null,
    messages: {},
    isLoading: false,
    isSending: false,
    error: null,
    isPanelOpen: false,
    isTyping: {},
    quickReplies: defaultQuickReplies,
    totalUnreadCount: 0,

    // Actions
    setConversations: (conversations) => {
      set((state) => {
        state.conversations = conversations;
        state.totalUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
      });
    },

    addConversation: (conversation) => {
      set((state) => {
        // Add at beginning (newest first)
        state.conversations.unshift(conversation);
        state.totalUnreadCount += conversation.unreadCount;
      });
    },

    updateConversation: (id, updates) => {
      set((state) => {
        const index = state.conversations.findIndex((c) => c.id === id);
        if (index !== -1) {
          const oldUnread = state.conversations[index].unreadCount;
          state.conversations[index] = { ...state.conversations[index], ...updates };
          const newUnread = state.conversations[index].unreadCount;
          state.totalUnreadCount += newUnread - oldUnread;
        }
      });
    },

    removeConversation: (id) => {
      set((state) => {
        const index = state.conversations.findIndex((c) => c.id === id);
        if (index !== -1) {
          state.totalUnreadCount -= state.conversations[index].unreadCount;
          state.conversations.splice(index, 1);
          if (state.activeConversationId === id) {
            state.activeConversationId = null;
          }
        }
      });
    },

    setActiveConversation: (id) => {
      set((state) => {
        state.activeConversationId = id;
      });
      // Fetch messages when conversation is selected
      if (id) {
        get().fetchMessages(id);
        get().markAsRead(id);
      }
    },

    setMessages: (conversationId, messages) => {
      set((state) => {
        state.messages[conversationId] = messages;
      });
    },

    addMessage: (conversationId, message) => {
      set((state) => {
        if (!state.messages[conversationId]) {
          state.messages[conversationId] = [];
        }
        state.messages[conversationId].push(message);
        
        // Update conversation's last message
        const convIndex = state.conversations.findIndex((c) => c.id === conversationId);
        if (convIndex !== -1) {
          state.conversations[convIndex].lastMessage = {
            content: message.content,
            timestamp: message.createdAt,
            sender: message.senderType,
          };
          state.conversations[convIndex].updatedAt = message.createdAt;
          
          // Increment unread if from patient and not active conversation
          if (message.senderType === 'patient' && state.activeConversationId !== conversationId) {
            state.conversations[convIndex].unreadCount++;
            state.totalUnreadCount++;
          }
        }
      });
    },

    updateMessageStatus: (conversationId, messageId, status) => {
      set((state) => {
        const messages = state.messages[conversationId];
        if (messages) {
          const msgIndex = messages.findIndex((m) => m.id === messageId);
          if (msgIndex !== -1) {
            messages[msgIndex].status = status;
          }
        }
      });
    },

    setTyping: (patientId, isTyping) => {
      set((state) => {
        state.isTyping[patientId] = isTyping;
      });
    },

    togglePanel: () => {
      set((state) => {
        state.isPanelOpen = !state.isPanelOpen;
      });
    },

    openPanel: () => {
      set((state) => {
        state.isPanelOpen = true;
      });
    },

    closePanel: () => {
      set((state) => {
        state.isPanelOpen = false;
      });
    },

    setLoading: (loading) => {
      set((state) => {
        state.isLoading = loading;
      });
    },

    setSending: (sending) => {
      set((state) => {
        state.isSending = sending;
      });
    },

    setError: (error) => {
      set((state) => {
        state.error = error;
      });
    },

    // Computed
    getActiveConversation: () => {
      const state = get();
      if (!state.activeConversationId) return null;
      return state.conversations.find((c) => c.id === state.activeConversationId) || null;
    },

    getActiveMessages: () => {
      const state = get();
      if (!state.activeConversationId) return [];
      return state.messages[state.activeConversationId] || [];
    },

    getUrgentConversations: () => {
      const state = get();
      return state.conversations.filter(
        (c) => c.urgencyLevel === 'emergent' || c.urgencyLevel === 'stat'
      );
    },

    // API Actions
    fetchConversations: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const response = await fetch('/api/chat/conversations');
        if (!response.ok) throw new Error('Failed to fetch conversations');
        
        const data = await response.json();
        get().setConversations(data.conversations);
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch conversations';
        });
      } finally {
        set((state) => {
          state.isLoading = false;
        });
      }
    },

    fetchMessages: async (conversationId) => {
      try {
        const response = await fetch(`/api/chat/conversations/${conversationId}/messages`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        
        const data = await response.json();
        get().setMessages(conversationId, data.messages);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    },

    sendMessage: async (conversationId, content) => {
      set((state) => {
        state.isSending = true;
      });

      try {
        const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) throw new Error('Failed to send message');
        
        const message = await response.json();
        get().addMessage(conversationId, message);
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to send message';
        });
      } finally {
        set((state) => {
          state.isSending = false;
        });
      }
    },

    claimConversation: async (conversationId) => {
      try {
        const response = await fetch(`/api/chat/conversations/${conversationId}/claim`, {
          method: 'POST',
        });

        if (!response.ok) throw new Error('Failed to claim conversation');
        
        const data = await response.json();
        get().updateConversation(conversationId, {
          status: 'claimed',
          providerId: data.conversation.providerId,
          providerName: data.conversation.providerName,
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to claim conversation';
        });
      }
    },

    closeConversation: async (conversationId, reason) => {
      try {
        const response = await fetch(`/api/chat/conversations/${conversationId}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });

        if (!response.ok) throw new Error('Failed to close conversation');
        
        get().updateConversation(conversationId, { status: 'closed' });
        get().setActiveConversation(null);
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to close conversation';
        });
      }
    },

    markAsRead: async (conversationId) => {
      try {
        await fetch(`/api/chat/conversations/${conversationId}/read`, {
          method: 'POST',
        });
        
        get().updateConversation(conversationId, { unreadCount: 0 });
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    },
  }))
);

export default useProviderChatStore;
