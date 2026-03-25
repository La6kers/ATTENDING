import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PatientCard from '../components/PatientCard';

// ============================================================
// Work Queue Sidebar Links
// ============================================================

const WORK_LINKS = [
  { id: 'inbox',       label: 'Inbox',         badge: 7, urgent: 1, color: '#14b8a6', icon: '📥', to: '/waiting-room', ready: true },
  { id: 'refills',     label: 'Rx Refills',    badge: 5, urgent: 0, color: '#0F5F76', icon: '💊', to: null },
  { id: 'labs',        label: 'Lab Results',    badge: 8, urgent: 1, color: '#f59e0b', icon: '🧪', to: null },
  { id: 'imaging',     label: 'Imaging',        badge: 3, urgent: 0, color: '#06b6d4', icon: '🖼️', to: null },
  { id: 'referrals',   label: 'Referrals',      badge: 2, urgent: 0, color: '#e07a5f', icon: '↔️', to: null },
  { id: 'charts',      label: "CC'd Charts",    badge: 4, urgent: 0, color: '#1A8FA8', icon: '📄', to: null },
  { id: 'incomplete',  label: 'Incomplete',      badge: 3, urgent: 1, color: '#f97316', icon: '⏰', to: null },
  { id: 'schedule',    label: 'Schedule',        badge: 0, urgent: 0, color: '#1A8FA8', icon: '📅', to: '/waiting-room', ready: true },
  { id: 'assessments', label: 'Assessments',     badge: 5, urgent: 0, color: '#25B8A9', icon: '📋', to: '/waiting-room', ready: true },
  { id: 'copilot',     label: 'AI Copilot',      badge: 0, urgent: 0, color: '#c8a44e', icon: '⚡', to: '/compass', external: true, ready: true },
];

// ============================================================
// Dashboard
// ============================================================

