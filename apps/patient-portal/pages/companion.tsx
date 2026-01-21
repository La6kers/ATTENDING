// ============================================================
// ATTENDING AI - Health Companion Page
// apps/patient-portal/pages/companion.tsx
//
// Phase 8C: Patient engagement and self-management
// ============================================================

import React from 'react';
import Head from 'next/head';
import { HealthCompanion } from '../components/companion';

// In production, this would come from auth context
const mockPatient = {
  id: 'patient-123',
  name: 'John Smith',
};

export default function CompanionPage() {
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
        patientId={mockPatient.id}
        patientName={mockPatient.name}
      />
    </>
  );
}
