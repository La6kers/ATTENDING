// ============================================================
// ATTENDING AI — Mobile Messages API
// apps/mobile/lib/api/messages.ts
// ============================================================

import api from './mobileApiClient';

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

export const messagesApi = {
  getConversations: () =>
    api.get<Conversation[]>('/patient/messages/conversations'),

  getMessages: (conversationId: string, params?: { before?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.before) sp.set('before', params.before);
    if (params?.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    return api.get<Message[]>(`/patient/messages/${conversationId}${qs ? `?${qs}` : ''}`);
  },

  sendMessage: (conversationId: string, payload: SendMessagePayload) =>
    api.post<Message>(`/patient/messages/${conversationId}`, payload, {
      offlineQueue: true,
    }),

  markRead: (conversationId: string) =>
    api.post(`/patient/messages/${conversationId}/read`),

  getUnreadCount: () =>
    api.get<{ count: number }>('/patient/messages/unread'),

  search: (query: string) =>
    api.get<Message[]>(`/patient/messages/search?q=${encodeURIComponent(query)}`),
};
