import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const statusConfig = {
  intake:      { label: 'In Intake',    color: 'text-purple-600', dot: 'bg-purple-500', action: 'Start Encounter', path: id => `/encounter/${id}` },
  waiting:     { label: 'Waiting',      color: 'text-amber-600',  dot: 'bg-amber-500',  action: 'Start Encounter', path: id => `/encounter/${id}` },
  in_progress: { label: 'In Progress',  color: 'text-blue-600',   dot: 'bg-blue-500',   action: 'Continue',        path: id => `/encounter/${id}` },
  charting:    { label: 'Charting',     color: 'text-indigo-600', dot: 'bg-indigo-500',  action: 'Continue Charting', path: id => `/charting/${id}` },
  review:      { label: 'In Review',    color: 'text-cyan-600',   dot: 'bg-cyan-500',   action: 'View Review',     path: id => `/review/${id}` },
  completed:   { label: 'Completed',    color: 'text-green-600',  dot: 'bg-green-500',  action: 'View Summary',    path: id => `/review/${id}` },
};

export default function WaitingRoom() {
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchEncounters();
    const interval = setInterval(fetchEncounters, 10000);
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

  const counts = {
    total: encounters.length,
    waiting: encounters.filter(e => e.status === 'waiting').length,
    inProgress: encounters.filter(e => e.status === 'in_progress').length,
    intake: encounters.filter(e => e.status === 'intake').length,
    completed: encounters.filter(e => e.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(180deg, #0C3547 0%, #1A8FA8 40%, #f0fdf9 100%)' }} className="min-h-[calc(100vh-112px)]">
      <div className="max-w-[1100px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Waiting Room</h1>
            <p className="text-teal-200 text-sm mt-1">
              {counts.waiting} waiting &middot; {counts.inProgress} in progress &middot; {counts.intake} in intake
            </p>
          </div>
          <div className="flex gap-2">
            {['active', 'completed', 'all'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Glass Stats */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <GlassStat value={counts.total} label="Total" />
          <GlassStat value={counts.waiting} label="Waiting" color="text-amber-300" />
          <GlassStat value={counts.inProgress} label="In Progress" color="text-blue-300" />
          <GlassStat value={counts.intake} label="In Intake" color="text-purple-300" />
          <GlassStat value={counts.completed} label="Completed" color="text-green-300" />
        </div>

        {/* Encounter List */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <p className="text-white/60">No encounters to display.</p>
            <a href="/compass" target="_blank" rel="noopener"
              className="inline-block mt-4 px-4 py-2 text-sm font-semibold text-white rounded-xl"
              style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #0C3547 100%)' }}>
              Open Compass to start intake
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(enc => {
              const s = statusConfig[enc.status] || statusConfig.waiting;
              const isExpanded = expandedId === enc.id;
              const age = enc.date_of_birth ? Math.floor((Date.now() - new Date(enc.date_of_birth).getTime()) / 31557600000) : '';

              return (
                <div key={enc.id} className={`rounded-xl border transition-all ${
                  enc.status === 'in_progress' ? 'bg-white border-blue-200 shadow-md ring-1 ring-blue-100' :
                  enc.status === 'completed' ? 'bg-white/90 border-gray-100' :
                  'bg-white border-gray-200 shadow-sm hover:shadow-md'
                }`}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : enc.id)}
                    className="w-full text-left p-4 flex items-center gap-4"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{enc.last_name}, {enc.first_name}</span>
                        {age && <span className="text-[11px] text-gray-400">{age}y {enc.gender}</span>}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">CC: {enc.chief_complaint}</p>
                    </div>
                    {enc.vitals?.bp && (
                      <div className="hidden lg:flex items-center gap-3 text-[11px] text-gray-400 flex-shrink-0">
                        <span>BP {enc.vitals.bp}</span>
                        <span>HR {enc.vitals.hr}</span>
                        <span>SpO₂ {enc.vitals.spo2}</span>
                      </div>
                    )}
                    <span className={`text-[11px] font-medium flex-shrink-0 ${s.color}`}>{s.label}</span>
                    <svg className={`w-4 h-4 text-gray-300 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 flex gap-3">
                      {(enc.intake_summary || enc.assessment) && (
                        <div className={`flex-1 rounded-lg p-3 flex gap-3 ${
                          enc.status === 'completed' ? 'bg-green-50 border border-green-100' : 'bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-100'
                        }`}>
                          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                            <span className="text-white text-xs">🧠</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-1">COMPASS AI</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{enc.intake_summary || enc.assessment}</p>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => navigate(s.path(enc.id))}
                        className="px-4 py-2 text-sm font-semibold text-white rounded-xl self-start flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #0C3547 100%)' }}
                      >
                        {s.action}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
