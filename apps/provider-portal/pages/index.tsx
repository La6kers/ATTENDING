import React from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCards from '../components/dashboard/StatCards';
import PatientQueue from '../components/dashboard/PatientQueue';
import AIInsights from '../components/dashboard/AIInsights';
import QuickAccess from '../components/dashboard/QuickAccess';
import RecentAssessments from '../components/dashboard/RecentAssessments';
import PatientMessaging from '../components/PatientMessaging';

export default function Dashboard() {
  const router = useRouter();

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Welcome back, Dr. Reed. COMPASS AI has prepared clinical insights for your review.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  COMPASS Active
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2 animate-pulse"></span>
                  BioMistral-7B Ready
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Overview - Now shows COMPASS assessment stats */}
          <StatCards />

          {/* Quick Access Cards */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
            <QuickAccess />
          </div>

          {/* Main Grid - Reorganized with COMPASS Assessments prominent */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent COMPASS Assessments - Primary focus */}
            <div className="lg:col-span-2">
              <RecentAssessments />
            </div>

            {/* AI Insights - Side column */}
            <div className="lg:col-span-1">
              <AIInsights />
            </div>
          </div>

          {/* Secondary Grid - Patient Queue and Messaging */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Patient Queue */}
            <div>
              <PatientQueue />
            </div>

            {/* Patient Messaging */}
            <div>
              <PatientMessaging />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
