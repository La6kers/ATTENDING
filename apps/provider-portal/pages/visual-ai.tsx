// ============================================================
// ATTENDING AI - Visual AI Diagnostics Page
// apps/provider-portal/pages/visual-ai.tsx
// ============================================================

import React from 'react';
import Head from 'next/head';
import { ClinicalImageAnalysis } from '../components/multimodal';

const mockPatient = {
  id: 'patient-123',
  name: 'John Smith',
};

export default function VisualAIPage() {
  const handleSaveToChart = (analysis: any, imageUrl: string) => {
    console.log('Saving to chart:', { analysis, imageUrl });
    // In production, save to patient chart via API
  };

  return (
    <>
      <Head>
        <title>Visual AI Diagnostics | ATTENDING AI</title>
        <meta 
          name="description" 
          content="AI-powered clinical image analysis for dermatology, wounds, and more" 
        />
      </Head>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-6xl mx-auto">
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
