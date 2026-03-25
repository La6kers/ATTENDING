// ============================================================
// ATTENDING AI - Medicare Quality Measures Page
// apps/provider-portal/pages/quality-measures.tsx
//
// Admin/Billing dashboard for Medicare quality compliance,
// gap tracking, and revenue opportunity identification
// ============================================================

import React from 'react';
import Head from 'next/head';
import { ProviderShell } from '@/components/layout/ProviderShell';
import { MedicareQualityDashboard } from '../components/quality-measures/MedicareQualityDashboard';

export default function QualityMeasuresPage() {
  return (
    <>
      <Head>
        <title>Medicare Quality Measures | ATTENDING AI</title>
        <meta name="description" content="Track Medicare quality compliance, identify gaps in care, and maximize reimbursement" />
      </Head>
      <ProviderShell contextBadge="Quality Measures" currentPage="quality-measures">
        <MedicareQualityDashboard />
      </ProviderShell>
    </>
  );
}
