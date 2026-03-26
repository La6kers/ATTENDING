/**
 * Compact vitals timeline with trend indicators.
 */
export default function VitalsTimeline({ vitals = [] }) {
  if (!vitals.length) {
    return <p className="text-gray-400 text-sm italic">No vitals recorded yet.</p>;
  }

  const trend = (current, previous, inverse = false) => {
    if (!previous) return '';
    const diff = current - previous;
    if (Math.abs(diff) < 2) return '→';
    // For most vitals, decreasing is good (inverse=false means lower=better is not default)
    if (inverse) return diff > 0 ? '↑' : '↓';
    return diff > 0 ? '↑' : '↓';
  };

  const trendColor = (type, current, previous) => {
    if (!previous) return 'text-gray-400';
    const diff = current - previous;
    if (Math.abs(diff) < 2) return 'text-gray-400';

    // SpO2 going up = good, HR/BP going down from high = good
    if (type === 'spo2') return diff > 0 ? 'text-green-400' : 'text-red-400';
    if (type === 'hr' || type === 'rr') return diff < 0 ? 'text-green-400' : 'text-yellow-400';
    if (type === 'pain') return diff < 0 ? 'text-green-400' : 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="py-1 pr-2 text-left">Time</th>
            <th className="py-1 px-1">BP</th>
            <th className="py-1 px-1">HR</th>
            <th className="py-1 px-1">RR</th>
            <th className="py-1 px-1">SpO2</th>
            <th className="py-1 px-1">GCS</th>
            <th className="py-1 px-1">Pain</th>
          </tr>
        </thead>
        <tbody>
          {vitals.map((v, i) => {
            const prev = i > 0 ? vitals[i - 1] : null;
            return (
              <tr key={i} className="border-b border-gray-800 text-gray-200">
                <td className="py-1.5 pr-2 font-medium text-gray-400">{v.time}</td>
                <td className="py-1.5 px-1">{v.bp || '—'}</td>
                <td className="py-1.5 px-1">
                  {v.hr || '—'}
                  {prev?.hr && <span className={`ml-0.5 ${trendColor('hr', v.hr, prev.hr)}`}>{trend(v.hr, prev.hr)}</span>}
                </td>
                <td className="py-1.5 px-1">
                  {v.rr || '—'}
                  {prev?.rr && <span className={`ml-0.5 ${trendColor('rr', v.rr, prev.rr)}`}>{trend(v.rr, prev.rr)}</span>}
                </td>
                <td className="py-1.5 px-1">
                  {v.spo2 ? `${v.spo2}%` : '—'}
                  {prev?.spo2 && <span className={`ml-0.5 ${trendColor('spo2', v.spo2, prev.spo2)}`}>{trend(v.spo2, prev.spo2)}</span>}
                </td>
                <td className="py-1.5 px-1">{v.gcs || '—'}</td>
                <td className="py-1.5 px-1">
                  {v.pain != null ? `${v.pain}/10` : '—'}
                  {prev?.pain != null && v.pain != null && (
                    <span className={`ml-0.5 ${trendColor('pain', v.pain, prev.pain)}`}>{trend(v.pain, prev.pain)}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
