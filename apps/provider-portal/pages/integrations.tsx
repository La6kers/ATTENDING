// ============================================================
// ATTENDING AI - Integration Hub Page
// apps/provider-portal/pages/integrations.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { IntegrationHub } from '../components/integrations';

export default function IntegrationsPage() {
  return (
    <>
      <Head>
        <title>Integration Hub | ATTENDING AI</title>
        <meta name="description" content="Connect, manage, and monitor all integrations" />
      </Head>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <IntegrationHub />
        </div>
      </div>
    </>
  );
}
