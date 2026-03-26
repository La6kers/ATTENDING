import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VitalsTimeline from '../components/VitalsTimeline';

export default function EMSHandoff() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ems/${id}`)
      .then(r => r.json())
      .then(data => { setEncounter(data); setLoading(false); });
  }, [id]);

  const acceptHandoff = async () => {
    try {
      await fetch(`/api/ems/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'handoff_complete' }),
      });
      navigate('/er');
    } catch (e) {
      console.error('Handoff error:', e);
    }
  };

  if (loading) return <div className="p-8 text-white/60 text-center">Loading handoff...</div>;
  if (!encounter) return <div className="p-8 text-red-300 text-center">Encounter not found.</div>;

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📋</span> EMS Handoff
          </h1>
          <p className="text-teal-200 text-sm">
            {encounter.first_name} {encounter.last_name} — {encounter.chief_complaint}
          </p>
        </div>
        <button onClick={() => navigate('/er')} className="btn-secondary text-sm">
          ← Back to ER Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main handoff brief */}
        <div className="lg:col-span-2 space-y-4">
          {encounter.handoff_brief ? (
            <div className="card border-green-200">
              <h2 className="text-lg font-semibold text-green-900 mb-4">AI-Generated Handoff Brief</h2>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
                {encounter.handoff_brief}
              </div>
            </div>
          ) : (
            <div className="card text-center text-gray-500 py-8">
              <p>Handoff brief not yet generated.</p>
              <p className="text-sm mt-1">The EMS crew will generate this upon arrival.</p>
            </div>
          )}

          {/* AI Summary */}
          {encounter.ai_summary && (
            <div className="card bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Running AI Summary</h3>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">
                {encounter.ai_summary.replace(/\*\*/g, '')}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Vitals Trend</h3>
            <VitalsTimeline vitals={encounter.vitals_timeline} />
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2">Interventions</h3>
            <ul className="space-y-1 text-sm">
              {(encounter.interventions || []).map((inv, i) => (
                <li key={i}>✓ {inv}</li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2">Medications</h3>
            <ul className="space-y-1 text-sm">
              {(encounter.medications_given || []).map((med, i) => (
                <li key={i}>💊 {med.name} {med.dose} {med.route} @ {med.time}</li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2">EMS Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-500">Unit:</span> {encounter.unit_id}</p>
              <p><span className="text-gray-500">Crew:</span> {encounter.crew_lead}</p>
              <p><span className="text-gray-500">Dispatch:</span> {encounter.dispatch_code}</p>
              <p><span className="text-gray-500">Status:</span> {encounter.transport_status}</p>
            </div>
          </div>

          {encounter.transport_status === 'arrived' && (
            <button onClick={acceptHandoff} className="btn-primary w-full bg-green-600 hover:bg-green-700">
              ✓ Accept Handoff
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
