// ============================================================
// Referral Orders Page - Streamlined with consistent full-page gradient
// pages/referrals.tsx
// ============================================================

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  UserPlus, ArrowLeft, Home, CheckCircle, AlertTriangle, Clock, Filter
} from 'lucide-react';
import { ProviderShell } from '@/components/layout/ProviderShell';
import { SimpleCriticalAlert, useToast } from '@/components/shared';
import { ReferralOrderingPanel } from '@/components/referral-ordering';
import type { PatientContext as StorePatientContext } from '@/store/referralOrderingStore';
import type { PatientContext as PanelPatientContext } from '@/components/referral-ordering/types';

const theme = {
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

const getMockPatientContext = (patientId?: string): StorePatientContext => ({
  id: patientId || 'pat-001',
  name: 'Maria Santos',
  age: 42,
  gender: 'Female',
  mrn: 'MRN-2024-001',
  chiefComplaint: 'Severe headache with visual disturbances and neck stiffness',
  primaryDiagnosis: 'Headache - Rule out secondary cause',
  allergies: ['Penicillin', 'Sulfa'],
  currentMedications: ['Lisinopril 10mg daily', 'Metformin 500mg BID'],
  medicalHistory: ['Hypertension', 'Type 2 Diabetes'],
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

  const normalizedPatientContext: PanelPatientContext | null = patientContext ? {
    ...patientContext,
    allergies: patientContext.allergies?.map(a => typeof a === 'string' ? a : a.allergen) || [],
    insurancePlan: patientContext.insurancePlan || '',
    pcp: patientContext.pcp || '',
    redFlags: patientContext.redFlags || [],
  } : null;

  useEffect(() => {
    setPatientContext(getMockPatientContext(patientId as string));
    
    fetch('/api/referrals?status=PENDING')
      .then(res => res.json())
      .then(data => {
        setPendingReferrals(data.referrals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [patientId]);

  const handleOrderComplete = (referralIds: string[]) => {
    toast.success('Referrals submitted!', `${referralIds.length} referral(s) sent`);
    fetch('/api/referrals?status=PENDING')
      .then(res => res.json())
      .then(data => setPendingReferrals(data.referrals || []));
  };

  if (!patientContext) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradient }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Referral Orders | ATTENDING AI</title>
      </Head>

      <ProviderShell contextBadge="Referral Orders" currentPage="referrals">
        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Patient Banner */}
          <div className="bg-white rounded-2xl p-5 shadow-lg mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">
                  {patientContext.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{patientContext.name}</h3>
                  <p className="text-sm text-gray-500">{patientContext.age}yo {patientContext.gender} • {patientContext.mrn}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Insurance</p>
                <p className="font-medium text-gray-900">{patientContext.insurancePlan}</p>
              </div>
            </div>
            {patientContext.chiefComplaint && (
              <p className="mt-3 text-sm text-gray-600">{patientContext.chiefComplaint}</p>
            )}
          </div>

          {/* Critical Alert - Click to dismiss */}
          {patientContext.redFlags && patientContext.redFlags.length > 0 && !alertDismissed && (
            <SimpleCriticalAlert
              title="Critical Red Flags Detected"
              message={`${patientContext.redFlags.length} red flag(s): ${patientContext.redFlags.join(', ')}. Consider urgent specialty referral.`}
              actionLabel="View Emergency Protocol"
              onAction={() => {
                toast.info('Emergency Protocol', 'Consider urgent neurology or neurosurgery referral');
                setAlertDismissed(true);
              }}
              onDismiss={() => setAlertDismissed(true)}
              className="mb-6"
            />
          )}

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="flex border-b">
              {[
                { id: 'new', label: 'New Referral', icon: UserPlus },
                { id: 'pending', label: 'Pending', icon: Clock, count: pendingReferrals.length },
                { id: 'history', label: 'History', icon: CheckCircle },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'new' | 'pending' | 'history')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600 bg-purple-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'new' && normalizedPatientContext && (
                <ReferralOrderingPanel
                  patientContext={normalizedPatientContext}
                  encounterId={encounterId as string || 'enc-001'}
                  onOrderComplete={handleOrderComplete}
                />
              )}

              {activeTab === 'pending' && (
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                  ) : pendingReferrals.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No pending referrals</p>
                    </div>
                  ) : (
                    pendingReferrals.map(ref => (
                      <div key={ref.id} className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{ref.specialtyName}</p>
                            <p className="text-sm text-gray-500">{ref.clinicalQuestion}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            ref.urgency === 'STAT' ? 'bg-red-100 text-red-700' :
                            ref.urgency === 'URGENT' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {ref.urgency}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Referral history will appear here</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </ProviderShell>
    </>
  );
}
