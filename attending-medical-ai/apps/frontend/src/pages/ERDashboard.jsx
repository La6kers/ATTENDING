import { useState, useEffect, useCallback } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import EMSPatientCard from '../components/EMSPatientCard';
import VitalsTimeline from '../components/VitalsTimeline';

export default function ERDashboard() {
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  // Initial load
  useEffect(() => {
    fetch('/api/ems')
      .then(r => r.json())
      .then(data => {
        setEncounters(data);
        setLoading(false);
      });
  }, []);

  // Real-time updates
  const { connected } = useWebSocket('er:incoming', useCallback((msg) => {
    switch (msg.type) {
      case 'ems:new_incoming':
        setEncounters(prev => [msg.data, ...prev]);
        break;

      case 'ems:status_update':
        setEncounters(prev => prev.map(e =>
          e.encounter_id === msg.data.encounterId
            ? { ...e, transport_status: msg.data.status, eta_minutes: msg.data.eta }
            : e
        ));
        break;

      case 'ems:summary_update':
        setEncounters(prev => prev.map(e =>
          e.encounter_id === msg.data.encounterId
            ? { ...e, ai_summary: msg.data.summary }
            : e
        ));
        break;

      case 'ems:vitals_update':
        setEncounters(prev => prev.map(e =>
          e.encounter_id === msg.data.encounterId
            ? { ...e, vitals_timeline: msg.data.vitals }
            : e
        ));
        break;

      case 'ems:handoff_ready':
        setEncounters(prev => prev.map(e =>
          e.encounter_id === msg.data.encounterId
            ? { ...e, handoff_brief: msg.data.handoffBrief }
            : e
        ));
        break;
    }
  }, []));

  const acceptHandoff = async (encounterId) => {
    try {
      await fetch(`/api/ems/${encounterId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'handoff_complete' }),
      });
      setEncounters(prev => prev.map(e =>
        e.encounter_id === encounterId
          ? { ...e, transport_status: 'handoff_complete' }
          : e
      ));
    } catch (e) {
      console.error('Handoff accept error:', e);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading ER dashboard...</div>;

  const active = encounters.filter(e => e.transport_status !== 'handoff_complete');
  const completed = encounters.filter(e => e.transport_status === 'handoff_complete');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>🏥</span> ER Incoming
          </h1>
          <p className="text-gray-500 mt-1">Real-time EMS patient tracking — AI-powered summaries</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-500">
            {connected ? 'Live Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border p-4 bg-red-50 text-red-700 border-red-200">
          <p className="text-2xl font-bold">{active.length}</p>
          <p className="text-sm mt-0.5">Incoming</p>
        </div>
        <div className="rounded-xl border p-4 bg-amber-50 text-amber-700 border-amber-200">
          <p className="text-2xl font-bold">
            {active.filter(e => e.transport_status === 'transporting').length}
          </p>
          <p className="text-sm mt-0.5">En Route</p>
        </div>
        <div className="rounded-xl border p-4 bg-green-50 text-green-700 border-green-200">
          <p className="text-2xl font-bold">
            {active.filter(e => e.transport_status === 'arrived').length}
          </p>
          <p className="text-sm mt-0.5">At ED</p>
        </div>
        <div className="rounded-xl border p-4 bg-gray-50 text-gray-700 border-gray-200">
          <p className="text-2xl font-bold">{completed.length}</p>
          <p className="text-sm mt-0.5">Handed Off</p>
        </div>
      </div>

      {/* Active incoming */}
      {active.length > 0 ? (
        <div className="space-y-4 mb-8">
          {active.map(enc => (
            <div key={enc.encounter_id}>
              <div onClick={() => setExpanded(expanded === enc.encounter_id ? null : enc.encounter_id)}>
                <EMSPatientCard encounter={enc} showHandoff />
              </div>

              {/* Expanded detail */}
              {expanded === enc.encounter_id && (
                <div className="ml-4 mt-2 p-4 border-l-4 border-red-300 bg-white rounded-r-lg shadow-sm space-y-4">
                  {/* AI Summary */}
                  {enc.ai_summary && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 text-sm mb-2">AI Summary</h4>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">
                        {enc.ai_summary.replace(/\*\*/g, '')}
                      </p>
                    </div>
                  )}

                  {/* Vitals */}
                  {enc.vitals_timeline?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 text-sm mb-2">Vitals Trend</h4>
                      <VitalsTimeline vitals={enc.vitals_timeline} />
                    </div>
                  )}

                  {/* Interventions */}
                  {enc.interventions?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 text-sm mb-2">Interventions</h4>
                      <ul className="text-sm space-y-0.5">
                        {enc.interventions.map((inv, i) => (
                          <li key={i}>✓ {inv}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Medications */}
                  {enc.medications_given?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 text-sm mb-2">Medications Given</h4>
                      <ul className="text-sm space-y-0.5">
                        {enc.medications_given.map((med, i) => (
                          <li key={i}>💊 {med.name} {med.dose} {med.route} @ {med.time}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Handoff brief */}
                  {enc.handoff_brief && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900 text-sm mb-2">Handoff Brief</h4>
                      <pre className="text-xs text-green-800 whitespace-pre-wrap font-sans">
                        {enc.handoff_brief}
                      </pre>
                    </div>
                  )}

                  {/* Accept handoff button */}
                  {enc.transport_status === 'arrived' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); acceptHandoff(enc.encounter_id); }}
                      className="btn-primary bg-green-600 hover:bg-green-700 w-full"
                    >
                      ✓ Accept Handoff — Start Clinical Encounter
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center text-gray-500 py-12 mb-8">
          <p className="text-lg">No incoming EMS patients</p>
          <p className="text-sm mt-1">Active EMS encounters will appear here in real-time</p>
        </div>
      )}

      {/* Completed handoffs */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Handoffs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completed.slice(0, 4).map(enc => (
              <EMSPatientCard key={enc.encounter_id} encounter={enc} showHandoff />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
