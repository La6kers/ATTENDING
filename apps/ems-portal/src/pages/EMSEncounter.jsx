import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAmbientListener from '../hooks/useAmbientListener';
import useWebSocket from '../hooks/useWebSocket';
import TranscriptViewer from '../components/TranscriptViewer';
import VitalsTimeline from '../components/VitalsTimeline';
import InterventionLogger from '../components/InterventionLogger';
import { DEMO_EMS_TRANSCRIPT } from '../data/demoEMSTranscript';

const STATUS_ORDER = ['dispatched', 'on_scene', 'treating', 'transporting', 'arrived', 'handoff_complete'];
const STATUS_LABELS = {
  dispatched: 'Dispatched', on_scene: 'On Scene', treating: 'Treating',
  transporting: 'Transporting', arrived: 'Arrived at ED', handoff_complete: 'Handoff Complete',
};

export default function EMSEncounter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [generatingHandoff, setGeneratingHandoff] = useState(false);
  const batchRef = useRef([]);
  const batchTimerRef = useRef(null);

  // Fetch encounter data
  useEffect(() => {
    fetch(`/api/ems/${id}`)
      .then(r => r.json())
      .then(data => {
        setEncounter(data);
        setAiSummary(data.ai_summary || '');
        setLoading(false);
      });
  }, [id]);

  // WebSocket for real-time updates
  useWebSocket(`ems:${id}`, useCallback((msg) => {
    if (msg.type === 'ems:summary_update') {
      setAiSummary(msg.data.summary);
    }
    if (msg.type === 'ems:vitals_update') {
      setEncounter(prev => prev ? { ...prev, vitals_timeline: msg.data.vitals } : prev);
    }
    if (msg.type === 'ems:status_update') {
      setEncounter(prev => prev ? { ...prev, transport_status: msg.data.status } : prev);
    }
  }, []));

  // Batch transcript chunks and send every 15s
  const flushBatch = useCallback(async () => {
    if (batchRef.current.length === 0) return;
    const text = batchRef.current.map(c => c.text).join(' ');
    const timestamp = batchRef.current[0].timestamp;
    batchRef.current = [];

    try {
      const res = await fetch(`/api/ems/${id}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, timestamp }),
      });
      const data = await res.json();
      // AI summary will arrive via WebSocket
    } catch (e) {
      console.error('Transcript send error:', e);
    }
  }, [id]);

  const onTranscript = useCallback((chunk) => {
    batchRef.current.push(chunk);
    // Flush every 15 seconds or after 5 chunks
    if (batchRef.current.length >= 5) {
      flushBatch();
    } else if (!batchTimerRef.current) {
      batchTimerRef.current = setTimeout(() => {
        flushBatch();
        batchTimerRef.current = null;
      }, 15000);
    }
  }, [flushBatch]);

  const listener = useAmbientListener({
    onTranscript,
    demoTranscript: DEMO_EMS_TRANSCRIPT,
  });

  // Status transition
  const advanceStatus = async () => {
    if (!encounter) return;
    const currentIdx = STATUS_ORDER.indexOf(encounter.transport_status);
    if (currentIdx >= STATUS_ORDER.length - 1) return;
    const nextStatus = STATUS_ORDER[currentIdx + 1];

    try {
      await fetch(`/api/ems/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      setEncounter(prev => prev ? { ...prev, transport_status: nextStatus } : prev);
    } catch (e) {
      console.error('Status transition error:', e);
    }
  };

  // Generate handoff
  const generateHandoff = async () => {
    setGeneratingHandoff(true);
    // Flush any pending transcript
    await flushBatch();
    try {
      const res = await fetch(`/api/ems/${id}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setEncounter(prev => prev ? { ...prev, handoff_brief: data.handoff_brief } : prev);
    } catch (e) {
      console.error('Handoff generation error:', e);
    }
    setGeneratingHandoff(false);
  };

  if (loading) return <div className="p-8 text-white/60 text-center">Loading EMS encounter...</div>;
  if (!encounter) return <div className="p-8 text-red-300 text-center">Encounter not found.</div>;

  const currentIdx = STATUS_ORDER.indexOf(encounter.transport_status);
  const nextStatus = currentIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIdx + 1] : null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🚑</span>
            EMS — {encounter.first_name} {encounter.last_name}
          </h1>
          <p className="text-sm text-gray-500">
            Unit {encounter.unit_id} &middot; {encounter.crew_lead} &middot; {encounter.dispatch_code}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => listener.setMode('live')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                listener.mode === 'live' ? 'bg-white shadow text-red-700' : 'text-gray-500'
              }`}
            >
              🎙️ Live Mic
            </button>
            <button
              onClick={() => listener.setMode('demo')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                listener.mode === 'demo' ? 'bg-white shadow text-attending-700' : 'text-gray-500'
              }`}
            >
              ▶️ Demo Playback
            </button>
          </div>

          <button
            onClick={listener.isListening ? listener.stop : listener.start}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              listener.isListening
                ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {listener.isListening ? '⏹ Stop Listening' : '▶ Start Listening'}
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 mb-6 bg-gray-50 rounded-lg p-3">
        {STATUS_ORDER.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`
              px-3 py-1 rounded-full text-xs font-medium
              ${i < currentIdx ? 'bg-green-100 text-green-700' : ''}
              ${i === currentIdx ? 'bg-red-100 text-red-700 ring-2 ring-red-400' : ''}
              ${i > currentIdx ? 'bg-gray-100 text-gray-400' : ''}
            `}>
              {STATUS_LABELS[s]}
            </div>
            {i < STATUS_ORDER.length - 1 && <span className="mx-1 text-gray-300">→</span>}
          </div>
        ))}
        {nextStatus && (
          <button onClick={advanceStatus} className="ml-auto btn-primary text-xs">
            Advance → {STATUS_LABELS[nextStatus]}
          </button>
        )}
      </div>

      {listener.error && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {listener.error}
        </div>
      )}

      {/* Three-column layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Patient info + Interventions */}
        <div className="col-span-3 space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Patient</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Name:</span> {encounter.first_name} {encounter.last_name}</p>
              <p><span className="text-gray-500">DOB:</span> {encounter.date_of_birth}</p>
              <p><span className="text-gray-500">Gender:</span> {encounter.gender}</p>
              {encounter.allergies?.length > 0 && (
                <p><span className="text-gray-500">Allergies:</span> <span className="text-red-600 font-medium">{encounter.allergies.join(', ')}</span></p>
              )}
              {encounter.medications?.length > 0 && (
                <p><span className="text-gray-500">Medications:</span> {encounter.medications.join(', ')}</p>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Scene Info</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Address:</span> {encounter.scene_address}</p>
              <p><span className="text-gray-500">Dispatch:</span> {encounter.dispatch_code}</p>
              <p><span className="text-gray-500">Chief Complaint:</span> {encounter.chief_complaint}</p>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Interventions</h3>
            <InterventionLogger
              encounterId={id}
              onLog={(desc) => {
                setEncounter(prev => prev ? {
                  ...prev,
                  interventions: [...(prev.interventions || []), desc]
                } : prev);
              }}
            />
          </div>
        </div>

        {/* Center: Transcript */}
        <div className="col-span-5 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Live Transcript</h3>
              {listener.isListening && (
                <span className="flex items-center gap-1.5 text-xs text-red-600">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Recording
                </span>
              )}
            </div>
            <TranscriptViewer
              transcript={listener.transcript}
              interimText={listener.interimText}
              isListening={listener.isListening}
            />
          </div>

          {/* Medication entry */}
          <MedicationEntry encounterId={id} onLog={(med) => {
            setEncounter(prev => prev ? {
              ...prev,
              medications_given: [...(prev.medications_given || []), med]
            } : prev);
          }} />

          {/* Quick vitals entry */}
          <VitalsEntry encounterId={id} onLog={(v) => {
            setEncounter(prev => prev ? {
              ...prev,
              vitals_timeline: [...(prev.vitals_timeline || []), v]
            } : prev);
          }} />
        </div>

        {/* Right: AI Summary + Vitals Timeline */}
        <div className="col-span-4 space-y-4">
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                <span>🤖</span> AI Summary
              </h3>
              <span className="text-xs text-blue-500">Updates in real-time</span>
            </div>
            <div className="prose prose-sm max-w-none text-blue-900">
              {aiSummary ? (
                <div className="whitespace-pre-wrap text-sm">{aiSummary.replace(/\*\*/g, '')}</div>
              ) : (
                <p className="italic text-blue-400">AI summary will appear as transcript is processed...</p>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Vitals Timeline</h3>
            <VitalsTimeline vitals={encounter.vitals_timeline} />
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2">Interventions Performed</h3>
            {encounter.interventions?.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {encounter.interventions.map((inv, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {inv}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm italic">None logged yet.</p>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2">Medications Given</h3>
            {encounter.medications_given?.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {encounter.medications_given.map((med, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-blue-500">💊</span>
                    {med.name} {med.dose} {med.route} @ {med.time}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm italic">None given yet.</p>
            )}
          </div>

          {/* Handoff brief */}
          {(encounter.transport_status === 'arrived' || encounter.transport_status === 'transporting') && (
            <div className="card border-green-200 bg-green-50">
              <h3 className="font-semibold text-green-900 mb-2">Handoff Brief</h3>
              {encounter.handoff_brief ? (
                <div className="prose prose-sm max-w-none text-green-900 whitespace-pre-wrap text-xs">
                  {encounter.handoff_brief}
                </div>
              ) : (
                <button
                  onClick={generateHandoff}
                  disabled={generatingHandoff}
                  className="btn-primary w-full bg-green-600 hover:bg-green-700"
                >
                  {generatingHandoff ? 'Generating Handoff Brief...' : '📋 Generate Handoff Brief'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline sub-components
function MedicationEntry({ encounterId, onLog }) {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [route, setRoute] = useState('IV');

  const log = async () => {
    if (!name || !dose) return;
    const time = new Date().toTimeString().slice(0, 5);
    const med = { name, dose, route, time };
    try {
      // Update via the general PUT endpoint
      const res = await fetch(`/api/ems/${encounterId}`);
      const data = await res.json();
      const meds = [...(data.medications_given || []), med];
      await fetch(`/api/ems/${encounterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medications_given: meds }),
      });
      if (onLog) onLog(med);
      setName(''); setDose('');
    } catch (e) {
      console.error('Med log error:', e);
    }
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-3">Log Medication</h3>
      <div className="flex gap-2">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Medication" className="input flex-1 text-sm" />
        <input type="text" value={dose} onChange={e => setDose(e.target.value)} placeholder="Dose" className="input w-24 text-sm" />
        <select value={route} onChange={e => setRoute(e.target.value)} className="input w-20 text-sm">
          <option>IV</option><option>PO</option><option>SL</option><option>IM</option><option>IN</option><option>Neb</option><option>IO</option>
        </select>
        <button onClick={log} disabled={!name || !dose} className="btn-primary text-sm">Log</button>
      </div>
    </div>
  );
}

