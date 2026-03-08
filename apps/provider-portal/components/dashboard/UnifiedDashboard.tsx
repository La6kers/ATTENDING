// ============================================================
// ATTENDING AI - Unified Dashboard
// apps/provider-portal/components/dashboard/UnifiedDashboard.tsx
//
// The central command center that brings all features together
// ============================================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  // Icons
  Users,
  Calendar,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Brain,
  Heart,
  Target,
  BarChart3,
  FileText,
  Mic,
  ImageIcon,
  Calculator,
  Home,
  UsersRound,
  GitBranch,
  Bell,
  Star,
  Zap,
  ChevronRight,
  Play,
  MessageSquare,
  Phone,
  Video,
  RefreshCw,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface QuickStat {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
  href?: string;
}

interface UpcomingAppointment {
  id: string;
  patientName: string;
  time: string;
  type: 'new' | 'follow_up' | 'urgent' | 'telehealth';
  reason: string;
  duration: number;
  status: 'scheduled' | 'checked_in' | 'in_room';
}

interface TaskItem {
  id: string;
  type: 'result' | 'message' | 'order' | 'referral' | 'document';
  title: string;
  patient?: string;
  priority: 'urgent' | 'high' | 'normal';
  time?: string;
}

interface AIInsight {
  id: string;
  type: 'risk' | 'gap' | 'opportunity' | 'alert';
  title: string;
  description: string;
  action?: string;
  href?: string;
}

// ============================================================
// MOCK DATA
// ============================================================

const quickStats: QuickStat[] = [
  { id: 's1', label: 'Patients Today', value: 24, change: 3, trend: 'up', icon: <Users size={20} />, color: 'text-blue-600', href: '/patients' },
  { id: 's2', label: 'Appointments', value: 18, change: -2, trend: 'down', icon: <Calendar size={20} />, color: 'text-teal-600', href: '/scheduling' },
  { id: 's3', label: 'Pending Tasks', value: 12, trend: 'stable', icon: <FileText size={20} />, color: 'text-amber-600', href: '/tasks' },
  { id: 's4', label: 'Messages', value: 5, change: 2, trend: 'up', icon: <MessageSquare size={20} />, color: 'text-green-600', href: '/messages' },
];

const upcomingAppointments: UpcomingAppointment[] = [
  { id: 'a1', patientName: 'John Smith', time: '9:00 AM', type: 'follow_up', reason: 'Diabetes follow-up', duration: 20, status: 'checked_in' },
  { id: 'a2', patientName: 'Mary Johnson', time: '9:20 AM', type: 'urgent', reason: 'Chest pain evaluation', duration: 30, status: 'scheduled' },
  { id: 'a3', patientName: 'Robert Williams', time: '10:00 AM', type: 'new', reason: 'New patient evaluation', duration: 40, status: 'scheduled' },
  { id: 'a4', patientName: 'Patricia Davis', time: '11:00 AM', type: 'telehealth', reason: 'Medication review', duration: 20, status: 'scheduled' },
];

const pendingTasks: TaskItem[] = [
  { id: 't1', type: 'result', title: 'Critical Lab Result', patient: 'James Brown', priority: 'urgent', time: '5 min ago' },
  { id: 't2', type: 'message', title: 'Patient Message', patient: 'Lisa Chen', priority: 'high', time: '15 min ago' },
  { id: 't3', type: 'referral', title: 'Cardiology Referral Response', patient: 'David Kim', priority: 'normal', time: '1 hour ago' },
  { id: 't4', type: 'document', title: 'Prior Auth Request', patient: 'Emily Wang', priority: 'high', time: '2 hours ago' },
];

const aiInsights: AIInsight[] = [
  { id: 'i1', type: 'risk', title: '3 patients with elevated A1c', description: 'Consider intensifying diabetes management', action: 'View Patients', href: '/population-health' },
  { id: 'i2', type: 'gap', title: '12 patients due for colonoscopy', description: 'Preventive screening opportunity', action: 'Start Outreach', href: '/population-health' },
  { id: 'i3', type: 'alert', title: 'Drug interaction detected', description: 'John Smith: Warfarin + new NSAID order', action: 'Review', href: '/patient/john-smith' },
];

