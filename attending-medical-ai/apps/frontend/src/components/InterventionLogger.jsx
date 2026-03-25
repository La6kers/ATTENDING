import { useState } from 'react';

const QUICK_INTERVENTIONS = [
  { label: 'IV Access', icon: '💉' },
  { label: 'O2 Applied', icon: '🫁' },
  { label: 'Cardiac Monitor', icon: '📊' },
  { label: '12-Lead ECG', icon: '❤️' },
  { label: 'Splint', icon: '🦴' },
  { label: 'C-Collar', icon: '🔒' },
  { label: 'Nebulizer', icon: '💨' },
  { label: 'Wound Care', icon: '🩹' },
  { label: 'CPR', icon: '🫀' },
  { label: 'Defibrillation', icon: '⚡' },
  { label: 'Intubation', icon: '🔧' },
  { label: 'Tourniquet', icon: '🔴' },
];

export default function InterventionLogger({ encounterId, onLog }) {
  const [logging, setLogging] = useState(null);
  const [customIntervention, setCustomIntervention] = useState('');

  const logIntervention = async (description) => {
    setLogging(description);
    const time = new Date().toTimeString().slice(0, 5);
    try {
      await fetch(`/api/ems/${encounterId}/intervention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, time }),
      });
      if (onLog) onLog(description);
    } catch (e) {
      console.error('Failed to log intervention:', e);
    }
    setLogging(null);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {QUICK_INTERVENTIONS.map(({ label, icon }) => (
          <button
            key={label}
            onClick={() => logIntervention(label)}
            disabled={logging === label}
            className={`
              py-2 px-2 rounded-lg text-xs font-medium border transition-all
              ${logging === label
                ? 'bg-green-100 border-green-400 text-green-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-attending-300 active:bg-attending-50'
              }
            `}
          >
            <span className="block text-lg mb-0.5">{icon}</span>
            {logging === label ? '✓ Logged' : label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={customIntervention}
          onChange={e => setCustomIntervention(e.target.value)}
          placeholder="Custom intervention..."
          className="input flex-1 text-sm"
          onKeyDown={e => {
            if (e.key === 'Enter' && customIntervention.trim()) {
              logIntervention(customIntervention.trim());
              setCustomIntervention('');
            }
          }}
        />
        <button
          onClick={() => {
            if (customIntervention.trim()) {
              logIntervention(customIntervention.trim());
              setCustomIntervention('');
            }
          }}
          className="btn-primary text-sm"
          disabled={!customIntervention.trim()}
        >
          Log
        </button>
      </div>
    </div>
  );
}
