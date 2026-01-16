// NotificationCenter.tsx
// Real-time notification center panel with team collaboration indicators
// apps/provider-portal/components/shared/NotificationCenter.tsx

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  X,
  Check,
  AlertTriangle,
  Clock,
  MessageSquare,
  FileText,
  TestTube,
  FileImage,
  Pill,
  Users,
  Activity,
  Volume2,
  VolumeX,
  Settings,
  CheckCheck,
} from 'lucide-react';

// Types
export interface Notification {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  category: 'assessment' | 'lab' | 'imaging' | 'medication' | 'message' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  patient?: {
    id: string;
    name: string;
    mrn: string;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentActivity?: string;
  avatar?: string;
}

export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: Notification[];
  teamMembers?: TeamMember[];
  onNotificationRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: (enabled: boolean) => void;
  className?: string;
}

// Default mock data
const defaultNotifications: Notification[] = [
  {
    id: '1',
    type: 'urgent',
    category: 'lab',
    title: 'Critical Lab Result',
    message: 'Troponin elevated - requires immediate review',
    timestamp: new Date(Date.now() - 2 * 60000),
    read: false,
    actionUrl: '/labs?critical=true',
    patient: { id: 'p1', name: 'John Doe', mrn: '123456' },
  },
  {
    id: '2',
    type: 'warning',
    category: 'assessment',
    title: 'New COMPASS Assessment',
    message: 'High urgency - Severe headache with visual changes',
    timestamp: new Date(Date.now() - 15 * 60000),
    read: false,
    actionUrl: '/assessments',
    patient: { id: 'p2', name: 'Sarah Johnson', mrn: '789012' },
  },
  {
    id: '3',
    type: 'info',
    category: 'imaging',
    title: 'Imaging Results Ready',
    message: 'CT Head results available for review',
    timestamp: new Date(Date.now() - 60 * 60000),
    read: true,
    actionUrl: '/imaging',
    patient: { id: 'p3', name: 'Mike Wilson', mrn: '345678' },
  },
  {
    id: '4',
    type: 'success',
    category: 'message',
    title: 'Referral Accepted',
    message: 'Neurology accepted your urgent referral',
    timestamp: new Date(Date.now() - 120 * 60000),
    read: true,
    actionUrl: '/referrals',
  },
];

const defaultTeamMembers: TeamMember[] = [
  { id: '1', name: 'Dr. Smith', initials: 'DS', role: 'Attending', status: 'online', currentActivity: 'Reviewing Sarah Johnson chart' },
  { id: '2', name: 'Nurse Williams', initials: 'NW', role: 'RN', status: 'online', currentActivity: 'Lab results' },
  { id: '3', name: 'Dr. Chen', initials: 'DC', role: 'Resident', status: 'away' },
  { id: '4', name: 'MA Rodriguez', initials: 'MR', role: 'MA', status: 'busy', currentActivity: 'Patient intake' },
];

// Category icons
const categoryIcons: Record<string, React.ElementType> = {
  assessment: Activity,
  lab: TestTube,
  imaging: FileImage,
  medication: Pill,
  message: MessageSquare,
  system: Settings,
};

// Type styles
const typeStyles: Record<string, string> = {
  urgent: 'border-l-red-500 bg-red-50',
  warning: 'border-l-amber-500 bg-amber-50',
  info: 'border-l-blue-500 bg-blue-50',
  success: 'border-l-green-500 bg-green-50',
};

// Status colors
const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400',
};

// Format relative time
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications = defaultNotifications,
  teamMembers = defaultTeamMembers,
  onNotificationRead,
  onMarkAllRead,
  onClearAll,
  soundEnabled = true,
  onToggleSound,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'team'>('notifications');
  const [localNotifications, setLocalNotifications] = useState(notifications);

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const unreadCount = localNotifications.filter(n => !n.read).length;
  const onlineTeamCount = teamMembers.filter(m => m.status === 'online' || m.status === 'busy').length;

  const handleMarkRead = (id: string) => {
    setLocalNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    onNotificationRead?.(id);
  };

  const handleMarkAllRead = () => {
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onMarkAllRead?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/20 backdrop-blur-sm animate-fade-in">
      <div
        className={`mt-16 mr-4 w-96 max-h-[calc(100vh-5rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-down ${className}`}
        role="dialog"
        aria-label="Notification Center"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Notification Center</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleSound?.(!soundEnabled)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title={soundEnabled ? 'Mute notifications' : 'Enable sound'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'notifications' ? 'bg-white text-purple-700' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <Bell className="w-4 h-4" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'team' ? 'bg-white text-purple-700' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <Users className="w-4 h-4" />
              Team
              <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {onlineTeamCount}
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[calc(100vh-14rem)] overflow-y-auto">
          {activeTab === 'notifications' ? (
            <>
              {/* Actions bar */}
              {localNotifications.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b text-sm">
                  <button
                    onClick={handleMarkAllRead}
                    className="text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                    disabled={unreadCount === 0}
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark all read
                  </button>
                  <button
                    onClick={onClearAll}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Notifications list */}
              {localNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {localNotifications.map((notification) => {
                    const Icon = categoryIcons[notification.category] || Bell;
                    return (
                      <Link
                        key={notification.id}
                        href={notification.actionUrl || '#'}
                        onClick={() => {
                          handleMarkRead(notification.id);
                          onClose();
                        }}
                        className={`block p-4 border-l-4 hover:bg-gray-50 transition-colors ${
                          typeStyles[notification.type]
                        } ${!notification.read ? '' : 'opacity-70'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            notification.type === 'urgent' ? 'bg-red-100' :
                            notification.type === 'warning' ? 'bg-amber-100' :
                            notification.type === 'success' ? 'bg-green-100' : 'bg-blue-100'
                          }`}>
                            <Icon className={`w-4 h-4 ${
                              notification.type === 'urgent' ? 'text-red-600' :
                              notification.type === 'warning' ? 'text-amber-600' :
                              notification.type === 'success' ? 'text-green-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium text-gray-900 ${!notification.read ? 'font-semibold' : ''}`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-1.5" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            {notification.patient && (
                              <p className="text-xs text-gray-500 mt-1">
                                Patient: {notification.patient.name}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatRelativeTime(notification.timestamp)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Team Tab */
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                Care Team ({teamMembers.length})
              </p>
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {member.initials}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${statusColors[member.status]} rounded-full border-2 border-white`}
                      title={member.status}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                    {member.currentActivity && member.status !== 'offline' && (
                      <p className="text-xs text-purple-600 truncate mt-0.5">
                        📝 {member.currentActivity}
                      </p>
                    )}
                  </div>
                  <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Team Huddle Button */}
              <button className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                Start Team Huddle
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50">
          <Link
            href="/notifications"
            className="block text-center text-sm font-medium text-purple-600 hover:text-purple-800"
            onClick={onClose}
          >
            View all notifications →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
