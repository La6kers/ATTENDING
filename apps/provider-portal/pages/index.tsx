// ============================================================
// ATTENDING AI - Provider Dashboard
// apps/provider-portal/pages/index.tsx
//
// Streamlined dashboard with purple gradient theme
// UPDATED: Matches login page gradient (#4c51bf to #6b46c1)
// ============================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Users,
  MessageSquare,
  Inbox,
  Brain,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronRight,
  Stethoscope,
  FlaskConical,
  ImageIcon,
  Pill,
  FileText,
  Bell,
  Settings,
  LogOut,
  Calendar,
  TrendingUp,
  Zap,
  Heart,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

// =============================================================================
// Theme - UPDATED to match login page gradient
// =============================================================================

const theme = {
  gradient: 'linear-gradient(135deg, #4c51bf 0%, #6b46c1 100%)',
};

// =============================================================================
// Types
// =============================================================================

interface QueueItem {
  id: string;
  patientName: string;
  age: number;
  chiefComplaint: string;
  urgencyLevel: 'standard' | 'moderate' | 'high' | 'emergency';
  waitTime: string;
  redFlags: number;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  color: string;
  href: string;
}

// =============================================================================
// Components
// =============================================================================

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend, color, href }) => (
  <Link 
    href={href}
    className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all hover:-translate-y-1 cursor-pointer group"
  >
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2 rounded-xl ${color} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className="text-purple-200 text-sm font-medium group-hover:text-white transition-colors">{label}</span>
    </div>
    <div className="flex items-end justify-between">
      <span className="text-3xl font-bold text-white">{value}</span>
      <div className="flex items-center gap-2">
        {trend && (
          <span className="text-green-300 text-sm flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </span>
        )}
        <ChevronRight className="w-5 h-5 text-purple-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  </Link>
);

const QuickActionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  badge?: number;
}> = ({ icon, title, description, href, badge }) => (
  <Link
    href={href}
    className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="p-3 rounded-xl bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
        {icon}
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
          {badge}
        </span>
      )}
    </div>
    <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
    <p className="text-gray-500 text-sm">{description}</p>
    <div className="flex items-center gap-1 mt-3 text-purple-600 text-sm font-medium">
      Open
      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </div>
  </Link>
);

