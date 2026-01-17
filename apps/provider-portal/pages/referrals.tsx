// Referrals Page
// apps/provider-portal/pages/referrals.tsx

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  UserPlus, 
  ArrowLeft, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Filter
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { QuickActionsBar, SimpleCriticalAlert, useToast } from '@/components/shared';
import { ReferralOrderingPanel } from '@/components/referral-ordering';
import type { PatientContext as StorePatientContext } from '@/store/referralOrderingStore';
import type { PatientContext as PanelPatientContext } from '@/components/referral-ordering/types';

// Mock patient context - in production, this would come from the assessment or patient selection
const getMockPatientContext = (patientId?: string): StorePatientContext => ({
  id: patientId || 'pat-001',
  name: 'Maria Santos',
  age: 42,
  gender: 'Female',
  mrn: 'MRN-2024-001',
  chiefComplaint: 'Severe headache with visual disturbances and neck stiffness',
  primaryDiagnosis: 'Headache - Rule out secondary cause',
  allergies: ['Penicillin', 'Sulfa'],
  insurancePlan: 'Blue Cross',
  pcp: 'Dr. Robert Johnson',
  redFlags: ['Worst headache of life', 'Neck stiffness', 'Visual changes'],
});

export default function ReferralsPage() {
  const router = useRouter();
  const { patientId, encounterId } = router.query;
  
  const [patientContext, setPatientContext] = useState<StorePatientContext | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'pending' | 'history'>('new');
  const [pendingReferrals, setPendingReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const toast = useToast();

  // Normalize patient context for ReferralOrderingPanel (convert allergies to string[])
  const normalizedPatientContext: PanelPatientContext | null = patientContext ? {
    ...patientContext,
    allergies: patientContext.allergies?.map(a => 
      typeof a === 'string' ? a : a.allergen
    ) || [],
    insurancePlan: patientContext.insurancePlan || '',
    pcp: patientContext.pcp || '',
    redFlags: patientContext.redFlags || [],
  } : null;

  useEffect(() => {
    // Load patient context
    setPatientContext(getMockPatientContext(patientId as string));
    
    // Load pending referrals
    fetch('/api/referrals?status=PENDING')
      .then(res => res.json())
      .then(data => {
        setPendingReferrals(data.referrals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [patientId]);

  const handleOrderComplete = (referralIds: string[]) => {
    toast.success('Referrals submitted successfully!', `${referralIds.length} referral(s) sent`);
    // Refresh pending referrals
    fetch('/api/referrals?status=PENDING')
      .then(res => res.json())
      .then(data => {
        setPendingReferrals(data.referrals || []);
      });
  };

  if (!patientContext) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading patient information...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Specialty Referrals | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <UserPlus className="w-7 h-7" />
                  Specialty Referrals
                </h1>
                <p className="text-purple-200 mt-1">
                  Order and manage specialist referrals
                </p>
              </div>
            </div>

            {/* Patient Banner */}
            <div className="bg-white/10 rounded-xl p-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{patientContext.name}</p>
                  <p className="text-purple-200 text-sm">
                    {patientContext.age}yo {patientContext.gender} | MRN: {patientContext.mrn}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-purple-200">Insurance</p>
                  <p className="font-medium">{patientContext.insurancePlan}</p>
                </div>
              </div>
              {patientContext.redFlags.length > 0 && (
                <div className="mt-3 flex items-center gap-2 bg-red-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-200" />
                  <span className="text-sm text-red-100">
                    Red Flags: {patientContext.redFlags.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <QuickActionsBar
            currentPage="referrals"
            patientId={patientContext.id}
            encounterId={encounterId as string}
            showBackButton={false}
            showEmergencyButton={patientContext.redFlags && patientContext.redFlags.length > 0}
            onEmergencyProtocol={() => {
              toast.warning('Emergency Protocol Activated', 'Consider urgent neurology/neurosurgery referral');
            }}
          />

          {/* Critical Alert Banner - Shows when patient has red flags */}
          {patientContext.redFlags && patientContext.redFlags.length > 0 && !alertDismissed && (
            <SimpleCriticalAlert
              title="Critical Red Flags Detected"
              message={`Patient has ${patientContext.redFlags.length} red flag${patientContext.redFlags.length > 1 ? 's' : ''}: ${patientContext.redFlags.join(', ')}. Consider urgent specialty referral.`}
              actionLabel="View Emergency Protocol"
              onAction={() => {
                toast.info('Emergency Protocol', 'Consider urgent neurology or neurosurgery referral');
                setAlertDismissed(true);
              }}
              onDismiss={() => setAlertDismissed(true)}
              className="mt-4"
            />
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-1">
              {[
                { id: 'new', label: 'New Referral', icon: UserPlus },
                { id: 'pending', label: 'Pending', icon: Clock, count: pendingReferrals.length },
                { id: 'history', label: 'History', icon: CheckCircle },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          {activeTab === 'new' && normalizedPatientContext && (
            <ReferralOrderingPanel
              patientContext={normalizedPatientContext}
              encounterId={encounterId as string || 'enc-001'}
              onOrderComplete={handleOrderComplete}
            />
          )}

          {activeTab === 'pending' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Pending Referrals</h2>
                <button className="flex items-center gap-2 text-sm text-gray-600">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
              </div>
              
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : pendingReferrals.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                  <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No pending referrals</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReferrals.map(ref => (
                    <div key={ref.id} className="bg-white rounded-xl border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{ref.specialtyName}</p>
                          <p className="text-sm text-gray-500">{ref.clinicalQuestion}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          ref.urgency === 'STAT' ? 'bg-red-100 text-red-700' :
                          ref.urgency === 'URGENT' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {ref.urgency}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="text-center py-12 bg-white rounded-xl border">
              <CheckCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Referral history will appear here</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
