// ============================================================
// Enhanced Dashboard with Resizable/Reorderable Cards
// apps/provider-portal/pages/index.tsx
//
// FIXED: Header layout - ATTENDING AI and Provider Portal on same line
// FIXED: Patient queue compact view for 3-4 patients visible
// ============================================================

import React, { useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import type { DashboardCardConfig } from '../components/dashboard/DashboardGrid';
import { DashboardGrid } from '../components/dashboard/DashboardGrid';
import StatCards from '../components/dashboard/StatCards';
import PatientQueue from '../components/dashboard/PatientQueue';
import AIInsights from '../components/dashboard/AIInsights';
import QuickAccess from '../components/dashboard/QuickAccess';
import RecentAssessments from '../components/dashboard/RecentAssessments';
import PatientMessaging from '../components/PatientMessaging';
import { Users, MessageSquare, Video, X, Brain } from 'lucide-react';
import { Button, Card, Avatar, cn } from '@attending/ui-primitives';

// Import CSS for react-grid-layout
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
      <span className="text-sm text-gray-500">
        {teamMembers.filter(m => m.status !== 'offline').length} active
      </span>
      <Button variant="secondary" size="sm" leftIcon={<Video className="w-4 h-4" />}>
        Team Huddle
      </Button>
    </div>
    <div className="space-y-2">
      {teamMembers.map(member => (
        <div
          key={member.id}
          className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="relative">
            <Avatar name={member.name} size="sm" />
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                statusColors[member.status]
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm">{member.name}</p>
            <p className="text-xs text-gray-500">{member.role}</p>
          </div>
          <button className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  </div>
);

// ============================================================
// Status Badge Component
// ============================================================

interface StatusIndicatorProps {
  label: string;
  color: 'green' | 'indigo' | 'purple';
  pulse?: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ label, color, pulse = true }) => {
  const colorClasses = {
    green: 'bg-green-100 text-green-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    purple: 'bg-purple-100 text-purple-800',
  };
  const dotColors = {
    green: 'bg-green-400',
    indigo: 'bg-indigo-400',
    purple: 'bg-purple-400',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
      colorClasses[color]
    )}>
      <span className={cn(
        'w-2 h-2 rounded-full mr-2',
        dotColors[color],
        pulse && 'animate-pulse'
      )} />
      {label}
    </span>
  );
};

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

export default function ProviderDashboard() {
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const onlineCount = teamMembers.filter(m => m.status === 'online' || m.status === 'busy').length;
  const cards = getDashboardCards();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header - FIXED: ATTENDING AI and Provider Portal on same line, evenly distributed */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-30">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Main Header Row - Title Left, Status Right */}
            <div className="flex items-center justify-between">
              {/* Left: ATTENDING AI + Provider Portal on same line */}
              <div className="flex items-center gap-3">
                {/* Logo/Brand */}
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  {/* ATTENDING AI and Provider Portal - Same Line, Evenly Distributed */}
                  <div className="flex items-baseline gap-3">
                    <h1 className="text-xl font-bold text-gray-900">ATTENDING AI</h1>
                    <span className="text-gray-300">|</span>
                    <span className="text-lg font-semibold text-gray-600">Provider Portal</span>
                  </div>
                </div>
              </div>
              
              {/* Right: Status Indicators and Team */}
              <div className="flex items-center space-x-3">
                {/* Team Collaboration Indicator */}
                <button
                  onClick={() => setShowTeamPanel(!showTeamPanel)}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                    'bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors'
                  )}
                >
                  <div className="flex -space-x-2">
                    {teamMembers.slice(0, 3).map(member => (
                      <div
                        key={member.id}
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-purple-100 text-white',
                          statusColors[member.status]
                        )}
                        title={`${member.name} - ${member.status}`}
                      >
                        {member.initials}
                      </div>
                    ))}
                  </div>
                  <span>{onlineCount} online</span>
                </button>

                <StatusIndicator label="COMPASS Active" color="green" />
                <StatusIndicator label="BioMistral-7B" color="indigo" />
              </div>
            </div>
            
            {/* Subtitle Row */}
            <p className="mt-1 text-sm text-gray-500">
              Welcome back, Dr. Reed. Drag cards to rearrange, resize from corners.
            </p>
          </div>
        </div>

        {/* Floating Team Panel */}
        {showTeamPanel && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/10"
              onClick={() => setShowTeamPanel(false)}
            />
            <Card
              variant="elevated"
              className="fixed top-20 right-6 w-80 z-50 animate-slide-down"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Care Team
                </h3>
                <button
                  onClick={() => setShowTeamPanel(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <TeamPanel />
            </Card>
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
