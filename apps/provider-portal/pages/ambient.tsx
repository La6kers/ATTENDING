// ============================================================
// ATTENDING AI - Ambient Documentation Page
// apps/provider-portal/pages/ambient.tsx
//
// Phase 8C: Auto-generate clinical notes from conversations
// ============================================================

import React, { useState } from 'react';
import Head from 'next/head';
import ProviderShell from '../components/layout/ProviderShell';
import { AmbientDocumentation } from '../components/ambient';

// TODO: Replace with real patient context from route params or encounter store
const mockPatient = {
  id: 'patient-123',
  name: 'John Smith',
};

export default function AmbientPage() {
  const [savedNotes, setSavedNotes] = useState<any[]>([]);

  const handleSaveNote = (note: any) => {
    setSavedNotes(prev => [...prev, { ...note, savedAt: new Date() }]);
    // TODO: POST /api/encounters/{id}/notes when connected to backend
  };

  return (
    <ProviderShell contextBadge="Ambient Scribe" currentPage="">
      <Head>
        <title>Ambient Documentation | ATTENDING AI</title>
      </Head>
      <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 110px)' }}>
        <div className="max-w-7xl mx-auto p-6">
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
                {savedNotes.length} note(s) saved to patient chart
              </p>
            </div>
          )}
        </div>
      </div>
    </ProviderShell>
  );
}
