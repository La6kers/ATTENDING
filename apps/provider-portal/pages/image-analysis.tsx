// ============================================================
// ATTENDING AI - Image Analysis Page
// apps/provider-portal/pages/image-analysis.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { ClinicalImageAnalysis } from '../components/multimodal';

const mockPatient = {
  id: 'patient-123',
  name: 'John Smith',
};

export default function ImageAnalysisPage() {
  const handleSaveToChart = (analysis: any, imageUrl: string) => {
    console.log('Saving to chart:', analysis);
  };

  return (
    <>
      <Head>
        <title>Clinical Image Analysis | ATTENDING AI</title>
        <meta name="description" content="AI-powered clinical image analysis" />
      </Head>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <ClinicalImageAnalysis
            patientId={mockPatient.id}
            patientName={mockPatient.name}
            onSaveToChart={handleSaveToChart}
          />
        </div>
      </div>
    </>
  );
}