const PatientQueueItem: React.FC<{ item: QueueItem }> = ({ item }) => {
  const urgencyColors = {
    standard: 'bg-green-100 text-green-700 border-green-200',
    moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    emergency: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <Link
      href={`/previsit/${item.id}`}
      className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className={`w-1.5 h-12 rounded-full ${
          item.urgencyLevel === 'emergency' ? 'bg-red-500' :
          item.urgencyLevel === 'high' ? 'bg-orange-500' :
          item.urgencyLevel === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'
        }`} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{item.patientName}</span>
            <span className="text-purple-200 text-sm">{item.age}y</span>
            {item.redFlags > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full text-xs">
                <AlertTriangle className="w-3 h-3" />
                {item.redFlags}
              </span>
            )}
          </div>
          <p className="text-purple-200 text-sm">{item.chiefComplaint}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${urgencyColors[item.urgencyLevel]}`}>
          {item.urgencyLevel.toUpperCase()}
        </span>
        <span className="text-purple-200 text-sm flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {item.waitTime}
        </span>
        <ChevronRight className="w-5 h-5 text-purple-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export default function ProviderDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    pendingAssessments: 8,
    patientsToday: 24,
    unreadMessages: 5,
    completedVisits: 16,
  });

  // Mock patient queue data
  const [patientQueue] = useState<QueueItem[]>([
    { id: 'p1', patientName: 'Margaret White', age: 72, chiefComplaint: 'Shortness of breath', urgencyLevel: 'high', waitTime: '12 min', redFlags: 4 },
    { id: 'p2', patientName: 'Dorothy Clark', age: 81, chiefComplaint: 'Fall at home', urgencyLevel: 'emergency', waitTime: '5 min', redFlags: 2 },
    { id: 'p3', patientName: 'Kevin Martinez', age: 28, chiefComplaint: 'Establish care', urgencyLevel: 'standard', waitTime: '18 min', redFlags: 0 },
    { id: 'p4', patientName: 'Robert Martinez', age: 66, chiefComplaint: 'Chest discomfort', urgencyLevel: 'high', waitTime: '8 min', redFlags: 1 },
  ]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradient }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const userName = session?.user?.name || 'Provider';

  return (
    <>
      <Head>
        <title>Provider Dashboard | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen" style={{ background: theme.gradient }}>
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">ATTENDING AI</h1>
                  <p className="text-purple-200 text-sm">Provider Portal</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                    3
                  </span>
                </button>
                <Link href="/settings" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <Settings className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                  <div className="text-right">
                    <p className="text-white font-medium text-sm">{userName}</p>
                    <p className="text-purple-200 text-xs">{session?.user?.role || 'Provider'}</p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                    className="p-2 rounded-lg bg-white/10 hover:bg-red-500/50 text-white transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {userName.split(' ')[0]}!</h2>
            <p className="text-purple-200">Here's your clinical overview for today. Click any card to view details.</p>
          </div>

          {/* Stats Grid - Now Clickable */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<Activity className="w-5 h-5 text-white" />}
              label="Pending Assessments"
              value={stats.pendingAssessments}
              color="bg-purple-500"
              href="/assessments"
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-white" />}
              label="Patients Today"
              value={stats.patientsToday}
              trend="+12%"
              color="bg-blue-500"
              href="/schedule"
            />
            <StatCard
              icon={<MessageSquare className="w-5 h-5 text-white" />}
              label="Unread Messages"
              value={stats.unreadMessages}
              color="bg-amber-500"
              href="/inbox?filter=messages"
            />
            <StatCard
              icon={<CheckCircle className="w-5 h-5 text-white" />}
              label="Completed Visits"
              value={stats.completedVisits}
              color="bg-green-500"
              href="/visits/completed"
            />
          </div>

          {/* Quick Actions & Patient Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-4">
                <QuickActionCard
                  icon={<Inbox className="w-6 h-6" />}
                  title="Provider Inbox"
                  description="View and manage all patient items"
                  href="/inbox"
                  badge={stats.pendingAssessments + stats.unreadMessages}
                />
                <QuickActionCard
                  icon={<FlaskConical className="w-6 h-6" />}
                  title="Lab Orders"
                  description="Order and review lab tests"
                  href="/labs"
                />
                <QuickActionCard
                  icon={<ImageIcon className="w-6 h-6" />}
                  title="Imaging Orders"
                  description="Order and view imaging studies"
                  href="/imaging"
                />
                <QuickActionCard
                  icon={<Pill className="w-6 h-6" />}
                  title="Medication Orders"
                  description="Prescribe and manage medications"
                  href="/medications"
                />
                <QuickActionCard
                  icon={<Zap className="w-6 h-6" />}
                  title="AI Interventions"
                  description="Clinical recommendations & care optimization"
                  href="/interventions"
                  badge={7}
                />
              </div>
            </div>

            {/* Patient Queue */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Patient Queue</h3>
                <Link
                  href="/inbox"
                  className="text-purple-200 hover:text-white text-sm flex items-center gap-1 transition-colors"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-3">
                {patientQueue.map((item) => (
                  <PatientQueueItem key={item.id} item={item} />
                ))}
              </div>

              {patientQueue.length === 0 && (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                  <Stethoscope className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                  <p className="text-purple-200">No patients in queue</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Interventions Summary */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Insights Banner */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">AI Clinical Insights</h3>
                  <p className="text-purple-200 text-sm">
                    2 patients have red flags that require immediate attention. 
                    3 assessments have AI-generated differential diagnoses ready for review.
                  </p>
                </div>
                <Link
                  href="/inbox"
                  className="px-5 py-2.5 bg-white text-purple-700 rounded-xl font-medium hover:bg-purple-50 transition-colors flex items-center gap-2"
                >
                  Review Now
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Interventions Summary */}
            <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-300/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Clinical Interventions</h3>
                </div>
                <Link
                  href="/interventions"
                  className="text-purple-200 hover:text-white text-sm flex items-center gap-1 transition-colors"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">5</p>
                  <p className="text-xs text-purple-200">Recommendations</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-300">2</p>
                  <p className="text-xs text-purple-200">Safety Alerts</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-300">$385</p>
                  <p className="text-xs text-purple-200">Savings/mo</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-pink-300">3</p>
                  <p className="text-xs text-purple-200">Trial Matches</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href="/interventions?module=recommendations"
                  className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm text-center transition-colors"
                >
                  <Brain className="w-4 h-4 inline mr-1" />
                  Recommendations
                </Link>
                <Link
                  href="/interventions?module=medications"
                  className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm text-center transition-colors"
                >
                  <Pill className="w-4 h-4 inline mr-1" />
                  Med Optimizer
                </Link>
                <Link
                  href="/interventions?module=trials"
                  className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm text-center transition-colors"
                >
                  <FlaskConical className="w-4 h-4 inline mr-1" />
                  Trials
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
