// ============================================================
// ATTENDING AI - Vital Sign Validation
// apps/shared/lib/validators/vitalSigns.ts
//
// Client-side validation constants and helpers for vital sign
// ranges. These provide defense-in-depth alongside any future
// database-level CHECK constraints.
// ============================================================

export const VITAL_SIGN_RANGES = {
  heartRate: { min: 20, max: 300, unit: 'bpm' },
  bloodPressureSystolic: { min: 40, max: 300, unit: 'mmHg' },
  bloodPressureDiastolic: { min: 20, max: 200, unit: 'mmHg' },
  temperature: { min: 86.0, max: 113.0, unit: '°F' },  // 30-45°C
  respiratoryRate: { min: 4, max: 60, unit: 'breaths/min' },
  oxygenSaturation: { min: 50, max: 100, unit: '%' },
  weight: { min: 0.5, max: 700, unit: 'kg' },
  height: { min: 20, max: 280, unit: 'cm' },
} as const;

export function validateVitalSign(name: keyof typeof VITAL_SIGN_RANGES, value: number): string | null {
  const range = VITAL_SIGN_RANGES[name];
  if (!range) return null;
  if (value < range.min || value > range.max) {
    return `${name} must be between ${range.min} and ${range.max} ${range.unit}`;
  }
  return null;
}