export default function Dashboard() {
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState([]);
  const [patients, setPatients] = useState([]);
  const [emsCount, setEmsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

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

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const stats = {
    total: encounters.filter(e => e.status !== 'cancelled').length || patients.length,
    completed: encounters.filter(e => e.status === 'completed').length,
    active: encounters.filter(e => e.status === 'in_progress').length,
    waiting: encounters.filter(e => ['waiting', 'intake'].includes(e.status)).length,
    redFlags: encounters.filter(e => e.red_flags && e.status !== 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex" style={{ height: 'calc(100vh - 112px)' }}>

      {/* ═══ SIDEBAR: Work Queue ═══ */}
      <div
        className="w-[240px] flex-shrink-0 border-r border-white/10 flex flex-col"
        style={{ background: 'linear-gradient(180deg, #0C3547 0%, #0F5F76 100%)' }}
      >
        {/* Sidebar Header */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
              <span className="text-white text-lg">📋</span>
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Work Queue</h2>
              <p className="text-[10px]" style={{ color: 'rgba(125, 211, 200, 0.7)' }}>Action Items</p>
            </div>
          </div>
        </div>

        {/* Links */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto">
          {WORK_LINKS.map(link => {
            const isDisabled = !link.to;
            const inner = (
              <>
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-5 rounded-full" style={{ background: link.color, opacity: isDisabled ? 0.3 : 0.7 }} />
                  <span className="text-sm">{link.icon}</span>
                  <span className={`font-medium text-[13px] transition-colors ${isDisabled ? 'opacity-50' : 'group-hover:text-white'}`}>{link.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isDisabled && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/30">Soon</span>
                  )}
                  {!isDisabled && link.urgent > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                  {!isDisabled && link.badge > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded-full font-semibold"
                      style={{ background: 'rgba(26,143,168,0.5)', color: 'white' }}>
                      {link.badge}
                    </span>
                  )}
                </div>
              </>
            );
            const cls = `flex items-center justify-between px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all w-full group ${isDisabled ? 'cursor-default opacity-70' : 'hover:bg-white/10'}`;
            if (link.external) {
              return (
                <a key={link.id} href={link.to} target="_blank" rel="noopener" className={cls} style={{ color: 'rgba(200, 230, 230, 0.85)' }}>
                  {inner}
                </a>
              );
            }
            return (
              <button key={link.id} onClick={() => link.to && navigate(link.to)} className={cls} style={{ color: 'rgba(200, 230, 230, 0.85)' }}>
                {inner}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Stats */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-white">{stats.total}</p>
              <p className="text-[9px]" style={{ color: 'rgba(125, 211, 200, 0.7)' }}>Today</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-green-300">{stats.completed}</p>
              <p className="text-[9px]" style={{ color: 'rgba(125, 211, 200, 0.7)' }}>Done</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MAIN: Schedule ═══ */}
      <div className="flex-1 overflow-y-auto" style={{ background: 'linear-gradient(180deg, #0C3547 0%, #1A8FA8 40%, #f0fdf9 100%)' }}>
        <div className="max-w-[1100px] mx-auto px-6 py-6">

          {/* Welcome */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Good {greeting}, Dr. Isbell</h1>
            <p className="text-teal-200 text-sm mt-1">{dateStr}</p>
          </div>

          {/* Quick Stats (glass cards) */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            <GlassStat value={stats.total} label="Patients" />
            <GlassStat value={stats.completed} label="Completed" color="text-green-300" />
            <GlassStat value={stats.active} label="In Progress" color="text-blue-300" />
            <GlassStat value={stats.waiting} label="Waiting" color="text-amber-300" />
            {emsCount > 0 ? (
              <div
                className="backdrop-blur-sm rounded-xl p-3 border text-center cursor-pointer hover:bg-red-500/30 transition-all"
                style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                onClick={() => navigate('/er')}
              >
                <p className="text-2xl font-bold text-red-300">{emsCount}</p>
                <p className="text-[11px] text-red-200">🚑 EMS</p>
              </div>
            ) : (
              <GlassStat value={stats.redFlags} label="Red Flags" color={stats.redFlags > 0 ? 'text-red-300' : 'text-gray-300'} />
            )}
          </div>

          {/* Schedule Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-white text-lg">📅</span>
              <h2 className="text-lg font-semibold text-white">Today's Schedule</h2>
            </div>
            <button
              onClick={() => navigate('/waiting-room')}
              className="text-teal-200 hover:text-white text-sm flex items-center gap-1 transition-colors"
            >
              Full Schedule →
            </button>
          </div>

          {/* Encounter List */}
          <div className="space-y-2">
            {encounters.map(enc => {
              const isExpanded = expandedId === enc.id;
              const statusConfig = {
                completed: { label: 'Done', color: 'text-green-600', bg: 'bg-white/90 border-gray-100' },
                in_progress: { label: 'In Room', color: 'text-blue-600', bg: 'bg-white border-blue-200 shadow-md ring-1 ring-blue-100' },
                waiting: { label: 'Waiting', color: 'text-amber-600', bg: 'bg-white border-gray-200 shadow-sm hover:shadow-md' },
                intake: { label: 'In Intake', color: 'text-purple-600', bg: 'bg-white border-gray-200 shadow-sm hover:shadow-md' },
                charting: { label: 'Charting', color: 'text-indigo-600', bg: 'bg-white border-gray-200 shadow-sm' },
                review: { label: 'Review', color: 'text-cyan-600', bg: 'bg-white border-gray-200 shadow-sm' },
              };
              const s = statusConfig[enc.status] || statusConfig.waiting;

              return (
                <div key={enc.id} className={`rounded-xl border transition-all ${s.bg}`}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : enc.id)}
                    className="w-full text-left p-4 flex items-center gap-4"
                  >
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      enc.status === 'completed' ? 'bg-green-500' :
                      enc.status === 'in_progress' ? 'bg-blue-500' :
                      enc.status === 'waiting' ? 'bg-amber-500' :
                      'bg-gray-400'
                    }`} />

                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {enc.last_name}, {enc.first_name}
                        </span>
                        {enc.date_of_birth && (
                          <span className="text-[11px] text-gray-400">
                            {Math.floor((Date.now() - new Date(enc.date_of_birth).getTime()) / 31557600000)}y {enc.gender}
                          </span>
                        )}
                        {enc.red_flags && enc.status !== 'completed' && (
                          <span className="text-red-500 text-xs animate-pulse">⚠️</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">CC: {enc.chief_complaint}</p>
                    </div>

                    {/* Vitals summary */}
                    {enc.vitals?.bp && (
                      <div className="hidden lg:flex items-center gap-3 text-[11px] text-gray-400 flex-shrink-0">
                        <span>BP {enc.vitals.bp}</span>
                        <span>HR {enc.vitals.hr}</span>
                        <span>SpO₂ {enc.vitals.spo2}</span>
                      </div>
                    )}

                    {/* Status */}
                    <span className={`text-[11px] font-medium flex-shrink-0 ${s.color}`}>{s.label}</span>

                    {/* Chevron */}
                    <svg className={`w-4 h-4 text-gray-300 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>

                  {/* Expanded AI Summary */}
                  {isExpanded && (enc.intake_summary || enc.assessment) && (
                    <div className="px-4 pb-4 pt-0">
                      <div className={`rounded-lg p-3 flex gap-3 ${
                        enc.status === 'completed'
                          ? 'bg-green-50 border border-green-100'
                          : 'bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-100'
                      }`}>
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' }}>
                            <span className="text-white text-xs">🧠</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-1">
                            {enc.status === 'completed' ? 'COMPASS Visit Summary' : 'COMPASS AI Intelligence'}
                          </p>
                          <p className="text-xs text-gray-700 leading-relaxed">{enc.intake_summary || enc.assessment}</p>
                          {enc.status !== 'completed' && (
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => navigate(`/encounter/${enc.id}`)}
                                className="px-3 py-1.5 text-[11px] font-semibold text-white rounded-lg transition-colors"
                                style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #0C3547 100%)' }}
                              >
                                {enc.status === 'in_progress' ? 'Continue Visit' : 'Start Visit'}
                              </button>
                              <button
                                onClick={() => navigate(`/charting/${enc.id}`)}
                                className="px-3 py-1.5 text-[11px] font-semibold text-teal-700 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                              >
                                View Chart
                              </button>
                            </div>
                          )}
                          {enc.status === 'completed' && (
                            <button
                              onClick={() => navigate(`/review/${enc.id}`)}
                              className="mt-2 px-3 py-1.5 text-[11px] font-semibold text-teal-700 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                            >
                              View Summary
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* AI Insights Footer */}
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #0C3547 100%)' }}>
                <span className="text-2xl">🧠</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900">COMPASS AI Insights</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {stats.redFlags} patient{stats.redFlags !== 1 ? 's' : ''} with red flags.
                  {' '}{stats.waiting} awaiting evaluation with pre-visit intelligence ready.
                </p>
              </div>
              <a
                href="/compass"
                target="_blank"
                rel="noopener"
                className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #1A8FA8 0%, #0C3547 100%)' }}
              >
                ⚡ AI Copilot
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Glass Stat Card
// ============================================================

function GlassStat({ value, label, color = 'text-white' }) {
  return (
    <div className="backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center"
      style={{ background: 'rgba(255,255,255,0.1)' }}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-teal-200">{label}</p>
    </div>
  );
}
