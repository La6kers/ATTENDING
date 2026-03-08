// ============================================================
// ATTENDING AI - Provider Performance Page
// apps/provider-portal/pages/my-performance.tsx
//
// Phase 8B: Individual provider metrics and peer comparison
// ============================================================

import React from 'react';
import Head from 'next/head';
import { ProviderShell } from '@/components/layout/ProviderShell';
import { ProviderPerformanceDashboard } from '../components/performance';

export default function MyPerformancePage() {
  return (
    <>
      <Head>
        <title>My Performance | ATTENDING AI</title>
        <meta 
          name="description" 
          content="Track your clinical performance metrics and compare with peers" 
        />
      </Head>
      <ProviderShell contextBadge="Performance" currentPage="my-performance">
        <ProviderPerformanceDashboard />
      </ProviderShell>
    </>
  );
}
