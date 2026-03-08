// ============================================================
// ATTENDING AI - Clinical Outcomes Page
// apps/provider-portal/pages/outcomes.tsx
//
// Phase 8: Clinical outcomes dashboard page
// ============================================================

import React from 'react';
import Head from 'next/head';
import { ProviderShell } from '@/components/layout/ProviderShell';
import { ClinicalOutcomesDashboard } from '../components/outcomes';

export default function OutcomesPage() {
  return (
    <>
      <Head>
        <title>Clinical Outcomes | ATTENDING AI</title>
        <meta 
          name="description" 
          content="Track clinical quality metrics, efficiency improvements, and financial impact" 
        />
      </Head>
      <ProviderShell contextBadge="Outcomes" currentPage="outcomes">
        <ClinicalOutcomesDashboard />
      </ProviderShell>
    </>
  );
}
