// ============================================================
// ATTENDING AI - Population Health Page
// apps/provider-portal/pages/population-health.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { PopulationHealthDashboard } from '../components/population-health';

export default function PopulationHealthPage() {
  return (
    <>
      <Head>
        <title>Population Health Intelligence | ATTENDING AI</title>
        <meta name="description" content="Proactive care for your entire patient panel" />
      </Head>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <PopulationHealthDashboard />
        </div>
      </div>
    </>
  );
}
