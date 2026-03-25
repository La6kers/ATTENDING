import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PatientCard from '../components/PatientCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState([]);
  const [patients, setPatients] = useState([]);
  const [emsCount, setEmsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/encounters').then(r => r.json()),
      fetch('/api/patients').then(r => r.json()),
      fetch('/api/ems').then(r => r.json()).catch(() => []),
    ]).then(([enc, pat, ems]) => {
      setEncounters(enc);
      setPatients(pat);
      setEmsCount(ems.filter(e => e.transport_status !== 'handoff_complete').length);
      setLoading(false);
    });
  }, []);

  const stats = {
    total: patients.length,
    active: encounters.filter(e => !['completed'].includes(e.status)).length,
    completed: encounters.filter(e => e.status === 'completed').length,
    waiting: encounters.filter(e => e.status === 'waiting').length,
  };

  const recentActive = encounters
    .filter(e => e.status !== 'completed')
    .slice(0, 6);

  const recentCompleted = encounters
    .filter(e => e.status === 'completed')
    .slice(0, 3);

  if (loading) return <div className="p-8 text-gray-500">Loading dashboard...</div>;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">ATTENDING Medical AI &middot; Seed Demo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Patients" value={stats.total} color="attending" />
        <StatCard label="Active Encounters" value={stats.active} color="blue" />
        <StatCard label="Waiting" value={stats.waiting} color="orange" />
        <StatCard label="Completed Today" value={stats.completed} color="green" />
        <div
          onClick={() => navigate('/er')}
          className="rounded-xl border p-5 bg-red-50 text-red-700 border-red-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <p className="text-3xl font-bold">{emsCount}</p>
          <p className="text-sm mt-1 opacity-80">🚑 Incoming EMS</p>
        </div>
      </div>

      {/* Active encounters */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Encounters</h2>
          <button onClick={() => navigate('/waiting-room')} className="text-sm text-attending-600 hover:text-attending-700 font-medium">
            View all &rarr;
          </button>
        </div>
        {recentActive.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentActive.map(enc => (
              <PatientCard key={enc.id} encounter={enc} />
            ))}
          </div>
        ) : (
          <div className="card text-center text-gray-500 py-8">
            <p>No active encounters.</p>
            <a href="/compass" target="_blank" rel="noopener" className="btn-compass inline-block mt-3">
              Open Compass Intake
            </a>
          </div>
        )}
      </div>

      {/* Recently completed */}
      {recentCompleted.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recently Completed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentCompleted.map(enc => (
              <PatientCard key={enc.id} encounter={enc} />
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-8 card bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="flex gap-3">
          <a href="/compass" target="_blank" rel="noopener" className="btn-compass">
            New Patient Intake
          </a>
          <button onClick={() => navigate('/waiting-room')} className="btn-primary">
            Waiting Room
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    attending: 'bg-attending-50 text-attending-700 border-attending-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </div>
  );
}
