// ============================================================
// ATTENDING AI — Messages API Service
// apps/patient-portal/lib/api/messages.ts
//
// Patient ↔ Provider messaging. Messages are stored per
// conversation thread, each tied to a provider relationship.
// ============================================================

import api from './client';

// ============================================================
// Types
// ============================================================

export interface Conversation {
  id: string;
  provider: {
    id: string;
    name: string;
    specialty: string;
    practice: string;
    avatarUrl?: string;
  };
  lastMessage: {
    content: string;
    sender: 'patient' | 'provider';
    timestamp: string;
    hasAttachment: boolean;
  };
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: 'patient' | 'provider';
  senderName: string;
  content: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachment?: {
    id: string;
    type: 'document' | 'image' | 'lab-result';
    name: string;
    size: string;
    url?: string;
  };
}

export interface SendMessagePayload {
  content: string;
  attachmentId?: string;
}

// ============================================================
// API Functions
// ============================================================

export const messagesApi = {
  /** Get all conversations for current patient */
  getConversations: () =>
    api.get<Conversation[]>('/patient/messages/conversations'),

  /** Get messages in a conversation thread */
  getMessages: (conversationId: string, params?: { before?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.before) sp.set('before', params.before);
    if (params?.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    return api.get<Message[]>(`/patient/messages/${conversationId}${qs ? `?${qs}` : ''}`);
  },

  /** Send a message in a conversation */
  sendMessage: (conversationId: string, payload: SendMessagePayload) =>
    api.post<Message>(`/patient/messages/${conversationId}`, payload, {
      offlineQueue: true,
    }),

  /** Mark messages as read */
  markRead: (conversationId: string) =>
    api.post(`/patient/messages/${conversationId}/read`),

  /** Get total unread count */
  getUnreadCount: () =>
    api.get<{ count: number }>('/patient/messages/unread'),

  /** Search messages */
  search: (query: string) =>
    api.get<Message[]>(`/patient/messages/search?q=${encodeURIComponent(query)}`),
};

export default messagesApi;
