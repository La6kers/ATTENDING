// ============================================================
// ATTENDING AI - Executive Analytics Page
// apps/provider-portal/pages/executive-analytics.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { ExecutiveAnalytics } from '../components/analytics';

export default function ExecutiveAnalyticsPage() {
  return (
    <>
      <Head>
        <title>Executive Analytics | ATTENDING AI</title>
        <meta name="description" content="Real-time operational intelligence for leadership" />
      </Head>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <ExecutiveAnalytics />
        </div>
      </div>
    </>
  );
}
