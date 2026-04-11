// ============================================================
// COMPASS Standalone — Number Pad
// On-screen numeric keypad for MRN entry (mobile-friendly)
// ============================================================

import React, { useState, useCallback } from 'react';
import { Delete, X, Check } from 'lucide-react';

export interface NumberPadProps {
  onSubmit: (value: string) => void;
  onCancel: () => void;
  maxLength?: number;
  minLength?: number;
  label?: string;
}

const KEYS: (string | 'backspace' | 'clear')[] = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  'clear', '0', 'backspace',
];

export const NumberPad: React.FC<NumberPadProps> = ({
  onSubmit,
  onCancel,
  maxLength = 12,
  minLength = 1,
  label = 'Enter MRN',
}) => {
  const [value, setValue] = useState('');

  const handleKey = useCallback((key: string) => {
    if (key === 'backspace') {
      setValue((v) => v.slice(0, -1));
    } else if (key === 'clear') {
      setValue('');
    } else {
      setValue((v) => (v.length >= maxLength ? v : v + key));
    }
  }, [maxLength]);

  const canSubmit = value.length >= minLength;

  const handleSubmit = () => {
    if (canSubmit) onSubmit(value);
  };

  return (
    <div
      className="px-4 py-3 bg-[#0A2D3D] border-t border-white/10"
      role="dialog"
      aria-label="Medical record number keypad"
    >
      {/* Header with label and close */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-white/60 font-medium">{label}</span>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Display */}
      <div
        className="mb-3 px-4 py-3 rounded-xl bg-white/5 border border-white/20 min-h-[52px] flex items-center justify-center text-2xl font-mono tracking-[0.2em] text-white"
        aria-live="polite"
      >
        {value || <span className="text-white/30 text-base tracking-normal font-sans">Tap digits below</span>}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => {
          const isAction = key === 'backspace' || key === 'clear';
          return (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className={`h-14 rounded-xl font-semibold text-xl transition-all active:scale-95 ${
                isAction
                  ? 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                  : 'bg-white/10 border border-white/20 text-white hover:bg-white/15 hover:border-attending-light-teal/50'
              }`}
              aria-label={
                key === 'backspace' ? 'Backspace' : key === 'clear' ? 'Clear' : `Digit ${key}`
              }
            >
              {key === 'backspace' ? (
                <Delete className="w-5 h-5 mx-auto" />
              ) : key === 'clear' ? (
                <span className="text-xs uppercase tracking-wider">Clear</span>
              ) : (
                key
              )}
            </button>
          );
        })}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full mt-3 h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
          canSubmit
            ? 'bg-gradient-to-r from-attending-primary to-attending-light-teal text-white shadow-md hover:shadow-lg active:scale-[0.98]'
            : 'bg-white/5 text-white/30 cursor-not-allowed'
        }`}
      >
        <Check className="w-5 h-5" />
        Submit MRN
      </button>
    </div>
  );
};
