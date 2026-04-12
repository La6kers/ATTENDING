// ============================================================
// ATTENDING AI - AI Copilot Demo Page
// apps/provider-portal/pages/copilot.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { ProviderShell } from '@/components/layout/ProviderShell';
import { ClinicalCopilot, PatientContext } from '../components/copilot';

const mockPatientContext: PatientContext = {
  patientId: 'p123',
  patientName: 'John Smith',
  age: 58,
  gender: 'M',
  chiefComplaint: 'Chest pain and shortness of breath',
  currentMedications: ['Lisinopril 20mg', 'Metformin 1000mg', 'Atorvastatin 40mg'],
  allergies: ['Penicillin'],
  conditions: ['Type 2 Diabetes', 'Hypertension', 'Hyperlipidemia'],
  vitals: {
    bp: '142/88',
    hr: '88',
    temp: '98.6',
    rr: '18',
    o2sat: '96%',
  },
};

export default function CopilotPage() {
  const handleOrderAction = (action: any) => {
    console.log('Order action:', action);
  };

  return (
    <>
      <Head>
        <title>AI Clinical Copilot | ATTENDING AI</title>
        <meta name="description" content="Real-time AI clinical decision support" />
      </Head>
      <ProviderShell contextBadge="AI Copilot" currentPage="copilot">
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">AI Clinical Copilot Demo</h1>
            <p className="text-slate-500">
              The copilot appears on the right side. Type symptoms in the input to see AI suggestions.
            </p>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Current Patient</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium">{mockPatientContext.patientName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Chief Complaint</p>
                <p className="font-medium">{mockPatientContext.chiefComplaint}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Conditions</p>
                <p className="font-medium">{mockPatientContext.conditions.join(', ')}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Medications</p>
                <p className="font-medium">{mockPatientContext.currentMedications.join(', ')}</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-teal-50 rounded-lg">
              <h3 className="font-medium text-teal-900 mb-2">Try These Demo Inputs:</h3>
              <ul className="text-sm text-teal-700 space-y-1">
                <li>• "Patient reports worst headache of life" - triggers SAH red flag</li>
                <li>• "Chest pain radiating to left arm with sweating" - triggers ACS alert</li>
                <li>• "Patient wants to try ibuprofen" - triggers drug interaction (warfarin)</li>
                <li>• "Headache for 3 days" - triggers question suggestions</li>
                <li>• "Diabetic foot pain" - triggers clinical pearl</li>
              </ul>
            </div>
          </div>
        </div>
        
        <ClinicalCopilot
          patientContext={mockPatientContext}
          onOrderAction={handleOrderAction}
          position="right"
        />
      </div>
      </ProviderShell>
    </>
  );
}
