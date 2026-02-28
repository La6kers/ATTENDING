// ============================================================
// ATTENDING AI — Messages Tab
// apps/patient-portal/pages/messages/index.tsx
//
// Patient messaging with provider offices:
// - Conversation list
// - Unread indicators
// - Message previews
// ============================================================

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  MessageCircle,
  Search,
  PenSquare,
  Clock,
  CheckCheck,
  Paperclip,
  Loader2,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { useConversations } from '../../hooks/useMessages';

// ============================================================
// Types
// ============================================================

interface Conversation {
  id: string;
  provider: string;
  practice: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  unreadCount: number;
  hasAttachment: boolean;
  avatar?: string;
}

// ============================================================
// Conversation Row
// ============================================================

function ConversationRow({ convo }: { convo: Conversation }) {
  const initials = convo.provider
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  return (
    <Link
      href={`/messages/${convo.id}`}
      className="flex items-center gap-3 px-5 py-4 hover:bg-surface-hover transition-colors"
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-attending-gradient flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">{initials}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p
            className={`text-sm truncate ${
              convo.unread
                ? 'font-bold text-attending-deep-navy'
                : 'font-medium text-attending-deep-navy'
            }`}
          >
            {convo.provider}
          </p>
          <span
            className={`text-[10px] flex-shrink-0 ml-2 ${
              convo.unread ? 'text-attending-primary font-semibold' : 'text-attending-200'
            }`}
          >
            {convo.timestamp}
          </span>
        </div>
        <p className="text-xs text-attending-200 truncate">{convo.practice}</p>
        <div className="flex items-center gap-1 mt-1">
          {!convo.unread && <CheckCheck className="w-3 h-3 text-attending-primary flex-shrink-0" />}
          {convo.hasAttachment && <Paperclip className="w-3 h-3 text-attending-200 flex-shrink-0" />}
          <p
            className={`text-xs truncate ${
              convo.unread ? 'text-attending-deep-navy font-medium' : 'text-attending-200'
            }`}
          >
            {convo.lastMessage}
          </p>
        </div>
      </div>

      {/* Unread badge */}
      {convo.unread && convo.unreadCount > 0 && (
        <span className="w-5 h-5 bg-attending-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
          {convo.unreadCount}
        </span>
      )}
    </Link>
  );
}

// ============================================================
// Main Messages Page
// ============================================================

export default function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // ── Live data from API ──
  const { conversations: apiConversations, loading, totalUnread, search } = useConversations();

  // Map API conversations → component shape
  const conversations: Conversation[] = (apiConversations ?? []).map((c) => ({
    id: c.id,
    provider: c.provider.name,
    practice: c.provider.practice,
    lastMessage: c.lastMessage.content,
    timestamp: formatConvoTime(c.updatedAt),
    unread: c.unreadCount > 0,
    unreadCount: c.unreadCount,
    hasAttachment: c.lastMessage.hasAttachment,
  }));

  // Fallback demo data when API hasn't returned yet
  if (conversations.length === 0 && !loading) {
    conversations.push(
      { id: 'conv-1', provider: 'Dr. Sarah Chen', practice: 'Parker Family Medicine', lastMessage: 'Your lab results look good overall. Let\'s discuss the A1C at your next visit.', timestamp: '2h ago', unread: true, unreadCount: 1, hasAttachment: false },
      { id: 'conv-2', provider: 'Dr. Michael Ruiz', practice: 'Colorado Cardiology Associates', lastMessage: 'ECG report attached. Everything looks normal.', timestamp: 'Yesterday', unread: false, unreadCount: 0, hasAttachment: true },
      { id: 'conv-3', provider: 'Front Desk', practice: 'Parker Family Medicine', lastMessage: 'Reminder: Your annual physical is scheduled for March 3rd at 9:30 AM.', timestamp: 'Feb 25', unread: false, unreadCount: 0, hasAttachment: false },
      { id: 'conv-4', provider: 'Quest Diagnostics', practice: 'Lab Services', lastMessage: 'Your lab order is ready. Please fast 12 hours before your appointment.', timestamp: 'Feb 22', unread: false, unreadCount: 0, hasAttachment: true },
    );
  }

  const filtered = searchQuery
    ? conversations.filter(
        (c) =>
          c.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.practice.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const unreadTotal = totalUnread || conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <>
      <Head>
        <title>Messages | ATTENDING AI</title>
      </Head>

      <AppShell
        header={
          <header className="bg-white border-b border-light safe-area-top">
            <div className="max-w-lg mx-auto px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-attending-deep-navy">
                  Messages
                  {unreadTotal > 0 && (
                    <span className="ml-2 text-sm font-semibold text-attending-primary">
                      ({unreadTotal} new)
                    </span>
                  )}
                </h1>
                <button className="w-9 h-9 rounded-full bg-attending-50 flex items-center justify-center hover:bg-attending-100 transition-colors">
                  <PenSquare className="w-4 h-4 text-attending-primary" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-attending-200" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-attending-50 rounded-xl text-sm text-attending-deep-navy placeholder:text-attending-200 focus:outline-none focus:ring-2 focus:ring-attending-primary/30 border-0"
                />
              </div>
            </div>
          </header>
        }
      >
        <div className="max-w-lg mx-auto">
          {filtered.length > 0 ? (
            <div className="divide-y divide-attending-50">
              {filtered.map((convo) => (
                <ConversationRow key={convo.id} convo={convo} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-5">
              <div className="w-16 h-16 rounded-full bg-attending-50 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-attending-200" />
              </div>
              <p className="text-sm font-medium text-attending-deep-navy">
                {searchQuery ? 'No messages found' : 'No messages yet'}
              </p>
              <p className="text-xs text-attending-200 mt-1">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Messages from your providers will appear here'}
              </p>
            </div>
          )}
        </div>
      </AppShell>
    </>
  );
}

function formatConvoTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
