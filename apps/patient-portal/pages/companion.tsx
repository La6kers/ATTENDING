// ============================================================
// ATTENDING AI - Health Companion Page
// apps/patient-portal/pages/companion.tsx
//
// Phase 8C: Patient engagement and self-management
// ============================================================

import React from 'react';
import Head from 'next/head';
import { HealthCompanion } from '../components/companion';
import { usePatientData } from '../hooks/usePatientData';

export default function CompanionPage() {
  const { profile } = usePatientData();

  const patientId = profile?.id ?? 'patient-123';
  const patientName = profile?.fullName ?? `${profile?.firstName ?? 'Alex'} ${profile?.lastName ?? 'Morgan'}`;

  return (
    <>
      <Head>
        <title>Health Companion | ATTENDING AI</title>
        <meta 
          name="description" 
          content="Your personal health companion for daily check-ins, medication tracking, and care management" 
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <HealthCompanion 
        patientId={patientId}
        patientName={patientName}
      />
    </>
  );
}
