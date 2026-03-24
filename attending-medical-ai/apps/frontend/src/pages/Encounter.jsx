import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AIInsight from '../components/AIInsight';

export default function Encounter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiAssist, setAiAssist] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchEncounter();
  }, [id]);

  const fetchEncounter = async () => {
    const res = await fetch(`/api/encounters/${id}`);
    const data = await res.json();
    setEncounter(data);
    setNotes(data.exam_notes || '');

    // Auto-transition to in_progress if waiting
    if (data.status === 'waiting') {
      await fetch(`/api/encounters/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' })
      });
      data.status = 'in_progress';
    }
    setLoading(false);
  };

  const requestAIAssist = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/encounter-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encounter_id: parseInt(id), current_notes: notes })
      });
      const data = await res.json();
      setAiAssist(data.assist);
    } catch (err) {
      setAiAssist('Error generating AI assist. Please try again.');
    }
    setAiLoading(false);
  };

  const proceedToCharting = async () => {
    await fetch(`/api/encounters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_notes: notes })
    });
    await fetch(`/api/encounters/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'charting' })
    });
    navigate(`/charting/${id}`);
  };

  if (loading) return <div className="p-8 text-gray-500">Loading encounter...</div>;
  if (!encounter) return <div className="p-8 text-red-500">Encounter not found</div>;

  const age = getAge(encounter.date_of_birth);
  const vitals = encounter.vitals || {};
  const intake = encounter.intake_data || {};

  return (
    <div className="p-8 max-w-6xl">
      {/* Patient header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {encounter.last_name}, {encounter.first_name}
          </h1>
          <p className="text-gray-500">
            {age}yo {encounter.gender} &middot; Encounter #{encounter.id} &middot;{' '}
            <span className={`badge badge-${encounter.status}`}>{encounter.status.replace('_', ' ')}</span>
          </p>
        </div>
        <button onClick={proceedToCharting} className="btn-primary">
          Proceed to Charting &rarr;
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column: Patient info */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Chief Complaint</h3>
            <p className="text-sm">{encounter.chief_complaint}</p>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Vitals</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(vitals).map(([key, val]) => val && (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-500 uppercase text-xs">{key}</span>
                  <span className="font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Patient Background</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Allergies:</span>{' '}
                {encounter.allergies?.length ? (
                  encounter.allergies.map(a => (
                    <span key={a} className="inline-block bg-red-50 text-red-700 rounded px-2 py-0.5 text-xs mr-1">{a}</span>
                  ))
                ) : 'NKDA'}
              </div>
              <div>
                <span className="font-medium text-gray-700">Medications:</span>{' '}
                <span className="text-gray-600">{encounter.medications?.join(', ') || 'None'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">PMH:</span>{' '}
                <span className="text-gray-600">{encounter.medical_history?.join(', ') || 'None'}</span>
              </div>
            </div>
          </div>

          {encounter.intake_summary && (
            <AIInsight title="Intake Summary" content={encounter.intake_summary} />
          )}
        </div>

        {/* Middle column: Encounter notes */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Intake Details</h3>
            <div className="text-sm space-y-1">
              {Object.entries(intake).filter(([k]) => k !== 'chief_complaint' && k !== 'followup_responses').map(([key, val]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-gray-500 capitalize min-w-[80px]">{key.replace(/_/g, ' ')}:</span>
                  <span>{typeof val === 'string' ? val : JSON.stringify(val)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Exam Notes</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Document your physical examination findings..."
              className="input min-h-[200px] resize-y font-mono text-sm"
            />
          </div>
        </div>

        {/* Right column: AI assist */}
        <div className="space-y-4">
          <AIInsight
            title="Clinical Decision Support"
            content={aiAssist}
            loading={aiLoading}
            onRequest={requestAIAssist}
            buttonLabel="Get AI Assist"
          />

          <div className="card bg-yellow-50 border-yellow-200">
            <p className="text-xs text-yellow-800">
              <strong>Disclaimer:</strong> AI suggestions are for clinical decision support only.
              All clinical decisions must be made by the treating physician based on their professional judgment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getAge(dob) {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}
