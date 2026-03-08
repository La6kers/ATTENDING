// ============================================================
// ATTENDING AI - Integration Hub Page
// apps/provider-portal/pages/integrations.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import ProviderShell from '../components/layout/ProviderShell';
import { IntegrationHub } from '../components/integrations';

export default function IntegrationsPage() {
  return (
    <ProviderShell contextBadge="Integrations" currentPage="">
      <Head>
        <title>Integration Hub | ATTENDING AI</title>
        <meta name="description" content="Connect, manage, and monitor all integrations" />
      </Head>
      <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 110px)' }}>
        <div className="max-w-7xl mx-auto p-6">
          <IntegrationHub />
        </div>
      </div>
    </ProviderShell>
  );
}
