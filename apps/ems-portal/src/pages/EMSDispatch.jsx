import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EMSPatientCard from '../components/EMSPatientCard';

export default function EMSDispatch() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [emsEncounters, setEmsEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [dispatchCode, setDispatchCode] = useState('');
  const [sceneAddress, setSceneAddress] = useState('');
  const [unitId, setUnitId] = useState('MEDIC-7');
  const [crewLead, setCrewLead] = useState('Paramedic Davis');

  useEffect(() => {
    Promise.all([
      fetch('/api/patients').then(r => r.json()),
      fetch('/api/ems').then(r => r.json()),
    ]).then(([pat, ems]) => {
      setPatients(pat);
      setEmsEncounters(ems);
      setLoading(false);
    });
  }, []);

  const createEncounter = async (e) => {
    e.preventDefault();
    if (!patientId || !chiefComplaint) return;
    setCreating(true);
    try {
      const res = await fetch('/api/ems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: parseInt(patientId), chief_complaint: chiefComplaint, dispatch_code: dispatchCode, scene_address: sceneAddress, unit_id: unitId, crew_lead: crewLead }),
      });
      const data = await res.json();
      navigate(`/ems/${data.encounter_id}`);
    } catch (err) {
      console.error('Failed to create EMS encounter:', err);
      setCreating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" /></div>;

  const activeEms = emsEncounters.filter(e => e.transport_status !== 'handoff_complete');
  const completedEms = emsEncounters.filter(e => e.transport_status === 'handoff_complete');

  return (
    <div style={{ background: 'linear-gradient(180deg, #0C3547 0%, #1A8FA8 40%, #f0fdf9 100%)' }} className="min-h-[calc(100vh-112px)]">
      <div className="max-w-[1100px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">🚑 EMS Dispatch</h1>
          <p className="text-teal-200 text-sm mt-1">Create and manage EMS encounters with ambient listening</p>
        </div>

        {/* Glass Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <GlassStat value={emsEncounters.length} label="Total" />
          <GlassStat value={activeEms.length} label="Active" color="text-amber-300" />
          <GlassStat value={activeEms.filter(e => e.transport_status === 'transporting').length} label="En Route" color="text-red-300" />
          <GlassStat value={completedEms.length} label="Completed" color="text-green-300" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* New Dispatch Form */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">New EMS Dispatch</h2>
            </div>
            <form onSubmit={createEncounter} className="p-4 space-y-4">
              <div>
                <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                <select id="patient" value={patientId} onChange={e => setPatientId(e.target.value)} className="input w-full" required>
                  <option value="">Select patient...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.gender}, DOB: {p.date_of_birth}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="complaint" className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint</label>
                <input id="complaint" type="text" value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} placeholder="e.g., Chest pain with diaphoresis" className="input w-full" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Code</label>
                  <input type="text" value={dispatchCode} onChange={e => setDispatchCode(e.target.value)} placeholder="e.g., 31-D-2" className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scene Address</label>
                  <input type="text" value={sceneAddress} onChange={e => setSceneAddress(e.target.value)} placeholder="425 Oak Street" className="input w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit ID</label>
                  <input type="text" value={unitId} onChange={e => setUnitId(e.target.value)} className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crew Lead</label>
                  <input type="text" value={crewLead} onChange={e => setCrewLead(e.target.value)} className="input w-full" />
                </div>
              </div>
              <button type="submit" disabled={creating} className="btn-primary w-full">
                {creating ? 'Creating...' : '🚑 Create EMS Encounter & Start'}
              </button>
            </form>
          </div>

          {/* Active EMS Encounters */}
          <div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Active EMS ({activeEms.length})</h2>
              </div>
              <div className="p-4">
                {activeEms.length > 0 ? (
                  <div className="space-y-3">
                    {activeEms.map(enc => (
                      <EMSPatientCard key={enc.encounter_id} encounter={enc} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    No active EMS encounters. Create one to start.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassStat({ value, label, color = 'text-white' }) {
  return (
    <div className="backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center"
      style={{ background: 'rgba(255,255,255,0.1)' }}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-teal-200">{label}</p>
    </div>
  );
}
