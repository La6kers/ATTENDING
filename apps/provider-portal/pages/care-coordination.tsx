// ============================================================
// ATTENDING AI - Care Coordination Page
// apps/provider-portal/pages/care-coordination.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { CareCoordinationHub } from '../components/coordination';

const mockPatient = {
  id: 'patient-123',
  name: 'John Smith',
};

export default function CareCoordinationPage() {
  return (
    <>
      <Head>
        <title>Care Coordination Hub | ATTENDING AI</title>
        <meta name="description" content="Seamless collaboration across all providers" />
      </Head>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <CareCoordinationHub
            patientId={mockPatient.id}
            patientName={mockPatient.name}
          />
        </div>
      </div>
    </>
  );
}
