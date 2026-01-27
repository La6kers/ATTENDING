// =============================================================================
// ATTENDING AI - Command Center Dashboard
// apps/provider-portal/pages/command-center.tsx
//
// Unified view of all enterprise features
// =============================================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';

// Types
interface RiskAlert {
  id: string;
  patientName: string;
  type: 'sepsis' | 'deterioration' | 'readmission';
  riskLevel: 'moderate' | 'high' | 'critical';
  score: number;
  message: string;
  timestamp: Date;
}

interface CareGap {
  id: string;
  patientName: string;
  measure: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  action: string;
}

interface RPMAlert {
  id: string;
  patientName: string;
  deviceType: string;
  value: string;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
}

interface PriorAuth {
  id: string;
  patientName: string;
  item: string;
  status: 'pending' | 'submitted' | 'approved' | 'denied';
  payer: string;
  submittedAt?: Date;
}

interface MIPSScore {
  finalScore: number;
  qualityScore: number;
  piScore: number;
  iaScore: number;
  totalGaps: number;
}

export default function CommandCenter() {
  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'quality' | 'rpm' | 'pa'>('overview');
  const [mipsScore, setMipsScore] = useState<MIPSScore>({
    finalScore: 87,
    qualityScore: 91,
    piScore: 100,
    iaScore: 78,
    totalGaps: 23,
  });
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [careGaps, setCareGaps] = useState<CareGap[]>([]);
  const [rpmAlerts, setRpmAlerts] = useState<RPMAlert[]>([]);
  const [priorAuths, setPriorAuths] = useState<PriorAuth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // In production, these would be real API calls
      // Simulated data for demonstration
      setRiskAlerts([
        {
          id: '1',
          patientName: 'John Smith',
          type: 'sepsis',
          riskLevel: 'critical',
          score: 78,
          message: 'Elevated lactate, hypotension, tachycardia',
          timestamp: new Date(),
        },
        {
          id: '2',
          patientName: 'Mary Johnson',
          type: 'deterioration',
          riskLevel: 'high',
          score: 62,
          message: 'MEWS score 5, declining BP trend',
          timestamp: new Date(),
        },
        {
          id: '3',
          patientName: 'Robert Davis',
          type: 'readmission',
          riskLevel: 'high',
          score: 58,
          message: 'Multiple comorbidities, recent admission',
          timestamp: new Date(),
        },
      ]);

      setCareGaps([
        { id: '1', patientName: 'Alice Brown', measure: 'Diabetic Eye Exam', priority: 'high', action: 'Refer to ophthalmology' },
        { id: '2', patientName: 'Tom Wilson', measure: 'Colorectal Screening', priority: 'high', dueDate: '2024-03-15', action: 'Order FIT test' },
        { id: '3', patientName: 'Sarah Lee', measure: 'Breast Cancer Screening', priority: 'medium', action: 'Order mammogram' },
        { id: '4', patientName: 'James Miller', measure: 'A1c Control', priority: 'critical', action: 'A1c 10.2% - adjust therapy' },
      ]);

      setRpmAlerts([
        { id: '1', patientName: 'Helen White', deviceType: 'Blood Pressure', value: '178/105', severity: 'critical', message: 'Critical high BP', timestamp: new Date() },
        { id: '2', patientName: 'Frank Green', deviceType: 'Glucose', value: '312 mg/dL', severity: 'critical', message: 'Critical high glucose', timestamp: new Date() },
        { id: '3', patientName: 'Nancy Black', deviceType: 'Weight', value: '+5 lbs', severity: 'warning', message: 'Rapid weight gain', timestamp: new Date() },
      ]);

      setPriorAuths([
        { id: '1', patientName: 'David Clark', item: 'MRI Lumbar Spine', status: 'pending', payer: 'Blue Cross' },
        { id: '2', patientName: 'Lisa Adams', item: 'Humira', status: 'submitted', payer: 'Aetna', submittedAt: new Date() },
        { id: '3', patientName: 'Kevin Moore', item: 'CT Chest', status: 'approved', payer: 'United' },
        { id: '4', patientName: 'Sandra Hall', item: 'Ozempic', status: 'denied', payer: 'Cigna' },
      ]);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Risk level colors
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <>
      <Head>
        <title>Command Center | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
                <p className="text-sm text-gray-500">Real-time clinical intelligence dashboard</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">MIPS Score</div>
                  <div className="text-2xl font-bold text-blue-600">{mipsScore.finalScore}</div>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Start Ambient Session
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex gap-8">
              {(['overview', 'alerts', 'quality', 'rpm', 'pa'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'pa' ? 'Prior Auth' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Critical Alerts</div>
                  <div className="mt-2 flex items-baseline">
                    <div className="text-3xl font-bold text-red-600">
                      {riskAlerts.filter(a => a.riskLevel === 'critical').length}
                    </div>
                    <div className="ml-2 text-sm text-gray-500">patients</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Care Gaps</div>
                  <div className="mt-2 flex items-baseline">
                    <div className="text-3xl font-bold text-orange-600">{careGaps.length}</div>
                    <div className="ml-2 text-sm text-gray-500">to close</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">RPM Alerts</div>
                  <div className="mt-2 flex items-baseline">
                    <div className="text-3xl font-bold text-yellow-600">{rpmAlerts.length}</div>
                    <div className="ml-2 text-sm text-gray-500">pending</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Prior Auths</div>
                  <div className="mt-2 flex items-baseline">
                    <div className="text-3xl font-bold text-blue-600">
                      {priorAuths.filter(p => p.status === 'pending' || p.status === 'submitted').length}
                    </div>
                    <div className="ml-2 text-sm text-gray-500">in progress</div>
                  </div>
                </div>
              </div>

              {/* MIPS Score Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">MIPS Performance</h2>
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Quality (30%)</div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-green-500 rounded-full" style={{ width: `${mipsScore.qualityScore}%` }} />
                    </div>
                    <div className="mt-1 text-sm font-medium">{mipsScore.qualityScore}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Promoting Interop (25%)</div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-green-500 rounded-full" style={{ width: `${mipsScore.piScore}%` }} />
                    </div>
                    <div className="mt-1 text-sm font-medium">{mipsScore.piScore}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Improvement (15%)</div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-yellow-500 rounded-full" style={{ width: `${mipsScore.iaScore}%` }} />
                    </div>
                    <div className="mt-1 text-sm font-medium">{mipsScore.iaScore}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Overall Score</div>
                    <div className="text-3xl font-bold text-blue-600">{mipsScore.finalScore}</div>
                    <div className="text-sm text-green-600">+1.68% adjustment</div>
                  </div>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk Alerts */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Clinical Risk Alerts</h2>
                  </div>
                  <div className="divide-y">
                    {riskAlerts.map((alert) => (
                      <div key={alert.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{alert.patientName}</div>
                            <div className="text-sm text-gray-500">{alert.message}</div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(alert.riskLevel)}`}>
                            {alert.type.toUpperCase()} - {alert.score}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button className="text-sm text-blue-600 hover:underline">View Details</button>
                          <button className="text-sm text-blue-600 hover:underline">Take Action</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Care Gaps */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Priority Care Gaps</h2>
                  </div>
                  <div className="divide-y">
                    {careGaps.map((gap) => (
                      <div key={gap.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{gap.patientName}</div>
                            <div className="text-sm text-gray-500">{gap.measure}</div>
                            <div className="text-sm text-gray-400">{gap.action}</div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(gap.priority)}`}>
                            {gap.priority.toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button className="text-sm text-blue-600 hover:underline">Close Gap</button>
                          <button className="text-sm text-blue-600 hover:underline">Schedule Outreach</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RPM Alerts */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">RPM Alerts</h2>
                  </div>
                  <div className="divide-y">
                    {rpmAlerts.map((alert) => (
                      <div key={alert.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{alert.patientName}</div>
                            <div className="text-sm text-gray-500">{alert.deviceType}: {alert.value}</div>
                            <div className="text-sm text-gray-400">{alert.message}</div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            alert.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button className="text-sm text-blue-600 hover:underline">Contact Patient</button>
                          <button className="text-sm text-blue-600 hover:underline">Acknowledge</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prior Auths */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Prior Authorizations</h2>
                  </div>
                  <div className="divide-y">
                    {priorAuths.map((pa) => (
                      <div key={pa.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{pa.patientName}</div>
                            <div className="text-sm text-gray-500">{pa.item}</div>
                            <div className="text-sm text-gray-400">{pa.payer}</div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(pa.status)}`}>
                            {pa.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-2">
                          {pa.status === 'pending' && (
                            <button className="text-sm text-blue-600 hover:underline">Submit Now</button>
                          )}
                          {pa.status === 'denied' && (
                            <button className="text-sm text-blue-600 hover:underline">Generate Appeal</button>
                          )}
                          <button className="text-sm text-blue-600 hover:underline">View Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'overview' && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} View
              </h2>
              <p className="text-gray-500">
                Detailed {activeTab} management interface would be displayed here.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
