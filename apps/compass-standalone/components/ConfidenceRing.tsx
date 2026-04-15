// ============================================================
// COMPASS Standalone — Shared Confidence Ring
// SVG circular progress for diagnosis confidence scores
// ============================================================

import React from 'react';

interface ConfidenceRingProps {
  confidence: number;
  size?: number;
  theme?: 'light' | 'dark';
}

export const ConfidenceRing: React.FC<ConfidenceRingProps> = ({ confidence, size = 44, theme = 'dark' }) => {
  // confidence === 0 is a sentinel used by "Needs in-person evaluation" cards
  // where the engine couldn't produce a real differential. Rendering a 0%
  // ring reads as a broken result; show an informational icon instead.
  if (confidence === 0) {
    const color = theme === 'dark' ? 'rgba(255,255,255,0.55)' : '#6B7280';
    const bg = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#E5E7EB';
    return (
      <div
        className="relative inline-flex items-center justify-center flex-shrink-0 rounded-full"
        style={{ width: size, height: size, background: bg, border: `1.5px dashed ${color}` }}
        role="img"
        aria-label="Needs in-person evaluation"
      >
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </div>
    );
  }

  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (confidence / 100) * circ;
  const color = confidence >= 70 ? '#22C55E' : confidence >= 40 ? '#F0A500' : '#E87461';
  const trackColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E5E7EB';

  return (
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${confidence}% confidence`}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={3} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={3} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color }}>{confidence}%</span>
    </div>
  );
};
