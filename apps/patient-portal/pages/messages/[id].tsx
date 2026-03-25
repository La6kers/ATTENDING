// ============================================================
// ATTENDING AI — Message Conversation View
// apps/patient-portal/pages/messages/[id].tsx
//
// Threaded message view between patient and provider:
// - Message bubbles (sent / received)
// - Attachments (lab results, documents)
// - Compose / reply
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Send,
  Paperclip,
  File,
  Image,
  CheckCheck,
  Clock,
  MoreVertical,
  Phone,
  Video,
  Loader2,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { useMessageThread } from '../../hooks/useMessages';

// ============================================================
// Types
// ============================================================

interface Message {
  id: string;
  sender: 'patient' | 'provider';
  senderName: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  attachment?: {
    type: 'document' | 'image' | 'lab-result';
    name: string;
    size: string;
  };
}

interface ConversationData {
  id: string;
  provider: string;
  practice: string;
  messages: Message[];
}

// ============================================================
// Message Bubble
// ============================================================

function MessageBubble({ message }: { message: Message }) {
  const isPatient = message.sender === 'patient';

  return (
    <div className={`flex ${isPatient ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
      <div className={`max-w-[80%] ${isPatient ? 'order-1' : 'order-1'}`}>
        {/* Sender name (provider messages) */}
        {!isPatient && (
          <p className="text-[10px] text-attending-200 font-medium mb-1 ml-1">
            {message.senderName}
          </p>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isPatient
              ? 'bg-attending-primary text-white rounded-br-md'
              : 'bg-white border border-light text-attending-deep-navy rounded-bl-md'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

          {/* Attachment */}
          {message.attachment && (
            <div
              className={`mt-2 p-2.5 rounded-lg flex items-center gap-2 ${
                isPatient ? 'bg-white/15' : 'bg-attending-50'
              }`}
            >
              {message.attachment.type === 'image' ? (
                <Image className={`w-4 h-4 ${isPatient ? 'text-white/70' : 'text-attending-primary'}`} />
              ) : (
                <File className={`w-4 h-4 ${isPatient ? 'text-white/70' : 'text-attending-primary'}`} />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${isPatient ? 'text-white' : 'text-attending-deep-navy'}`}>
                  {message.attachment.name}
                </p>
                <p className={`text-[10px] ${isPatient ? 'text-white/60' : 'text-attending-200'}`}>
                  {message.attachment.size}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Timestamp + status */}
        <div className={`flex items-center gap-1 mt-1 ${isPatient ? 'justify-end mr-1' : 'ml-1'}`}>
          <span className="text-[10px] text-attending-200">{message.timestamp}</span>
          {isPatient && message.status === 'read' && (
            <CheckCheck className="w-3 h-3 text-attending-primary" />
          )}
          {isPatient && message.status === 'delivered' && (
            <CheckCheck className="w-3 h-3 text-attending-200" />
          )}
          {isPatient && message.status === 'sent' && (
            <Clock className="w-3 h-3 text-attending-200" />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export default function ConversationPage() {
  const router = useRouter();
  const { id } = router.query;
  const conversationId = id ? String(id) : undefined;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  // ── Live data from API ──
  const {
    messages: apiMessages,
    loading,
    sending,
    sendMessage,
    loadMore,
    hasMore,
  } = useMessageThread(conversationId);

  // Map API messages → component shape, with fallback
  const messages: Message[] = (apiMessages ?? []).map((m) => ({
    id: m.id,
    sender: m.sender,
    senderName: m.senderName,
    content: m.content,
    timestamp: formatMsgTime(m.timestamp),
    status: m.status === 'sending' ? 'sent' : m.status === 'failed' ? 'sent' : m.status,
    attachment: m.attachment
      ? { type: m.attachment.type, name: m.attachment.name, size: m.attachment.size }
      : undefined,
  }));

  // Provider info from first provider message, or default
  const firstProviderMsg = apiMessages?.find((m) => m.sender === 'provider');
  const conversation: ConversationData = {
    id: conversationId ?? '',
    provider: firstProviderMsg?.senderName ?? 'Dr. Sarah Chen',
    practice: 'Parker Family Medicine',
    messages,
  };

  const initials = conversation.provider
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Head>
        <title>{conversation.provider} | ATTENDING AI</title>
      </Head>

      <AppShell hideNav>
        {/* Header */}
        <header className="bg-white border-b border-light safe-area-top sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.push('/messages')}
              className="w-9 h-9 rounded-full bg-attending-50 flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-attending-deep-navy" />
            </button>

            <div className="w-10 h-10 rounded-full bg-attending-gradient flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">{initials}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-attending-deep-navy truncate">
                {conversation.provider}
              </p>
              <p className="text-xs text-attending-200 truncate">{conversation.practice}</p>
            </div>

            <div className="flex items-center gap-1">
              <button className="w-9 h-9 rounded-full hover:bg-attending-50 flex items-center justify-center transition-colors">
                <Phone className="w-4 h-4 text-attending-200" />
              </button>
              <button className="w-9 h-9 rounded-full hover:bg-attending-50 flex items-center justify-center transition-colors">
                <Video className="w-4 h-4 text-attending-200" />
              </button>
              <button className="w-9 h-9 rounded-full hover:bg-attending-50 flex items-center justify-center transition-colors">
                <MoreVertical className="w-4 h-4 text-attending-200" />
              </button>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          style={{ height: 'calc(100dvh - 130px)' }}
        >
          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                className="text-xs text-attending-primary font-medium px-3 py-1 rounded-full bg-attending-50 hover:bg-attending-100 transition-colors"
              >
                Load earlier messages
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-attending-primary animate-spin" />
            </div>
          )}

          {/* Date separator */}
          {!loading && (
            <div className="flex items-center justify-center">
              <span className="text-[10px] text-attending-200 font-medium bg-attending-50 px-3 py-1 rounded-full">
                Today
              </span>
            </div>
          )}

          {conversation.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>

        {/* Compose */}
        <div className="bg-white border-t border-light px-4 py-3 safe-area-bottom">
          <div className="max-w-lg mx-auto flex items-end gap-2">
            <button className="w-10 h-10 rounded-full bg-attending-50 flex items-center justify-center flex-shrink-0 hover:bg-attending-100 transition-colors">
              <Paperclip className="w-5 h-5 text-attending-200" />
            </button>

            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="w-full px-4 py-2.5 bg-attending-50 border-0 rounded-2xl text-sm text-attending-deep-navy placeholder:text-attending-200 focus:ring-2 focus:ring-attending-primary/30 resize-none max-h-24"
                style={{ minHeight: '40px' }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                inputText.trim()
                  ? 'bg-attending-primary text-white shadow-teal'
                  : 'bg-attending-50 text-attending-200'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </AppShell>
    </>
  );
}

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
