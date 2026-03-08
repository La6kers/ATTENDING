// ============================================================
// ATTENDING AI - SDOH Dashboard Page
// apps/provider-portal/pages/sdoh.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { ProviderShell } from '@/components/layout/ProviderShell';
import { SDOHDashboard } from '../components/sdoh';

export default function SDOHPage() {
  return (
    <>
      <Head>
        <title>Social Determinants of Health | ATTENDING AI</title>
        <meta name="description" content="Address the whole patient, not just the disease" />
      </Head>
      <ProviderShell contextBadge="SDOH" currentPage="sdoh">
        <div className="max-w-7xl mx-auto p-6">
          <SDOHDashboard
            patientId="patient-123"
            patientName="Maria Garcia"
          />
        </div>
      </ProviderShell>
    </>
  );
}
