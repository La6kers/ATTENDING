// =============================================================================
// ATTENDING AI - Medication Buddy Component
// apps/patient-portal/components/engagement/MedicationBuddy.tsx
// =============================================================================

import React, { useState, useEffect } from 'react';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  purpose: string;
  nextDose: Date;
  adherenceRate: number;
  refillsRemaining: number;
  sideEffectsToWatch: string[];
}

export const MedicationBuddy: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [overallAdherence, setOverallAdherence] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [showPillId, setShowPillId] = useState(false);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/engagement/medication-buddy');
      const data = await response.json();
      setMedications(data.medications.map((m: any) => ({
        ...m,
        nextDose: new Date(m.nextDose),
      })));
      setOverallAdherence(data.overallAdherence);
    } catch (error) {
      console.error('Failed to fetch medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const recordDose = async (medicationId: string) => {
    try {
      const response = await fetch('/api/engagement/medication-buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record-dose', medicationId }),
      });
      const data = await response.json();
      alert(`✅ Dose recorded! Streak: ${data.streak} days`);
      fetchMedications();
    } catch (error) {
      console.error('Failed to record dose:', error);
    }
  };

  const getTimeUntilDose = (nextDose: Date): string => {
    const now = new Date();
    const diff = nextDose.getTime() - now.getTime();
    if (diff < 0) return 'Due now';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `in ${hours}h ${mins}m`;
    return `in ${mins}m`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
        <h2 className="text-2xl font-bold">💊 Medication Buddy</h2>
        <p className="opacity-90">Your personal medication assistant</p>
        
        <div className="mt-4 bg-white/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span>Overall Adherence</span>
            <span className="text-2xl font-bold">{overallAdherence}%</span>
          </div>
          <div className="w-full bg-white/30 rounded-full h-2 mt-2">
            <div
              className="bg-white rounded-full h-2"
              style={{ width: `${overallAdherence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b flex space-x-4">
        <button
          onClick={() => setShowPillId(true)}
          className="flex-1 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center justify-center"
        >
          📷 Identify a Pill
        </button>
        <button className="flex-1 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 flex items-center justify-center">
          ⚠️ Check Interactions
        </button>
      </div>

      {/* Medication List */}
      <div className="p-6">
        <h3 className="font-semibold mb-4">Your Medications</h3>
        
        <div className="space-y-4">
          {medications.map((med) => (
            <div
              key={med.id}
              className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
              onClick={() => setSelectedMed(med)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-lg">{med.name}</div>
                  <div className="text-gray-600">{med.dosage} • {med.frequency}</div>
                  <div className="text-sm text-gray-500">{med.purpose}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    recordDose(med.id);
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Take Dose
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className={`${
                    med.nextDose.getTime() - Date.now() < 0 ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    ⏰ Next dose {getTimeUntilDose(med.nextDose)}
                  </span>
                  <span className="text-gray-500">
                    {med.refillsRemaining} refills left
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">Adherence:</span>
                  <span className={`font-semibold ${
                    med.adherenceRate >= 80 ? 'text-green-600' :
                    med.adherenceRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {med.adherenceRate}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Medication Detail Modal */}
      {selectedMed && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">{selectedMed.name}</h3>
              <button onClick={() => setSelectedMed(null)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Dosage</div>
                  <div className="font-semibold">{selectedMed.dosage}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Frequency</div>
                  <div className="font-semibold">{selectedMed.frequency}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Purpose</div>
                  <div className="font-semibold">{selectedMed.purpose}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Side Effects to Watch</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedMed.sideEffectsToWatch.map((effect, i) => (
                      <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                        {effect}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex space-x-4">
                <button
                  onClick={() => {
                    recordDose(selectedMed.id);
                    setSelectedMed(null);
                  }}
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Record Dose
                </button>
                <button
                  onClick={() => setSelectedMed(null)}
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pill Identifier Modal */}
      {showPillId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">📷 Pill Identifier</h3>
              <button onClick={() => setShowPillId(false)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-500 mt-4">Take a photo of your pill to identify it</p>
                <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Open Camera
                </button>
              </div>

              <div className="mt-4 text-center text-sm text-gray-500">
                Or enter pill details manually: color, shape, imprint
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationBuddy;
