// ============================================================
// Updated Dashboard Page with Resizable/Reorderable Grid
// apps/provider-portal/pages/index.tsx
// ============================================================

import React, { useMemo } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { 
  ResponsiveDashboardGrid, 
  CardConfig 
} from '../components/dashboard/ResponsiveDashboardGrid';

// Card Components
import StatCards from '../components/dashboard/StatCards';
import PatientQueue from '../components/dashboard/PatientQueue';
import AIInsights from '../components/dashboard/AIInsights';
import QuickAccess from '../components/dashboard/QuickAccess';
import RecentAssessments from '../components/dashboard/RecentAssessments';
import PatientMessaging from '../components/PatientMessaging';

// Icons
import { 
  Activity, 
  Brain, 
  Users, 
  Zap, 
  MessageSquare, 
  BarChart3 
} from 'lucide-react';

// ============================================================
// Dashboard Card Configurations
// Grid is 12 columns (lg), each row is 80px high
// ============================================================

export default function Dashboard() {
  const dashboardCards = useMemo<CardConfig[]>(
    () => [
      {
        id: 'stats',
        title: 'Statistics Overview',
        icon: <BarChart3 className="w-4 h-4 text-indigo-500" />,
        component: <StatCards />,
        layouts: {
          lg: { x: 0, y: 0, w: 12, h: 2 },
          md: { x: 0, y: 0, w: 10, h: 2 },
          sm: { x: 0, y: 0, w: 6, h: 3 },
          xs: { x: 0, y: 0, w: 4, h: 4 },
        },
        minW: 6,
        minH: 2,
        maxH: 3,
        category: 'core',
      },
      {
        id: 'quick-access',
        title: 'Quick Access',
        icon: <Zap className="w-4 h-4 text-amber-500" />,
        component: <QuickAccess />,
        layouts: {
          lg: { x: 0, y: 2, w: 12, h: 2 },
          md: { x: 0, y: 2, w: 10, h: 2 },
          sm: { x: 0, y: 3, w: 6, h: 3 },
          xs: { x: 0, y: 4, w: 4, h: 4 },
        },
        minW: 6,
        minH: 2,
        maxH: 3,
        category: 'core',
      },
      {
        id: 'assessments',
        title: 'Recent COMPASS Assessments',
        icon: <Activity className="w-4 h-4 text-green-500" />,
        component: <RecentAssessments />,
        layouts: {
          lg: { x: 0, y: 4, w: 8, h: 5 },
          md: { x: 0, y: 4, w: 6, h: 5 },
          sm: { x: 0, y: 6, w: 6, h: 5 },
          xs: { x: 0, y: 8, w: 4, h: 5 },
        },
        minW: 4,
        minH: 3,
        category: 'clinical',
      },
      {
        id: 'ai-insights',
        title: 'BioMistral Clinical Insights',
        icon: <Brain className="w-4 h-4 text-purple-500" />,
        component: <AIInsights />,
        layouts: {
          lg: { x: 8, y: 4, w: 4, h: 5 },
          md: { x: 6, y: 4, w: 4, h: 5 },
          sm: { x: 0, y: 11, w: 6, h: 5 },
          xs: { x: 0, y: 13, w: 4, h: 5 },
        },
        minW: 3,
        minH: 3,
        category: 'analytics',
      },
      {
        id: 'patient-queue',
        title: 'Patient Queue',
        icon: <Users className="w-4 h-4 text-blue-500" />,
        component: <PatientQueue />,
        layouts: {
          lg: { x: 0, y: 9, w: 6, h: 6 },
          md: { x: 0, y: 9, w: 5, h: 6 },
          sm: { x: 0, y: 16, w: 6, h: 6 },
          xs: { x: 0, y: 18, w: 4, h: 6 },
        },
        minW: 4,
        minH: 4,
        category: 'clinical',
      },
      {
        id: 'messaging',
        title: 'Patient Messaging',
        icon: <MessageSquare className="w-4 h-4 text-cyan-500" />,
        component: <PatientMessaging />,
        layouts: {
          lg: { x: 6, y: 9, w: 6, h: 6 },
          md: { x: 5, y: 9, w: 5, h: 6 },
          sm: { x: 0, y: 22, w: 6, h: 6 },
          xs: { x: 0, y: 24, w: 4, h: 6 },
        },
        minW: 4,
        minH: 4,
        category: 'communication',
      },
    ],
    []
  );

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Provider Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Welcome back, Dr. Reed. COMPASS AI has prepared clinical insights for your review.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                  COMPASS Active
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2 animate-pulse" />
                  BioMistral-7B Ready
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Resizable Grid */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <ResponsiveDashboardGrid
            cards={dashboardCards}
            storageKey="provider-dashboard-v2"
            rowHeight={80}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
