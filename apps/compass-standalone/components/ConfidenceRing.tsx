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