const featureCards = [
  { id: 'f1', title: 'AI Copilot', description: 'Real-time clinical suggestions', icon: Brain, color: 'from-teal-500 to-teal-600', href: '/copilot', isAI: true },
  { id: 'f2', title: 'Ambient Doc', description: 'Voice-powered documentation', icon: Mic, color: 'from-green-500 to-emerald-500', href: '/ambient', isAI: true },
  { id: 'f3', title: 'Image Analysis', description: 'AI-powered clinical imaging', icon: ImageIcon, color: 'from-blue-500 to-cyan-500', href: '/image-analysis', isAI: true },
  { id: 'f4', title: 'Decision Support', description: 'Calculators & drug reference', icon: Calculator, color: 'from-amber-500 to-orange-500', href: '/decision-support' },
  { id: 'f5', title: 'Care Coordination', description: 'Team collaboration hub', icon: Heart, color: 'from-rose-500 to-pink-500', href: '/care-coordination' },
  { id: 'f6', title: 'Population Health', description: 'Panel management & outreach', icon: UsersRound, color: 'from-teal-500 to-cyan-500', href: '/population-health' },
];

// ============================================================
// COMPONENTS
// ============================================================

const QuickStatCard: React.FC<{ stat: QuickStat }> = ({ stat }) => (
  <Link 
    href={stat.href || '#'}
    className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-teal-200 transition-all"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500">{stat.label}</p>
        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
      </div>
      <div className={`p-2 rounded-lg bg-slate-100 ${stat.color}`}>
        {stat.icon}
      </div>
    </div>
    {stat.change !== undefined && (
      <div className={`flex items-center gap-1 mt-2 text-sm ${
        stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-slate-500'
      }`}>
        {stat.trend === 'up' && <TrendingUp size={14} />}
        {stat.trend === 'down' && <TrendingDown size={14} />}
        {stat.change > 0 ? '+' : ''}{stat.change} from yesterday
      </div>
    )}
  </Link>
);

