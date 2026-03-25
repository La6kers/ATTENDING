import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EMSPatientCard from '../components/EMSPatientCard';

export default function EMSDispatch() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [emsEncounters, setEmsEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
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
        body: JSON.stringify({
          patient_id: parseInt(patientId),
          chief_complaint: chiefComplaint,
          dispatch_code: dispatchCode,
          scene_address: sceneAddress,
          unit_id: unitId,
          crew_lead: crewLead,
        }),
      });
      const data = await res.json();
      navigate(`/ems/${data.encounter_id}`);
    } catch (err) {
      console.error('Failed to create EMS encounter:', err);
      setCreating(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  const activeEms = emsEncounters.filter(e => e.transport_status !== 'handoff_complete');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span>🚑</span> EMS Dispatch
        </h1>
        <p className="text-gray-500 mt-1">Create and manage EMS encounters with ambient listening</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* New Dispatch Form */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New EMS Dispatch</h2>
          <form onSubmit={createEncounter} className="space-y-4">
            <div>
              <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
              <select
                id="patient"
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                className="input w-full"
                required
              >
                <option value="">Select patient...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} — {p.gender}, DOB: {p.date_of_birth}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="complaint" className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint</label>
              <input
                id="complaint"
                type="text"
                value={chiefComplaint}
                onChange={e => setChiefComplaint(e.target.value)}
                placeholder="e.g., Chest pain with diaphoresis"
                className="input w-full"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dispatch-code" className="block text-sm font-medium text-gray-700 mb-1">Dispatch Code</label>
                <input
                  id="dispatch-code"
                  type="text"
                  value={dispatchCode}
                  onChange={e => setDispatchCode(e.target.value)}
                  placeholder="e.g., 31-D-2"
                  className="input w-full"
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Scene Address</label>
                <input
                  id="address"
                  type="text"
                  value={sceneAddress}
                  onChange={e => setSceneAddress(e.target.value)}
                  placeholder="425 Oak Street"
                  className="input w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">Unit ID</label>
                <input id="unit" type="text" value={unitId} onChange={e => setUnitId(e.target.value)} className="input w-full" />
              </div>
              <div>
                <label htmlFor="crew" className="block text-sm font-medium text-gray-700 mb-1">Crew Lead</label>
                <input id="crew" type="text" value={crewLead} onChange={e => setCrewLead(e.target.value)} className="input w-full" />
              </div>
            </div>

            <button type="submit" disabled={creating} className="btn-primary w-full">
              {creating ? 'Creating...' : '🚑 Create EMS Encounter & Start'}
            </button>
          </form>
        </div>

        {/* Active EMS Encounters */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Active EMS Encounters ({activeEms.length})
          </h2>
          {activeEms.length > 0 ? (
            <div className="space-y-3">
              {activeEms.map(enc => (
                <EMSPatientCard key={enc.encounter_id} encounter={enc} />
              ))}
            </div>
          ) : (
            <div className="card text-center text-gray-500 py-8">
              No active EMS encounters. Create one to start.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
