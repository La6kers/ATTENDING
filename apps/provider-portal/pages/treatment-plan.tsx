// Treatment Plan Page
// apps/provider-portal/pages/treatment-plan.tsx
//
// UPDATED: Full purple gradient theme with back/home navigation

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  ClipboardList, 
  ArrowLeft, 
  CheckCircle,
  FileText,
  AlertTriangle,
  Home,
  Bell,
  Settings,
  Brain,
} from 'lucide-react';
import { TreatmentPlanPanel } from '@/components/treatment-plan';
import type { PatientContext } from '@/store/treatmentPlanStore';

// =============================================================================
// Theme - Match login page gradient
// =============================================================================

const theme = {
  gradient: 'linear-gradient(135deg, #4c51bf 0%, #6b46c1 100%)',
};

// Mock patient context - in production this would come from the assessment
const getMockPatientContext = (patientId?: string): PatientContext => ({
  id: patientId || 'pat-001',
  name: 'Maria Santos',
  age: 42,
  gender: 'Female',
  mrn: 'MRN-2024-001',
  chiefComplaint: 'Severe headache with visual disturbances and neck stiffness',
  allergies: ['Penicillin', 'Sulfa'],
  currentMedications: ['Lisinopril 10mg daily', 'Metformin 500mg BID'],
  medicalHistory: ['Hypertension', 'Type 2 Diabetes', 'Migraine history'],
  redFlags: ['Worst headache of life', 'Neck stiffness', 'Visual changes'],
  insurancePlan: 'Blue Cross',
});

// Mock orders from other stores
const getMockOrders = () => ({
  labOrders: [
    { id: 'lab-1', type: 'lab' as const, name: 'CBC with Differential', priority: 'STAT' as const, status: 'pending' as const },
    { id: 'lab-2', type: 'lab' as const, name: 'Comprehensive Metabolic Panel', priority: 'STAT' as const, status: 'pending' as const },
    { id: 'lab-3', type: 'lab' as const, name: 'ESR', priority: 'ROUTINE' as const, status: 'pending' as const },
  ],
  imagingOrders: [
    { id: 'img-1', type: 'imaging' as const, name: 'CT Head without Contrast', priority: 'STAT' as const, status: 'pending' as const },
    { id: 'img-2', type: 'imaging' as const, name: 'CTA Head/Neck', priority: 'STAT' as const, status: 'pending' as const },
  ],
  prescriptions: [
    { id: 'rx-1', type: 'medication' as const, name: 'Ondansetron 4mg', priority: 'ROUTINE' as const, status: 'pending' as const },
  ],
  referrals: [
    { id: 'ref-1', type: 'referral' as const, name: 'Neurology', priority: 'STAT' as const, status: 'pending' as const },
  ],
});

export default function TreatmentPlanPage() {
  const router = useRouter();
  const { patientId, encounterId } = router.query;
  
  const [patientContext, setPatientContext] = useState<PatientContext | null>(null);
  const [orders] = useState(getMockOrders());
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'drafts' | 'completed'>('current');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load patient context
    setPatientContext(getMockPatientContext(patientId as string));
    
    // Load saved plans
    fetch('/api/treatment-plans')
      .then(res => res.json())
      .then(data => {
        setSavedPlans(data.plans || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [patientId]);

  const handleSave = (planId: string) => {
    console.log('Plan saved:', planId);
    // Refresh saved plans
    fetch('/api/treatment-plans')
      .then(res => res.json())
      .then(data => setSavedPlans(data.plans || []));
  };

  const handleSubmit = () => {
    console.log('Plan submitted');
    // Navigate to success or next step
  };

  if (!patientContext) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradient }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading patient information...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Treatment Plan | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen" style={{ background: theme.gradient }}>
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => router.back()}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Link
                  href="/"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Dashboard"
                >
                  <Home className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white">Treatment Plan</h1>
                    <p className="text-xs text-purple-200">Create comprehensive treatment plans</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors relative">
                  <Bell className="w-5 h-5" />
                </button>
                <Link href="/settings" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <Settings className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Patient Banner */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                  {patientContext.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{patientContext.name}</h2>
                  <p className="text-gray-600">
                    {patientContext.age}yo {patientContext.gender} | MRN: {patientContext.mrn}
                  </p>
                  <p className="text-sm text-purple-600 mt-1">
                    Chief Complaint: {patientContext.chiefComplaint}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                {/* Allergies */}
                <div className="flex items-center gap-2">
                  {patientContext.allergies.map(allergy => (
                    <span key={allergy} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {allergy}
                    </span>
                  ))}
                </div>
                
                {/* Red Flags */}
                {patientContext.redFlags.length > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700">
                      Red Flags: {patientContext.redFlags.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-t-2xl shadow-lg">
            <div className="flex gap-1 px-4 pt-2">
              {[
                { id: 'current', label: 'Current Plan', icon: ClipboardList },
                { id: 'drafts', label: 'Saved Drafts', icon: FileText, count: savedPlans.filter(p => p.status === 'DRAFT').length },
                { id: 'completed', label: 'Completed', icon: CheckCircle },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-purple-600 text-purple-600 bg-purple-50 rounded-t-lg'
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
        <div className="max-w-7xl mx-auto px-6 pb-6">
          <div className="bg-white rounded-b-2xl shadow-lg p-6">
            {activeTab === 'current' && (
              <TreatmentPlanPanel
                patientContext={patientContext}
                encounterId={encounterId as string || 'enc-001'}
                labOrders={orders.labOrders}
                imagingOrders={orders.imagingOrders}
                prescriptions={orders.prescriptions}
                referrals={orders.referrals}
                onSave={handleSave}
                onSubmit={handleSubmit}
              />
            )}

            {activeTab === 'drafts' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Saved Drafts</h2>
                
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : savedPlans.filter(p => p.status === 'DRAFT').length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No saved drafts</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedPlans.filter(p => p.status === 'DRAFT').map(plan => (
                      <div key={plan.id} className="bg-gray-50 rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{plan.chiefComplaint}</p>
                            <p className="text-sm text-gray-500">
                              {plan.diagnoses?.length || 0} diagnoses • 
                              Last updated: {new Date(plan.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg font-medium">
                            Continue
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'completed' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Completed Plans</h2>
                
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : savedPlans.filter(p => p.status === 'APPROVED' || p.status === 'EXECUTED').length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <CheckCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No completed plans</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedPlans.filter(p => p.status === 'APPROVED' || p.status === 'EXECUTED').map(plan => (
                      <div key={plan.id} className="bg-gray-50 rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{plan.chiefComplaint}</p>
                            <p className="text-sm text-gray-500">
                              Completed: {new Date(plan.approvedAt || plan.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            {plan.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
