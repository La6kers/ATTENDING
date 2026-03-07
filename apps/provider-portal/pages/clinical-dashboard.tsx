/**
 * ATTENDING AI - Clinical Dashboard
 * 
 * Main dashboard page combining all clinical components with real-time updates.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  NotificationProvider, 
  useEmergencyMonitor,
  useCriticalAlertPolling,
  useSystemVersion,
} from '../lib/api/backend';
import CriticalAlertsBanner from '../components/CriticalAlertsBanner';
import AssessmentQueue from '../components/clinical/AssessmentQueue';
import LabOrderPanel from '../components/clinical/LabOrderPanel';
import MedicationOrderPanel from '../components/clinical/MedicationOrderPanel';

// Mock auth token - replace with real auth
const MOCK_AUTH_TOKEN = 'mock-jwt-token';

export default function ClinicalDashboard() {
  return (
    <NotificationProvider accessToken={MOCK_AUTH_TOKEN}>
      <DashboardContent />
    </NotificationProvider>
  );
}

function DashboardContent() {
  const router = useRouter();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'labs' | 'meds' | 'imaging' | 'referrals'>('labs');

  // Emergency monitoring
  const { totalAlerts, hasAlerts } = useEmergencyMonitor();

  // System status
  const { data: systemInfo } = useSystemVersion();

  // Critical alerts polling (fallback if SignalR fails)
  const { criticalLabs, emergencyAssessments } = useCriticalAlertPolling(30000);

  // Update page title with alert count
  useEffect(() => {
    if (hasAlerts) {
      document.title = `(${totalAlerts}) ATTENDING AI - Clinical Dashboard`;
    } else {
      document.title = 'ATTENDING AI - Clinical Dashboard';
    }
  }, [totalAlerts, hasAlerts]);

  // Navigation handlers
  const handleViewEmergencies = () => {
    router.push('/assessments?filter=emergency');
  };

  const handleViewCriticalResults = () => {
    router.push('/labs?filter=critical');
  };

  const handleSelectAssessment = (assessmentId: string) => {
    router.push(`/assessments/${assessmentId}`);
  };

  const handleSelectPatient = (patientId: string, encounterId: string) => {
    setSelectedPatientId(patientId);
    setSelectedEncounterId(encounterId);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Critical Alerts Banner */}
      <CriticalAlertsBanner
        onViewEmergencies={handleViewEmergencies}
        onViewCriticalResults={handleViewCriticalResults}
      />

      {/* Main Content */}
      <div className={`${hasAlerts ? 'pt-20' : ''}`}>
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-teal-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">ATTENDING AI</h1>
                  <p className="text-sm text-gray-500">Clinical Dashboard</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Connection Status */}
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${systemInfo ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
                  <span className="text-gray-500">
                    {systemInfo ? `Backend v${systemInfo.version}` : 'Connecting...'}
                  </span>
                </div>

                {/* Alert Badge */}
                {hasAlerts && (
                  <div className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm font-medium animate-pulse">
                    {totalAlerts} Alert{totalAlerts > 1 ? 's' : ''}
                  </div>
                )}

                {/* User Menu */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-teal-700 font-medium text-sm">AM</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Dr. Morgan</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              icon="🚨"
              label="Emergency Queue"
              value={emergencyAssessments.length}
              color={emergencyAssessments.length > 0 ? 'red' : 'green'}
              onClick={handleViewEmergencies}
            />
            <StatCard
              icon="⚠️"
              label="Critical Results"
              value={criticalLabs.length}
              color={criticalLabs.length > 0 ? 'orange' : 'green'}
              onClick={handleViewCriticalResults}
            />
            <StatCard
              icon="📋"
              label="Pending Review"
              value={5}
              color="teal"
            />
            <StatCard
              icon="✅"
              label="Completed Today"
              value={12}
              color="blue"
            />
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Assessment Queue */}
            <div className="col-span-4">
              <AssessmentQueue onSelectAssessment={handleSelectAssessment} />
            </div>

            {/* Right Column - Clinical Orders */}
            <div className="col-span-8">
              {/* Patient Selector */}
              <div className="bg-white rounded-lg shadow mb-6 p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Active Patient
                </label>
                <select
                  value={selectedPatientId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectPatient(e.target.value, 'E' + e.target.value.substring(0, 7));
                    } else {
                      setSelectedPatientId(null);
                      setSelectedEncounterId(null);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">-- Select patient to manage orders --</option>
                  <option value="AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA">
                    John Smith (MRN-10001) - Diabetes/HTN Follow-up
                  </option>
                  <option value="BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB">
                    Maria Garcia (MRN-10002) - Asthma Exacerbation
                  </option>
                  <option value="CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC">
                    Robert Johnson (MRN-10003) - Cardiac Evaluation
                  </option>
                  <option value="DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD">
                    Lisa Chen (MRN-10004) - Thyroid Workup
                  </option>
                  <option value="EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE">
                    James Wilson (MRN-10005) - Annual Wellness
                  </option>
                  <option value="FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF">
                    🚨 Emily Brown (MRN-10006) - EMERGENCY: Chest Pain
                  </option>
                </select>
              </div>

              {selectedPatientId && selectedEncounterId ? (
                <>
                  {/* Order Type Tabs */}
                  <div className="bg-white rounded-t-lg shadow-sm border-b border-gray-200">
                    <div className="flex">
                      {(['labs', 'meds', 'imaging', 'referrals'] as const).map((panel) => (
                        <button
                          key={panel}
                          onClick={() => setActivePanel(panel)}
                          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            activePanel === panel
                              ? 'border-b-2 border-teal-600 text-teal-600 bg-teal-50'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {panel === 'labs' && '🧪 Lab Orders'}
                          {panel === 'meds' && '💊 Medications'}
                          {panel === 'imaging' && '📷 Imaging'}
                          {panel === 'referrals' && '👨‍⚕️ Referrals'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Panel Content */}
                  <div className="bg-white rounded-b-lg shadow">
                    {activePanel === 'labs' && (
                      <LabOrderPanel
                        patientId={selectedPatientId}
                        encounterId={selectedEncounterId}
                        onOrderCreated={(orderNumber) => {
                          console.log('Lab order created:', orderNumber);
                        }}
                      />
                    )}

                    {activePanel === 'meds' && (
                      <MedicationOrderPanel
                        patientId={selectedPatientId}
                        encounterId={selectedEncounterId}
                        onOrderCreated={(orderNumber) => {
                          console.log('Rx created:', orderNumber);
                        }}
                      />
                    )}

                    {activePanel === 'imaging' && (
                      <div className="p-12 text-center">
                        <div className="text-6xl mb-4">📷</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                          Imaging Orders
                        </h3>
                        <p className="text-gray-500 mb-4">
                          Component ready - connect to ImagingOrderPanel
                        </p>
                        <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                          + Order Imaging Study
                        </button>
                      </div>
                    )}

                    {activePanel === 'referrals' && (
                      <div className="p-12 text-center">
                        <div className="text-6xl mb-4">👨‍⚕️</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                          Specialist Referrals
                        </h3>
                        <p className="text-gray-500 mb-4">
                          Component ready - connect to ReferralPanel
                        </p>
                        <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                          + Create Referral
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* No Patient Selected State */
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Select a Patient
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Choose a patient from the dropdown above to view their chart and manage clinical orders including labs, medications, imaging, and referrals.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-8">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>ATTENDING AI © 2026 - Empowering Rural Healthcare</span>
              <div className="flex items-center gap-4">
                <span>API: {systemInfo?.apiVersion || 'v1'}</span>
                <span>Env: {systemInfo?.environment || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// =============================================================================
// Stat Card Component
// =============================================================================

interface StatCardProps {
  icon: string;
  label: string;
  value: number;
  color: 'teal' | 'red' | 'orange' | 'green' | 'blue';
  onClick?: () => void;
}

function StatCard({ icon, label, value, color, onClick }: StatCardProps) {
  const colorClasses = {
    teal: 'bg-teal-50 border-teal-200 hover:bg-teal-100',
    red: 'bg-red-50 border-red-200 hover:bg-red-100',
    orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    green: 'bg-green-50 border-green-200 hover:bg-green-100',
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  };

  const valueColors = {
    teal: 'text-teal-600',
    red: 'text-red-600',
    orange: 'text-orange-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
  };

  return (
    <div
      onClick={onClick}
      className={`
        rounded-lg border p-4 transition-all
        ${colorClasses[color]}
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className={`text-3xl font-bold ${valueColors[color]}`}>{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}
