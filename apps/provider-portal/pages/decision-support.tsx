// ============================================================
// ATTENDING AI - Clinical Decision Support Page
// apps/provider-portal/pages/decision-support.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { ClinicalDecisionSupport } from '../components/decision-support';

export default function DecisionSupportPage() {
  return (
    <>
      <Head>
        <title>Clinical Decision Support | ATTENDING AI</title>
        <meta name="description" content="Evidence-based tools at the point of care" />
      </Head>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <ClinicalDecisionSupport />
        </div>
      </div>
    </>
  );
}
