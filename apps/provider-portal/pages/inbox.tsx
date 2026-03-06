import { useState, useEffect } from 'react';
import Head from 'next/head';

/**
 * Smart Inbox
 * 
 * Provider notification center with intelligent prioritization:
 * - Critical results requiring immediate attention
 * - Assessment reviews pending
 * - Lab results ready for review
 * - Referral responses
 * - System notifications
 */

type InboxCategory = 'all' | 'critical' | 'results' | 'assessments' | 'referrals' | 'system';
type Priority = 'critical' | 'high' | 'medium' | 'low';

interface InboxItem {
  id: string;
  category: InboxCategory;
  priority: Priority;
  title: string;
  summary: string;
  patientName?: string;
  patientMrn?: string;
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
  actionLabel?: string;
}

const mockInbox: InboxItem[] = [
  {
    id: '1', category: 'critical', priority: 'critical',
    title: 'CRITICAL: Troponin I Elevated',
    summary: 'Troponin I result: 2.4 ng/mL (ref: <0.04). Immediate cardiology consult recommended.',
    patientName: 'Robert Chen', patientMrn: 'MRN-34521',
    timestamp: '2 min ago', read: false, actionRequired: true, actionLabel: 'Review Result'
  },
  {
    id: '2', category: 'critical', priority: 'critical',
    title: 'Red Flag: Cauda Equina Syndrome',
    summary: 'Assessment flagged bilateral lower extremity weakness with urinary retention. Emergency MRI recommended.',
    patientName: 'Maria Santos', patientMrn: 'MRN-67890',
    timestamp: '8 min ago', read: false, actionRequired: true, actionLabel: 'Review Assessment'
  },
  {
    id: '3', category: 'results', priority: 'high',
    title: 'Abnormal CBC Results',
    summary: 'WBC: 18.2 K/uL (H), Platelets: 89 K/uL (L). Pattern suggests possible infection with thrombocytopenia.',
    patientName: 'James Walker', patientMrn: 'MRN-12345',
    timestamp: '23 min ago', read: false, actionRequired: true, actionLabel: 'Review Labs'
  },
  {
    id: '4', category: 'assessments', priority: 'high',
    title: 'New COMPASS Assessment Ready',
    summary: 'Chief complaint: Severe headache with visual changes, onset 4 hours ago. 2 red flags detected.',
    patientName: 'Lisa Park', patientMrn: 'MRN-45678',
    timestamp: '35 min ago', read: false, actionRequired: true, actionLabel: 'Review'
  },
  {
    id: '5', category: 'results', priority: 'medium',
    title: 'HbA1c Results Available',
    summary: 'HbA1c: 7.8% (previous: 8.2%). Improving but above target of 7.0%.',
    patientName: 'David Kim', patientMrn: 'MRN-78901',
    timestamp: '1 hr ago', read: false, actionRequired: false
  },
  {
    id: '6', category: 'referrals', priority: 'medium',
    title: 'Cardiology Referral Accepted',
    summary: 'Dr. Sarah Johnson accepted referral. Appointment scheduled for March 12, 2026.',
    patientName: 'Anna Thompson', patientMrn: 'MRN-23456',
    timestamp: '2 hrs ago', read: true, actionRequired: false
  },
  {
    id: '7', category: 'assessments', priority: 'medium',
    title: 'Assessment Review Pending',
    summary: 'Routine follow-up for chronic back pain management. No red flags.',
    patientName: 'Michael Brown', patientMrn: 'MRN-56789',
    timestamp: '3 hrs ago', read: true, actionRequired: true, actionLabel: 'Review'
  },
  {
    id: '8', category: 'system', priority: 'low',
    title: 'AI Model Updated',
    summary: 'Clinical recommendation model v2.3 deployed. Red flag sensitivity improved to 96.2%.',
    timestamp: '5 hrs ago', read: true, actionRequired: false
  },
  {
    id: '9', category: 'results', priority: 'low',
    title: 'Routine Labs Normal',
    summary: 'CMP and lipid panel within normal limits.',
    patientName: 'Jennifer Lee', patientMrn: 'MRN-89012',
    timestamp: '6 hrs ago', read: true, actionRequired: false
  },
  {
    id: '10', category: 'system', priority: 'low',
    title: 'Weekly Quality Report Available',
    summary: 'Quality measures report for week of Feb 24 is ready for review.',
    timestamp: '1 day ago', read: true, actionRequired: false
  },
];

