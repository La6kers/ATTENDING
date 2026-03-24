import { useState, useEffect } from 'react';
import PatientCard from '../components/PatientCard';

export default function WaitingRoom() {
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    fetchEncounters();
    const interval = setInterval(fetchEncounters, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchEncounters = async () => {
    const res = await fetch('/api/encounters');
    const data = await res.json();
    setEncounters(data);
    setLoading(false);
  };

  const activeStatuses = ['intake', 'waiting', 'in_progress', 'charting', 'review'];
  const filtered = filter === 'active'
    ? encounters.filter(e => activeStatuses.includes(e.status))
    : filter === 'completed'
    ? encounters.filter(e => e.status === 'completed')
    : encounters;

  const waiting = encounters.filter(e => e.status === 'waiting');
  const inProgress = encounters.filter(e => e.status === 'in_progress');
  const inIntake = encounters.filter(e => e.status === 'intake');

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waiting Room</h1>
          <p className="text-gray-500 mt-1">
            {waiting.length} waiting &middot; {inProgress.length} in progress &middot; {inIntake.length} in intake
          </p>
        </div>
        <div className="flex gap-2">
          {['active', 'completed', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-attending-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading encounters...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No encounters to display.</p>
          <a href="/compass" target="_blank" rel="noopener" className="btn-compass inline-block mt-4">
            Open Compass to start intake
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(enc => (
            <PatientCard key={enc.id} encounter={enc} />
          ))}
        </div>
      )}
    </div>
  );
}
