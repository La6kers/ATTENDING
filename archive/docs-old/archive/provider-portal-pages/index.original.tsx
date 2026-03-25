// ============================================================
// Enhanced Dashboard with Resizable/Reorderable Cards
// apps/provider-portal/pages/index.resizable.tsx
//
// Copy this to index.tsx to enable the resizable grid feature
// ============================================================

import React, { useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { DashboardGrid, DashboardCardConfig } from '../components/dashboard/DashboardGrid';
import StatCards from '../components/dashboard/StatCards';
import PatientQueue from '../components/dashboard/PatientQueue';
import AIInsights from '../components/dashboard/AIInsights';
import QuickAccess from '../components/dashboard/QuickAccess';
import RecentAssessments from '../components/dashboard/RecentAssessments';
import PatientMessaging from '../components/PatientMessaging';
import { Users, MessageSquare, Video, Settings } from 'lucide-react';

// Import CSS for react-grid-layout (add to _app.tsx for production)
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// ============================================================
// Team Types & Data
// ============================================================

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentActivity?: string;
}

const teamMembers: TeamMember[] = [
  { id: '1', name: 'Dr. Smith', initials: 'DS', role: 'Attending', status: 'online', currentActivity: 'Reviewing Sarah Johnson chart' },
  { id: '2', name: 'Nurse Williams', initials: 'NW', role: 'RN', status: 'online', currentActivity: 'Lab results' },
  { id: '3', name: 'Dr. Chen', initials: 'DC', role: 'Resident', status: 'away' },
  { id: '4', name: 'MA Rodriguez', initials: 'MR', role: 'MA', status: 'busy', currentActivity: 'Patient intake' },
];

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400',
};

// ============================================================
// Team Panel Component
// ============================================================

const TeamPanel: React.FC = () => (
  <div className="h-full">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm text-gray-500">{teamMembers.filter(m => m.status !== 'offline').length} active</span>
      <button className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors flex items-center gap-2">
        <Video className="w-4 h-4" />
        Team Huddle
      </button>
    </div>
    <div className="space-y-2">
      {teamMembers.map(member => (
        <div
          key={member.id}
          className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
              {member.initials}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColors[member.status]} rounded-full border-2 border-white`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm">{member.name}</p>
            <p className="text-xs text-gray-500">{member.role}</p>
          </div>
          <button className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors">
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  </div>
);

// ============================================================
// Dashboard Card Configurations
// ============================================================

const getDashboardCards = (): DashboardCardConfig[] => [
  {
    id: 'stats',
    title: 'Overview Statistics',
    component: <StatCards compact />,
    defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
    minH: 2,
    maxH: 3,
  },
  {
    id: 'quick-access',
    title: 'Quick Access',
    component: <QuickAccess />,
    defaultLayout: { x: 0, y: 2, w: 12, h: 2 },
    minH: 2,
    maxH: 3,
  },
  {
    id: 'assessments',
    title: 'Recent COMPASS Assessments',
    component: <RecentAssessments />,
    defaultLayout: { x: 0, y: 4, w: 8, h: 4 },
    minW: 4,
    minH: 3,
  },
  {
    id: 'ai-insights',
    title: 'AI Clinical Insights',
    component: <AIInsights />,
    defaultLayout: { x: 8, y: 4, w: 4, h: 4 },
    minW: 3,
    minH: 3,
  },
  {
    id: 'patient-queue',
    title: 'Patient Queue',
    component: <PatientQueue />,
    defaultLayout: { x: 0, y: 8, w: 6, h: 4 },
    minW: 4,
    minH: 3,
  },
  {
    id: 'messaging',
    title: 'Patient Messaging',
    component: <PatientMessaging />,
    defaultLayout: { x: 6, y: 8, w: 6, h: 4 },
    minW: 4,
    minH: 3,
  },
  {
    id: 'team',
    title: 'Care Team Activity',
    component: <TeamPanel />,
    defaultLayout: { x: 0, y: 12, w: 4, h: 3 },
    minW: 3,
    minH: 2,
  },
];

// ============================================================
// Main Dashboard Component
// ============================================================

export default function ResizableDashboard() {
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const onlineCount = teamMembers.filter(m => m.status === 'online' || m.status === 'busy').length;
  const cards = getDashboardCards();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-30">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Provider Dashboard</h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  Welcome back, Dr. Reed. Drag cards to rearrange, resize from corners.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Team Collaboration Indicator */}
                <button
                  onClick={() => setShowTeamPanel(!showTeamPanel)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                >
                  <div className="flex -space-x-2">
                    {teamMembers.slice(0, 3).map(member => (
                      <div
                        key={member.id}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-purple-100 ${
                          member.status === 'online' ? 'bg-green-500 text-white' :
                          member.status === 'busy' ? 'bg-red-500 text-white' :
                          'bg-gray-400 text-white'
                        }`}
                        title={`${member.name} - ${member.status}`}
                      >
                        {member.initials}
                      </div>
                    ))}
                  </div>
                  <span>{onlineCount} online</span>
                </button>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  COMPASS Active
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2 animate-pulse"></span>
                  BioMistral-7B
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Team Panel */}
        {showTeamPanel && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setShowTeamPanel(false)}
            />
            <div className="fixed top-20 right-6 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4 animate-slide-down">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Care Team
                </h3>
                <button
                  onClick={() => setShowTeamPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <TeamPanel />
            </div>
          </>
        )}

        {/* Main Content with Grid */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <DashboardGrid
            cards={cards}
            storageKey="provider-dashboard-layout"
            columns={12}
            rowHeight={80}
            margin={[16, 16]}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
