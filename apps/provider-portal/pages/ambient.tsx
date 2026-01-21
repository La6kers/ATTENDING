// ============================================================
// ATTENDING AI - Ambient Documentation Page
// apps/provider-portal/pages/ambient.tsx
//
// Phase 8C: Auto-generate clinical notes from conversations
// ============================================================

import React, { useState } from 'react';
import Head from 'next/head';
import { AmbientDocumentation } from '../components/ambient';

// In production, this would come from route params or context
const mockPatient = {
  id: 'patient-123',
  name: 'John Smith',
};

export default function AmbientPage() {
  const [savedNotes, setSavedNotes] = useState<any[]>([]);

  const handleSaveNote = (note: any) => {
    setSavedNotes(prev => [...prev, { ...note, savedAt: new Date() }]);
    console.log('Note saved to chart:', note);
    // In production, save to database/EHR
  };

  return (
    <>
      <Head>
        <title>Ambient Documentation | ATTENDING AI</title>
        <meta 
          name="description" 
          content="AI-powered clinical documentation from patient conversations" 
        />
      </Head>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Ambient Clinical Documentation</h1>
            <p className="text-slate-500">Record patient conversations and auto-generate SOAP notes</p>
          </div>
          
          <AmbientDocumentation
            patientId={mockPatient.id}
            patientName={mockPatient.name}
            onSaveNote={handleSaveNote}
          />

          {savedNotes.length > 0 && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-emerald-700 font-medium">
                ✓ {savedNotes.length} note(s) saved to patient chart
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