function VitalsEntry({ encounterId, onLog }) {
  const [bp, setBp] = useState('');
  const [hr, setHr] = useState('');
  const [rr, setRr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [gcs, setGcs] = useState('15');
  const [pain, setPain] = useState('');

  const log = async () => {
    const time = new Date().toTimeString().slice(0, 5);
    const vitals = {
      time, bp, hr: hr ? parseInt(hr) : null, rr: rr ? parseInt(rr) : null,
      spo2: spo2 ? parseInt(spo2) : null, gcs: gcs ? parseInt(gcs) : null,
      pain: pain ? parseInt(pain) : null,
    };
    try {
      await fetch(`/api/ems/${encounterId}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vitals),
      });
      if (onLog) onLog(vitals);
      setBp(''); setHr(''); setRr(''); setSpo2(''); setPain('');
    } catch (e) {
      console.error('Vitals log error:', e);
    }
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-3">Log Vitals</h3>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <input type="text" value={bp} onChange={e => setBp(e.target.value)} placeholder="BP (120/80)" className="input text-sm" />
        <input type="number" value={hr} onChange={e => setHr(e.target.value)} placeholder="HR" className="input text-sm" />
        <input type="number" value={rr} onChange={e => setRr(e.target.value)} placeholder="RR" className="input text-sm" />
        <input type="number" value={spo2} onChange={e => setSpo2(e.target.value)} placeholder="SpO2" className="input text-sm" />
        <input type="number" value={gcs} onChange={e => setGcs(e.target.value)} placeholder="GCS" className="input text-sm" />
        <input type="number" value={pain} onChange={e => setPain(e.target.value)} placeholder="Pain (0-10)" className="input text-sm" />
      </div>
      <button onClick={log} className="btn-primary text-sm w-full">Record Vitals</button>
    </div>
  );
}