const AppointmentCard: React.FC<{ appointment: UpcomingAppointment }> = ({ appointment }) => {
  const typeConfig = {
    new: { color: 'bg-teal-100 text-teal-700', label: 'New' },
    follow_up: { color: 'bg-blue-100 text-blue-700', label: 'Follow-up' },
    urgent: { color: 'bg-red-100 text-red-700', label: 'Urgent' },
    telehealth: { color: 'bg-green-100 text-green-700', label: 'Telehealth' },
  };
  
  const statusConfig = {
    scheduled: { color: 'text-slate-500', label: 'Scheduled' },
    checked_in: { color: 'text-green-600', label: 'Checked In' },
    in_room: { color: 'text-teal-600', label: 'In Room' },
  };

  return (
    <div className={`p-3 rounded-lg border ${
      appointment.type === 'urgent' ? 'border-red-200 bg-red-50' : 
      appointment.status === 'checked_in' ? 'border-green-200 bg-green-50' :
      'border-slate-200 bg-white'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-slate-900">{appointment.patientName}</p>
          <p className="text-sm text-slate-500">{appointment.reason}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig[appointment.type].color}`}>
          {typeConfig[appointment.type].label}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-slate-500">
            <Clock size={14} />
            {appointment.time}
          </span>
          <span className={statusConfig[appointment.status].color}>
            {statusConfig[appointment.status].label}
          </span>
        </div>
        <div className="flex gap-1">
          {appointment.type === 'telehealth' ? (
            <button className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors" aria-label="Start telehealth visit">
              <Video size={14} />
            </button>
          ) : (
            <button className="p-1.5 bg-teal-100 text-teal-600 rounded hover:bg-teal-200 transition-colors" aria-label="Start visit">
              <Play size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const TaskCard: React.FC<{ task: TaskItem }> = ({ task }) => {
  const typeIcons = {
    result: <Activity size={16} className="text-red-500" />,
    message: <MessageSquare size={16} className="text-blue-500" />,
    order: <FileText size={16} className="text-amber-500" />,
    referral: <ArrowRight size={16} className="text-teal-500" />,
    document: <FileText size={16} className="text-green-500" />,
  };
  
  const priorityColors = {
    urgent: 'border-l-red-500 bg-red-50',
    high: 'border-l-amber-500 bg-amber-50',
    normal: 'border-l-slate-300 bg-white',
  };

  return (
    <div className={`p-3 rounded-lg border border-slate-200 border-l-4 ${priorityColors[task.priority]}`}>
      <div className="flex items-start gap-3">
        {typeIcons[task.type]}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 text-sm">{task.title}</p>
          {task.patient && <p className="text-xs text-slate-500">{task.patient}</p>}
        </div>
        {task.time && <span className="text-xs text-slate-400">{task.time}</span>}
      </div>
    </div>
  );
};

const AIInsightCard: React.FC<{ insight: AIInsight }> = ({ insight }) => {
  const typeConfig = {
    risk: { color: 'text-red-600 bg-red-100', icon: <AlertTriangle size={16} /> },
    gap: { color: 'text-amber-600 bg-amber-100', icon: <Target size={16} /> },
    opportunity: { color: 'text-green-600 bg-green-100', icon: <Zap size={16} /> },
    alert: { color: 'text-teal-600 bg-teal-100', icon: <Bell size={16} /> },
  };

  return (
    <div className="p-3 bg-gradient-to-r from-teal-50 to-teal-50/50 rounded-lg border border-teal-100">
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded ${typeConfig[insight.type].color}`}>
          {typeConfig[insight.type].icon}
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-900 text-sm">{insight.title}</p>
          <p className="text-xs text-slate-600 mt-0.5">{insight.description}</p>
          {insight.action && (
            <Link 
              href={insight.href || '#'}
              className="inline-flex items-center gap-1 mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              {insight.action}
              <ChevronRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

const FeatureCard: React.FC<{ 
  feature: typeof featureCards[0];
}> = ({ feature }) => {
  const Icon = feature.icon;
  
  return (
    <Link
      href={feature.href}
      className="group p-4 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-teal-200 transition-all"
    >
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
          {feature.title}
        </h3>
        {feature.isAI && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded">
            AI
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500">{feature.description}</p>
    </Link>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const UnifiedDashboard: React.FC = () => {
  const currentTime = new Date();
  const greeting = currentTime.getHours() < 12 ? 'Good morning' : 
                   currentTime.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{greeting}, Dr. Chen</h1>
            <p className="text-teal-100 mt-1">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-teal-200">Today's Schedule</p>
              <p className="text-2xl font-bold">18 patients</p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="text-right">
              <p className="text-sm text-teal-200">Next Patient</p>
              <p className="text-lg font-semibold">John Smith • 9:00 AM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        {quickStats.map(stat => (
          <QuickStatCard key={stat.id} stat={stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Today's Appointments */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Today's Appointments</h2>
            <Link href="/scheduling" className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {upcomingAppointments.map(appt => (
              <AppointmentCard key={appt.id} appointment={appt} />
            ))}
          </div>
        </div>

        {/* Tasks & AI Insights */}
        <div className="space-y-6">
          {/* AI Insights */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-teal-600" />
                <h2 className="font-semibold text-slate-900">AI Insights</h2>
              </div>
              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                {aiInsights.length} new
              </span>
            </div>
            <div className="p-4 space-y-3">
              {aiInsights.map(insight => (
                <AIInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>

          {/* Pending Tasks */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Pending Tasks</h2>
              <Link href="/tasks" className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
                View all <ChevronRight size={14} />
              </Link>
            </div>
            <div className="p-4 space-y-2">
              {pendingTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Features */}
      <div>
        <h2 className="font-semibold text-slate-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-6 gap-4">
          {featureCards.map(feature => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default UnifiedDashboard;
