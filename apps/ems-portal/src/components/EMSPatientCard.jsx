import { useNavigate } from 'react-router-dom';

const STATUS_STYLES = {
  dispatched:        { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Dispatched' },
  on_scene:          { bg: 'bg-red-100', text: 'text-red-800', label: 'On Scene' },
  treating:          { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Treating' },
  transporting:      { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Transporting' },
  arrived:           { bg: 'bg-green-100', text: 'text-green-800', label: 'Arrived at ED' },
  handoff_complete:  { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Handoff Complete' },
};

const TRIAGE_COLORS = {
  '1': 'bg-red-600 text-white',
  '2': 'bg-orange-500 text-white',
  '3': 'bg-yellow-400 text-gray-900',
  '4': 'bg-green-500 text-white',
  '5': 'bg-blue-500 text-white',
};

export default function EMSPatientCard({ encounter, showHandoff = false }) {
  const navigate = useNavigate();
  const status = STATUS_STYLES[encounter.transport_status] || STATUS_STYLES.dispatched;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
         onClick={() => navigate(showHandoff ? `/er/handoff/${encounter.encounter_id}` : `/ems/${encounter.encounter_id}`)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚑</span>
          <h3 className="font-semibold text-gray-900">
            {encounter.first_name} {encounter.last_name}
          </h3>
          {encounter.triage_level && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TRIAGE_COLORS[encounter.triage_level] || ''}`}>
              ESI {encounter.triage_level}
            </span>
          )}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </div>

      {/* Chief complaint */}
      <p className="text-sm text-gray-600 mb-2">{encounter.chief_complaint || 'No chief complaint'}</p>

      {/* Details row */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>Unit: {encounter.unit_id}</span>
        <span>Lead: {encounter.crew_lead}</span>
        {encounter.eta_minutes != null && encounter.transport_status === 'transporting' && (
          <span className="text-amber-600 font-semibold">ETA: {encounter.eta_minutes} min</span>
        )}
      </div>

      {/* AI Summary snippet */}
      {encounter.ai_summary && (
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800 line-clamp-3">
          <span className="font-semibold">AI Summary: </span>
          {typeof encounter.ai_summary === 'string'
            ? encounter.ai_summary.replace(/\*\*/g, '').substring(0, 200)
            : 'Processing...'
          }
          {encounter.ai_summary.length > 200 && '...'}
        </div>
      )}

      {/* Latest vitals */}
      {encounter.vitals_timeline?.length > 0 && (
        <div className="mt-2 flex gap-3 text-xs text-gray-600">
          {(() => {
            const latest = encounter.vitals_timeline[encounter.vitals_timeline.length - 1];
            return (
              <>
                {latest.bp && <span>BP: {latest.bp}</span>}
                {latest.hr && <span>HR: {latest.hr}</span>}
                {latest.spo2 && <span>SpO2: {latest.spo2}%</span>}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
