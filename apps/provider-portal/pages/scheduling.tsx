// ============================================================
// ATTENDING AI - Smart Scheduling Page
// apps/provider-portal/pages/scheduling.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { ProviderShell } from '@/components/layout/ProviderShell';
import { SmartScheduling } from '../components/scheduling';

export default function SchedulingPage() {
  return (
    <>
      <Head>
        <title>Smart Clinical Scheduling | ATTENDING AI</title>
        <meta name="description" content="AI-optimized appointment management" />
      </Head>
      <ProviderShell contextBadge="Scheduling" currentPage="scheduling">
        <div className="max-w-7xl mx-auto p-6">
          <SmartScheduling />
        </div>
      </ProviderShell>
    </>
  );
}
