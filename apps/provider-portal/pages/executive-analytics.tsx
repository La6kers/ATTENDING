// ============================================================
// ATTENDING AI - Executive Analytics Page
// apps/provider-portal/pages/executive-analytics.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { ProviderShell } from '@/components/layout/ProviderShell';
import { ExecutiveAnalytics } from '../components/analytics';

export default function ExecutiveAnalyticsPage() {
  return (
    <>
      <Head>
        <title>Executive Analytics | ATTENDING AI</title>
        <meta name="description" content="Real-time operational intelligence for leadership" />
      </Head>
      <ProviderShell contextBadge="Analytics" currentPage="executive-analytics">
        <div className="max-w-7xl mx-auto p-6">
          <ExecutiveAnalytics />
        </div>
      </ProviderShell>
    </>
  );
}