const priorityConfig: Record<Priority, { color: string; bg: string; label: string }> = {
  critical: { color: '#991b1b', bg: '#fee2e2', label: 'CRITICAL' },
  high: { color: '#92400e', bg: '#fef3c7', label: 'HIGH' },
  medium: { color: '#1e40af', bg: '#dbeafe', label: 'MEDIUM' },
  low: { color: '#374151', bg: '#f3f4f6', label: 'LOW' },
};

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>(mockInbox);
  const [filter, setFilter] = useState<InboxCategory>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const response = await fetch('/api/inbox');
        if (response.ok) setItems(await response.json());
      } catch { /* Use mock data */ }
    };
    fetchInbox();
  }, []);

  const filteredItems = items.filter(item => {
    if (filter !== 'all' && item.category !== filter) return false;
    if (showUnreadOnly && item.read) return false;
    return true;
  });

  const unreadCount = items.filter(i => !i.read).length;
  const criticalCount = items.filter(i => i.priority === 'critical' && !i.read).length;

  const markAsRead = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, read: true } : item));
  };

  const categories: { key: InboxCategory; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: items.length },
    { key: 'critical', label: 'Critical', count: items.filter(i => i.category === 'critical').length },
    { key: 'results', label: 'Results', count: items.filter(i => i.category === 'results').length },
    { key: 'assessments', label: 'Assessments', count: items.filter(i => i.category === 'assessments').length },
    { key: 'referrals', label: 'Referrals', count: items.filter(i => i.category === 'referrals').length },
    { key: 'system', label: 'System', count: items.filter(i => i.category === 'system').length },
  ];

  return (
    <>
      <Head>
        <title>Inbox ({unreadCount}) | ATTENDING AI</title>
      </Head>
      
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
              Smart Inbox
              {unreadCount > 0 && (
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', marginLeft: '8px' }}>
                  {unreadCount} unread
                </span>
              )}
            </h1>
            {criticalCount > 0 && (
              <p style={{ color: '#ef4444', fontWeight: 600, marginTop: '4px', fontSize: '14px' }}>
                {criticalCount} critical item{criticalCount > 1 ? 's' : ''} requiring immediate attention
              </p>
            )}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={e => setShowUnreadOnly(e.target.checked)}
            />
            Unread only
          </label>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: filter === cat.key ? '#3b82f6' : 'transparent',
                color: filter === cat.key ? 'white' : '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: filter === cat.key ? 600 : 400,
              }}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* Inbox Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => markAsRead(item.id)}
              style={{
                background: item.read ? 'white' : '#fafbff',
                borderRadius: '8px',
                padding: '16px',
                border: `1px solid ${item.priority === 'critical' && !item.read ? '#fca5a5' : '#e5e7eb'}`,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
                borderLeft: item.read ? undefined : `4px solid ${priorityConfig[item.priority].color}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: priorityConfig[item.priority].bg,
                      color: priorityConfig[item.priority].color,
                    }}>
                      {priorityConfig[item.priority].label}
                    </span>
                    <span style={{ fontWeight: item.read ? 400 : 600, fontSize: '15px' }}>
                      {item.title}
                    </span>
                    {!item.read && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                    )}
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0' }}>{item.summary}</p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                    {item.patientName && <span>{item.patientName} ({item.patientMrn})</span>}
                    <span>{item.timestamp}</span>
                  </div>
                </div>
                {item.actionRequired && item.actionLabel && (
                  <button style={{
                    padding: '6px 14px',
                    background: item.priority === 'critical' ? '#ef4444' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    marginLeft: '16px',
                  }}>
                    {item.actionLabel}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
            <p style={{ fontSize: '16px' }}>No messages in this category</p>
          </div>
        )}
      </div>
    </>
  );
}
