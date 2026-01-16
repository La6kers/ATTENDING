import React, { useState } from 'react';
// import { useRouter } from 'next/router'; // Available for navigation
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCards from '../components/dashboard/StatCards';
import PatientQueue from '../components/dashboard/PatientQueue';
import AIInsights from '../components/dashboard/AIInsights';
import QuickAccess from '../components/dashboard/QuickAccess';
import RecentAssessments from '../components/dashboard/RecentAssessments';
import PatientMessaging from '../components/PatientMessaging';
import { Users, MessageSquare, Video } from 'lucide-react';

// Team member type for collaboration indicators
interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentActivity?: string;
}

// Sample team members
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

export default function Dashboard() {
  // const router = useRouter(); // Available for navigation
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  
  const onlineCount = teamMembers.filter(m => m.status === 'online' || m.status === 'busy').length;

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
                {/* Team Collaboration Indicator */}
                <button
                  onClick={() => setShowTeamPanel(!showTeamPanel)}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
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
                  BioMistral-7B Ready
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Team Collaboration Panel - Collapsible */}
          {showTeamPanel && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 animate-slide-down">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Care Team Activity
                </h3>
                <button className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Start Team Huddle
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {teamMembers.map(member => (
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
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                      {member.currentActivity && member.status !== 'offline' && (
                        <p className="text-xs text-purple-600 truncate">
                          📝 {member.currentActivity}
                        </p>
                      )}
                    </div>
                    <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
