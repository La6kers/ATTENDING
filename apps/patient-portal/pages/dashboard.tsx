// =============================================================================
// ATTENDING AI - Patient Dashboard
// apps/patient-portal/pages/dashboard.tsx
//
// Main patient home page showing:
// - Recent assessments
// - Quick actions (start new assessment)
// - Health summary preview
// - Notifications
// =============================================================================

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  ChevronRight,
  Activity,
  Calendar,
  Bell,
  User,
  UserPlus,
  MessageSquare,
} from 'lucide-react';

// Types
import type { UrgencyLevel } from '../../shared/types/chat.types';

// ============================================================================
// Types
// ============================================================================

interface Assessment {
  id: string;
  chiefComplaint: string;
  status: 'in_progress' | 'pending' | 'in_review' | 'completed';
  urgencyLevel: UrgencyLevel;
  submittedAt: string;
  reviewedAt?: string;
  providerName?: string;
}

interface Notification {
  id: string;
  type: 'assessment_update' | 'message' | 'reminder';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// ============================================================================
// Status Badge Component
// ============================================================================

const StatusBadge: React.FC<{ status: Assessment['status'] }> = ({ status }) => {
  const config = {
    in_progress: { label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
    pending: { label: 'Pending Review', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    in_review: { label: 'Under Review', bg: 'bg-purple-100', text: 'text-purple-700', icon: Activity },
    completed: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  };

  const { label, bg, text, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

// ============================================================================
// Urgency Badge Component
// ============================================================================

const UrgencyBadge: React.FC<{ level: UrgencyLevel }> = ({ level }) => {
  const config: Record<UrgencyLevel, { label: string; bg: string; text: string }> = {
    standard: { label: 'Standard', bg: 'bg-gray-100', text: 'text-gray-600' },
    moderate: { label: 'Moderate', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    high: { label: 'High', bg: 'bg-orange-100', text: 'text-orange-700' },
    emergency: { label: 'Emergency', bg: 'bg-red-100', text: 'text-red-700' },
  };

  const { label, bg, text } = config[level];

  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>{label}</span>;
};

// ============================================================================
// Assessment Card Component
// ============================================================================

const AssessmentCard: React.FC<{ assessment: Assessment }> = ({ assessment }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Link href={`/results/${assessment.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 line-clamp-1">{assessment.chiefComplaint}</h3>
            <p className="text-sm text-gray-500 mt-1">{formatDate(assessment.submittedAt)}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={assessment.status} />
          <UrgencyBadge level={assessment.urgencyLevel} />
        </div>

        {assessment.providerName && assessment.status === 'completed' && (
          <p className="text-xs text-gray-500 mt-2">Reviewed by Dr. {assessment.providerName}</p>
        )}
      </div>
    </Link>
  );
};

// ============================================================================
// Notification Item Component
// ============================================================================

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className={`p-3 rounded-lg ${notification.read ? 'bg-gray-50' : 'bg-purple-50 border-l-4 border-purple-500'}`}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className={`text-sm font-medium ${notification.read ? 'text-gray-700' : 'text-purple-900'}`}>
            {notification.title}
          </h4>
          <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
        </div>
        <span className="text-xs text-gray-400">{formatTime(notification.timestamp)}</span>
      </div>
    </div>
  );
};

// ============================================================================
// Quick Stats Component
// ============================================================================

const QuickStats: React.FC<{ assessments: Assessment[] }> = ({ assessments }) => {
  const pending = assessments.filter((a) => a.status === 'pending' || a.status === 'in_review').length;
  const completed = assessments.filter((a) => a.status === 'completed').length;
  const thisMonth = assessments.filter((a) => {
    const date = new Date(a.submittedAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const stats = [
    { label: 'Pending', value: pending, icon: Clock, color: 'text-yellow-600' },
    { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-green-600' },
    { label: 'This Month', value: thisMonth, icon: Calendar, color: 'text-purple-600' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          <p className="text-xs text-gray-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function PatientDashboard() {
  const _router = useRouter(); // Reserved for navigation
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState('');

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assessments
        const assessRes = await fetch('/api/patient/assessments');
        if (assessRes.ok) {
          const data = await assessRes.json();
          setAssessments(data.assessments || []);
        }

        // Fetch notifications
        const notifRes = await fetch('/api/patient/notifications');
        if (notifRes.ok) {
          const data = await notifRes.json();
          setNotifications(data.notifications || []);
        }

        // Get patient name from session/local storage
        const storedName = localStorage.getItem('compass-patient-name');
        if (storedName) setPatientName(storedName);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Mock data for demonstration
  useEffect(() => {
    if (loading) return;
    if (assessments.length === 0) {
      setAssessments([
        {
          id: '1',
          chiefComplaint: 'Persistent headache for 3 days',
          status: 'completed',
          urgencyLevel: 'moderate',
          submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          reviewedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
          providerName: 'Smith',
        },
        {
          id: '2',
          chiefComplaint: 'Follow-up for blood pressure',
          status: 'pending',
          urgencyLevel: 'standard',
          submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
      ]);

      setNotifications([
        {
          id: '1',
          type: 'assessment_update',
          title: 'Assessment Reviewed',
          message: 'Dr. Smith has reviewed your headache assessment',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: false,
        },
        {
          id: '2',
          type: 'reminder',
          title: 'Follow-up Reminder',
          message: 'Schedule your 30-day follow-up',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          read: true,
        },
      ]);
    }
  }, [loading, assessments.length]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const recentAssessments = assessments.slice(0, 3);

  return (
    <>
      <Head>
        <title>Dashboard | COMPASS - ATTENDING AI</title>
        <meta name="description" content="Your patient dashboard" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="max-w-lg mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm">Welcome back,</p>
                <h1 className="text-xl font-semibold">{patientName || 'Patient'}</h1>
              </div>
              <div className="flex items-center gap-3">
                <button className="relative p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <Link href="/profile">
                  <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                    <User className="w-5 h-5" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Start New Assessment CTA */}
          <Link href="/chat">
            <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-4 flex items-center justify-between shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Start New Assessment</p>
                  <p className="text-sm text-purple-200">Begin a COMPASS health check</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>
          </Link>

          {/* Quick Stats */}
          <QuickStats assessments={assessments} />

          {/* Recent Assessments */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Recent Assessments</h2>
              <Link href="/health-summary" className="text-sm text-purple-600 hover:text-purple-700">
                View All
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : recentAssessments.length > 0 ? (
              <div className="space-y-3">
                {recentAssessments.map((assessment) => (
                  <AssessmentCard key={assessment.id} assessment={assessment} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No assessments yet</p>
                <p className="text-sm text-gray-400 mt-1">Start your first COMPASS assessment</p>
              </div>
            )}
          </section>

          {/* Notifications */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{unreadCount} new</span>
              )}
            </div>

            {notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.slice(0, 3).map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications</p>
              </div>
            )}
          </section>

          {/* Quick Links */}
          <section className="grid grid-cols-2 gap-3">
            <Link href="/health-summary">
              <button className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-purple-300 hover:shadow-md transition-all">
                <Activity className="w-6 h-6 text-purple-600 mb-2" />
                <p className="font-medium text-gray-900">Health Summary</p>
                <p className="text-xs text-gray-500">View your health history</p>
              </button>
            </Link>
            <Link href="/referrals">
              <button className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-purple-300 hover:shadow-md transition-all">
                <UserPlus className="w-6 h-6 text-purple-600 mb-2" />
                <p className="font-medium text-gray-900">My Referrals</p>
                <p className="text-xs text-gray-500">Track specialist visits</p>
              </button>
            </Link>
            <Link href="/profile">
              <button className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-purple-300 hover:shadow-md transition-all">
                <User className="w-6 h-6 text-purple-600 mb-2" />
                <p className="font-medium text-gray-900">Profile</p>
                <p className="text-xs text-gray-500">Manage your info</p>
              </button>
            </Link>
            <Link href="/chat">
              <button className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-purple-300 hover:shadow-md transition-all">
                <MessageSquare className="w-6 h-6 text-purple-600 mb-2" />
                <p className="font-medium text-gray-900">New Assessment</p>
                <p className="text-xs text-gray-500">Start a health check</p>
              </button>
            </Link>
          </section>
        </main>
      </div>
    </>
  );
}
