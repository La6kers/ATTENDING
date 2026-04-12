// ============================================================
// ATTENDING AI — useMessages Hook
// apps/patient-portal/hooks/useMessages.ts
//
// Hook for patient messaging — conversation list, thread
// messages, send, mark read. Integrates with SignalR for
// real-time message delivery.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { messagesApi } from '../lib/api';
import type { Conversation, ChatMessage, SendMessagePayload } from '../lib/api';

// ============================================================
// Types
// ============================================================

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  totalUnread: number;
  refresh: () => Promise<void>;
  search: (query: string) => void;
}

interface UseMessageThreadReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  hasMore: boolean;
  sendMessage: (content: string, attachmentId?: string) => Promise<boolean>;
  loadMore: () => Promise<void>;
  markRead: () => Promise<void>;
}

// ============================================================
// Conversations list hook
// ============================================================

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const mountedRef = useRef(true);

  const fetchConversations = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const [convRes, unreadRes] = await Promise.all([
        messagesApi.getConversations(),
        messagesApi.getUnreadCount(),
      ]);

      if (mountedRef.current) {
        if (convRes.ok) setConversations(convRes.data ?? []);
        if (unreadRes.ok) setTotalUnread(unreadRes.data?.count ?? 0);
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) {
        setError('Could not load conversations');
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchConversations();
    return () => { mountedRef.current = false; };
  }, [fetchConversations]);

  // Filter by search
  const filtered = searchQuery
    ? conversations.filter(
        (c) =>
          c.provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  return {
    conversations: filtered,
    loading,
    error,
    totalUnread,
    refresh: fetchConversations,
    search: setSearchQuery,
  };
}

// ============================================================
// Message thread hook
// ============================================================

export function useMessageThread(conversationId: string | undefined): UseMessageThreadReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const mountedRef = useRef(true);

  // Fetch initial messages
  useEffect(() => {
    if (!conversationId) return;
    mountedRef.current = true;

    const load = async () => {
      setLoading(true);
      const res = await messagesApi.getMessages(conversationId, { limit: 50 });
      if (mountedRef.current) {
        if (res.ok) {
          setMessages(res.data ?? []);
          setHasMore((res.data?.length ?? 0) >= 50);
        } else {
          setError(res.error?.message ?? 'Could not load messages');
        }
        setLoading(false);
      }
    };

    load();
    return () => { mountedRef.current = false; };
  }, [conversationId]);

  // Send message
  const sendMessage = useCallback(
    async (content: string, attachmentId?: string): Promise<boolean> => {
      if (!conversationId || !content.trim()) return false;
      setSending(true);

      // Optimistic add
      const tempMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversationId,
        sender: 'patient',
        senderName: 'You',
        content,
        timestamp: new Date().toISOString(),
        status: 'sending',
      };
      setMessages((prev) => [...prev, tempMsg]);

      const res = await messagesApi.sendMessage(conversationId, { content, attachmentId });
      setSending(false);

      if (res.ok && res.data) {
        // Replace temp with real
        setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? res.data! : m)));
        return true;
      } else {
        // Mark as failed
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMsg.id ? { ...m, status: 'failed' as const } : m))
        );
        return false;
      }
    },
    [conversationId]
  );

  // Load older messages
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore || messages.length === 0) return;
    const oldest = messages[0]?.timestamp;
    const res = await messagesApi.getMessages(conversationId, { before: oldest, limit: 50 });
    if (!mountedRef.current) return;
    if (res.ok && res.data) {
      setMessages((prev) => [...res.data!, ...prev]);
      setHasMore(res.data.length >= 50);
    }
  }, [conversationId, hasMore, messages]);

  // Mark conversation as read
  const markRead = useCallback(async () => {
    if (!conversationId) return;
    await messagesApi.markRead(conversationId);
  }, [conversationId]);

  // Auto-mark read when viewing
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markRead();
    }
  }, [conversationId, messages.length, markRead]);

  return { messages, loading, error, sending, hasMore, sendMessage, loadMore, markRead };
}

export default useConversations;
