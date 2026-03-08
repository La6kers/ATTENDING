// ============================================================
// ATTENDING AI - Care Coordination Hub Page
// apps/provider-portal/pages/coordination.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { ProviderShell } from '@/components/layout/ProviderShell';
import { CareCoordinationHub } from '../components/coordination';

export default function CoordinationPage() {
  return (
    <>
      <Head>
        <title>Care Coordination Hub | ATTENDING AI</title>
        <meta 
          name="description" 
          content="Coordinate care with your entire healthcare team" 
        />
      </Head>
      <ProviderShell contextBadge="Care Coordination" currentPage="coordination">
        <CareCoordinationHub />
      </ProviderShell>
    </>
  );
}
