// ============================================================
// ATTENDING AI - Clinical Decision Support Page
// apps/provider-portal/pages/decision-support.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { ProviderShell } from '@/components/layout/ProviderShell';
import { ClinicalDecisionSupport } from '../components/decision-support';

export default function DecisionSupportPage() {
  return (
    <>
      <Head>
        <title>Clinical Decision Support | ATTENDING AI</title>
        <meta name="description" content="Evidence-based tools at the point of care" />
      </Head>
      <ProviderShell contextBadge="Decision Support" currentPage="decision-support">
        <div className="max-w-7xl mx-auto p-6">
          <ClinicalDecisionSupport />
        </div>
      </ProviderShell>
    </>
  );
}
