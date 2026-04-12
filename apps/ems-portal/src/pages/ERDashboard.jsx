import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useWebSocket from '../hooks/useWebSocket';
import VitalsTimeline from '../components/VitalsTimeline';

export default function ERDashboard() {
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch('/api/ems').then(r => r.json()).then(data => { setEncounters(data); setLoading(false); });
  }, []);

  const { connected } = useWebSocket('er:incoming', useCallback((msg) => {
    switch (msg.type) {
      case 'ems:new_incoming':
        setEncounters(prev => [msg.data, ...prev]); break;
      case 'ems:status_update':
        setEncounters(prev => prev.map(e => e.encounter_id === msg.data.encounterId ? { ...e, transport_status: msg.data.status, eta_minutes: msg.data.eta } : e)); break;
      case 'ems:summary_update':
        setEncounters(prev => prev.map(e => e.encounter_id === msg.data.encounterId ? { ...e, ai_summary: msg.data.summary } : e)); break;
      case 'ems:vitals_update':
        setEncounters(prev => prev.map(e => e.encounter_id === msg.data.encounterId ? { ...e, vitals_timeline: msg.data.vitals } : e)); break;
      case 'ems:handoff_ready':
        setEncounters(prev => prev.map(e => e.encounter_id === msg.data.encounterId ? { ...e, handoff_brief: msg.data.handoffBrief } : e)); break;
    }
  }, []));

  const acceptHandoff = async (encounterId) => {
    await fetch(`/api/ems/${encounterId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'handoff_complete' }) });
    setEncounters(prev => prev.map(e => e.encounter_id === encounterId ? { ...e, transport_status: 'handoff_complete' } : e));
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" /></div>;

  const active = encounters.filter(e => e.transport_status !== 'handoff_complete');
  const completed = encounters.filter(e => e.transport_status === 'handoff_complete');
  const enRoute = active.filter(e => e.transport_status === 'transporting');
  const atED = active.filter(e => e.transport_status === 'arrived');

  const transportStatusConfig = {
    dispatched:   { label: 'Dispatched', color: 'text-purple-600', dot: 'bg-purple-500', ring: '' },
    transporting: { label: 'En Route',   color: 'text-amber-600',  dot: 'bg-amber-500 animate-pulse', ring: '' },
    arrived:      { label: 'At ED',      color: 'text-green-600',  dot: 'bg-green-500', ring: 'ring-1 ring-green-200' },
    handoff_complete: { label: 'Handed Off', color: 'text-gray-500', dot: 'bg-gray-400', ring: '' },
  };

  return (
    <div style={{ background: 'linear-gradient(180deg, #0C3547 0%, #1A8FA8 40%, #f0fdf9 100%)' }} className="min-h-[calc(100vh-112px)]">
      <div className="max-w-[1100px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">🏥 ER Incoming</h1>
            <p className="text-teal-200 text-sm mt-1">Real-time EMS patient tracking — AI-powered summaries</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-sm text-teal-200">{connected ? 'Live' : 'Connecting...'}</span>
          </div>
        </div>

        {/* Glass Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <GlassStat value={active.length} label="Incoming" color="text-red-300" pulse={active.length > 0} />
          <GlassStat value={enRoute.length} label="En Route" color="text-amber-300" />
          <GlassStat value={atED.length} label="At ED" color="text-green-300" />
          <GlassStat value={completed.length} label="Handed Off" color="text-gray-300" />
        </div>

        {/* Active Incoming */}
        {active.length > 0 ? (
          <div className="space-y-2 mb-8">
            {active.map(enc => {
              const ts = transportStatusConfig[enc.transport_status] || transportStatusConfig.dispatched;
              const isExpanded = expanded === enc.encounter_id;

              return (
                <div key={enc.encounter_id} className={`rounded-xl border transition-all bg-white shadow-sm hover:shadow-md ${ts.ring} ${
                  enc.transport_status === 'arrived' ? 'border-green-200' :
                  enc.transport_status === 'transporting' ? 'border-amber-200' :
                  'border-gray-200'
                }`}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : enc.encounter_id)}
                    className="w-full text-left p-4 flex items-center gap-4"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ts.dot}`} />
                    <span className="text-lg flex-shrink-0">🚑</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{enc.first_name} {enc.last_name}</span>
                        {enc.esi_level && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">ESI {enc.esi_level}</span>}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{enc.chief_complaint}</p>
                    </div>
                    <div className="hidden lg:flex items-center gap-3 text-[11px] text-gray-400 flex-shrink-0">
                      {enc.unit_id && <span>Unit: {enc.unit_id}</span>}
                      {enc.eta_minutes && <span className="font-medium text-amber-600">ETA {enc.eta_minutes}min</span>}
                    </div>
                    <span className={`text-[11px] font-medium flex-shrink-0 ${ts.color}`}>{ts.label}</span>
                    <svg className={`w-4 h-4 text-gray-300 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 space-y-3">
                      {/* AI Summary */}
                      {enc.ai_summary && (
                        <div className="rounded-lg p-3 flex gap-3 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-100">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                            <span className="text-white text-xs">🧠</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-1">AI Summary</p>
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{enc.ai_summary.replace(/\*\*/g, '')}</p>
                          </div>
                        </div>
                      )}

                      {/* Vitals */}
                      {enc.vitals_timeline?.length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <h4 className="font-semibold text-gray-700 text-sm mb-2">Vitals Trend</h4>
                          <VitalsTimeline vitals={enc.vitals_timeline} />
                        </div>
                      )}

                      {/* Latest vitals badges */}
                      {enc.latest_vitals && (
                        <div className="flex gap-2">
                          {enc.latest_vitals.bp && <VitalBadge label="BP" value={enc.latest_vitals.bp} />}
                          {enc.latest_vitals.hr && <VitalBadge label="HR" value={enc.latest_vitals.hr} />}
                          {enc.latest_vitals.spo2 && <VitalBadge label="SpO₂" value={`${enc.latest_vitals.spo2}%`} />}
                        </div>
                      )}

                      {/* Handoff brief */}
                      {enc.handoff_brief && (
                        <div className="rounded-lg p-3 bg-green-50 border border-green-100">
                          <h4 className="font-semibold text-green-900 text-sm mb-2">Handoff Brief</h4>
                          <pre className="text-xs text-green-800 whitespace-pre-wrap font-sans">{enc.handoff_brief}</pre>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/er/handoff/${enc.encounter_id}`)}
                          className="px-4 py-2 text-sm font-semibold text-white rounded-xl"
                          style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #0C3547 100%)' }}
                        >
                          View Full Handoff
                        </button>
                        {enc.transport_status === 'arrived' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); acceptHandoff(enc.encounter_id); }}
                            className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors"
                          >
                            ✓ Accept Handoff
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 mb-8">
            <p className="text-white/60 text-lg">No incoming EMS patients</p>
            <p className="text-white/40 text-sm mt-1">Active EMS encounters will appear here in real-time</p>
          </div>
        )}

        {/* Completed handoffs */}
        {completed.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Recent Handoffs</h2>
            </div>
            <div className="p-4 space-y-2">
              {completed.slice(0, 4).map(enc => (
                <div key={enc.encounter_id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-700">{enc.first_name} {enc.last_name}</span>
                    <span className="text-xs text-gray-400 ml-2">{enc.chief_complaint}</span>
                  </div>
                  <span className="text-[11px] text-green-600 font-medium">Handed Off</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GlassStat({ value, label, color = 'text-white', pulse }) {
  return (
    <div className={`backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center ${pulse ? 'animate-pulse' : ''}`}
      style={{ background: 'rgba(255,255,255,0.1)' }}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-teal-200">{label}</p>
    </div>
  );
}

function VitalBadge({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
      <span className="font-medium text-gray-600">{label}</span>
      <span>{value}</span>
    </span>
  );
}
