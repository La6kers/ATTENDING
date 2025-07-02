// Patient Chat Page - BioMistral-7B Medical AI Assessment

import React from 'react';
import { PatientChat } from '@/components/patient-chat/PatientChat';
import Head from 'next/head';

export default function PatientChatPage() {
  return (
    <>
      <Head>
        <title>ATTENDING AI - Patient Assessment with BioMistral-7B</title>
        <meta name="description" content="AI-powered medical assessment using BioMistral-7B for comprehensive patient interviews" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <PatientChat />
    </>
  );
}
