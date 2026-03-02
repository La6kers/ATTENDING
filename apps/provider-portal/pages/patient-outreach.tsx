// ============================================================
// ATTENDING AI - Patient Outreach Hub Page
// apps/provider-portal/pages/patient-outreach.tsx
//
// Provider tools for batch campaigns, smart reminders,
// and gap-closing outreach to Medicare patients
// ============================================================

import React from 'react';
import Head from 'next/head';
import { PatientOutreachHub } from '../components/patient-outreach/PatientOutreachHub';

export default function PatientOutreachPage() {
  return (
    <>
      <Head>
        <title>Patient Outreach | ATTENDING AI</title>
        <meta name="description" content="Close gaps in care with simple, actionable patient outreach campaigns" />
      </Head>
      <PatientOutreachHub />
    </>
  );
}
