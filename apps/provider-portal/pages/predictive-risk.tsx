// ============================================================
// ATTENDING AI - Predictive Risk Page
// apps/provider-portal/pages/predictive-risk.tsx
//
// Phase 8B: AI-powered early warning system
// ============================================================

import React from 'react';
import Head from 'next/head';
import { PredictiveRiskDashboard } from '../components/predictive';

export default function PredictiveRiskPage() {
  return (
    <>
      <Head>
        <title>Predictive Risk Dashboard | ATTENDING AI</title>
        <meta 
          name="description" 
          content="AI-powered early warning system for patient deterioration" 
        />
      </Head>
      <PredictiveRiskDashboard />
    </>
  );
}
