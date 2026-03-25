// ============================================================
// ATTENDING AI — Notifications Page
// apps/patient-portal/pages/notifications.tsx
// ============================================================

import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Bell,
  Beaker,
  MessageSquare,
  Calendar,
  Pill,
  Stethoscope,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { useNotifications } from '../hooks/useNotifications';

interface Notification {
  id: string;
  type: 'lab' | 'message' | 'appointment' | 'prescription' | 'assessment';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationsPage() {
  const router = useRouter();

  // ── Live data from API ──
  const {
    notifications: apiNotifications,
    loading,
    markRead,
    markAllRead,
  } = useNotifications({ pollIntervalMs: 15000 });

  // Map API shape → component shape, with fallback
  const typeMap: Record<string, string> = {
    'lab-result': 'lab',
    message: 'message',
    appointment: 'appointment',
    prescription: 'prescription',
    assessment: 'assessment',
  };

  const notifications: Notification[] = (apiNotifications ?? []).map((n) => ({
    id: n.id,
    type: (typeMap[n.type] ?? 'assessment') as Notification['type'],
    title: n.title,
    body: n.body,
    timestamp: formatNotifTime(n.timestamp),
    read: n.read,
  }));

  if (notifications.length === 0 && !loading) {
    notifications.push(
      { id: '1', type: 'lab', title: 'Lab Results Available', body: 'Your CBC results from Quest Diagnostics are ready to view.', timestamp: '2 hours ago', read: false },
      { id: '2', type: 'assessment', title: 'Assessment Reviewed', body: 'Dr. Chen has reviewed your headache assessment and left notes.', timestamp: 'Yesterday', read: false },
      { id: '3', type: 'prescription', title: 'Prescription Renewed', body: 'Lisinopril 10mg — 90 day supply approved by Dr. Chen.', timestamp: '2 days ago', read: true },
      { id: '4', type: 'message', title: 'New Message from Dr. Chen', body: 'Regarding your recent lab results and A1C levels.', timestamp: '2 days ago', read: true },
      { id: '5', type: 'appointment', title: 'Appointment Reminder', body: 'Annual physical with Dr. Chen on March 3rd at 9:30 AM.', timestamp: '3 days ago', read: true },
    );
  }

  const hasUnread = notifications.some((n) => !n.read);

  const iconMap: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
    lab: { icon: Beaker, bg: 'bg-purple-50', color: 'text-purple-600' },
    message: { icon: MessageSquare, bg: 'bg-blue-50', color: 'text-blue-600' },
    appointment: { icon: Calendar, bg: 'bg-orange-50', color: 'text-orange-600' },
    prescription: { icon: Pill, bg: 'bg-green-50', color: 'text-green-600' },
    assessment: { icon: Stethoscope, bg: 'bg-attending-50', color: 'text-attending-primary' },
  };

  return (
    <>
      <Head>
        <title>Notifications | ATTENDING AI</title>
      </Head>

      <AppShell
        header={
          <header className="bg-white border-b border-light safe-area-top">
            <div className="max-w-lg mx-auto px-5 pt-5 pb-4 flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-full bg-attending-50 flex items-center justify-center hover:bg-attending-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-attending-deep-navy" />
              </button>
              <h1 className="text-xl font-bold text-attending-deep-navy">Notifications</h1>
              {hasUnread && (
                <button
                  onClick={() => markAllRead()}
                  className="text-xs text-attending-primary font-medium ml-auto"
                >
                  Mark all read
                </button>
              )}
            </div>
          </header>
        }
      >
        <div className="max-w-lg mx-auto">
          {notifications.map((notif) => {
            const { icon: Icon, bg, color } = iconMap[notif.type];
            return (
              <button
                key={notif.id}
                onClick={() => { if (!notif.read) markRead(notif.id); }}
                className={`w-full flex items-start gap-3 px-5 py-4 border-b border-attending-50 text-left transition-colors hover:bg-surface-hover ${
                  !notif.read ? 'bg-attending-50/50' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${!notif.read ? 'font-bold' : 'font-medium'} text-attending-deep-navy`}>
                      {notif.title}
                    </p>
                    {!notif.read && <span className="w-2 h-2 bg-attending-primary rounded-full flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-attending-200 mt-0.5 line-clamp-2">{notif.body}</p>
                  <p className="text-[10px] text-attending-200 mt-1">{notif.timestamp}</p>
                </div>
              </button>
            );
          })}
        </div>
      </AppShell>
    </>
  );
}

function formatNotifTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
