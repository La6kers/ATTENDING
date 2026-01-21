// ============================================================
// ATTENDING AI - SDOH Dashboard Page
// apps/provider-portal/pages/sdoh.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { SDOHDashboard } from '../components/sdoh';

export default function SDOHPage() {
  return (
    <>
      <Head>
        <title>Social Determinants of Health | ATTENDING AI</title>
        <meta name="description" content="Address the whole patient, not just the disease" />
      </Head>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <SDOHDashboard 
            patientId="patient-123"
            patientName="Maria Garcia"
          />
        </div>
      </div>
    </>
  );
}
