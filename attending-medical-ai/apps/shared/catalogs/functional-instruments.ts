/**
 * Functional Assessment Instrument Catalog
 *
 * Scoring rules, subscale definitions, and interpretation thresholds
 * for standardized functional assessment instruments used in SNFs.
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claim 7
 */

import type { FunctionalInstrumentType } from '../types/interact.types';

// ---------------------------------------------------------------------------
// Instrument Definitions
// ---------------------------------------------------------------------------

export interface FunctionalInstrumentDefinition {
  type: FunctionalInstrumentType;
  name: string;
  abbreviation: string;
  description: string;
  scoreRange: { min: number; max: number };
  subscales: SubscaleDefinition[];
  interpretationThresholds: InterpretationThreshold[];
  higherIsBetter: boolean;
  cmsReference?: string;
}

export interface SubscaleDefinition {
  id: string;
  name: string;
  scoreRange: { min: number; max: number };
  description: string;
}

export interface InterpretationThreshold {
  min: number;
  max: number;
  label: string;
  clinicalMeaning: string;
}

// ---------------------------------------------------------------------------
// Barthel Index
// ---------------------------------------------------------------------------

export const BARTHEL_INDEX: FunctionalInstrumentDefinition = {
  type: 'BARTHEL',
  name: 'Barthel Index of Activities of Daily Living',
  abbreviation: 'Barthel ADL',
  description: 'Measures functional independence in 10 ADL categories. Higher scores indicate greater independence.',
  scoreRange: { min: 0, max: 100 },
  higherIsBetter: true,
  subscales: [
    { id: 'feeding', name: 'Feeding', scoreRange: { min: 0, max: 10 }, description: 'Ability to feed self' },
    { id: 'bathing', name: 'Bathing', scoreRange: { min: 0, max: 5 }, description: 'Ability to bathe self' },
    { id: 'grooming', name: 'Grooming', scoreRange: { min: 0, max: 5 }, description: 'Ability to groom self' },
    { id: 'dressing', name: 'Dressing', scoreRange: { min: 0, max: 10 }, description: 'Ability to dress self' },
    { id: 'bowels', name: 'Bowel Control', scoreRange: { min: 0, max: 10 }, description: 'Bowel continence' },
    { id: 'bladder', name: 'Bladder Control', scoreRange: { min: 0, max: 10 }, description: 'Bladder continence' },
    { id: 'toileting', name: 'Toileting', scoreRange: { min: 0, max: 10 }, description: 'Ability to use toilet' },
    { id: 'transfers', name: 'Chair/Bed Transfer', scoreRange: { min: 0, max: 15 }, description: 'Ability to transfer' },
    { id: 'mobility', name: 'Mobility/Ambulation', scoreRange: { min: 0, max: 15 }, description: 'Ability to ambulate' },
    { id: 'stairs', name: 'Stair Climbing', scoreRange: { min: 0, max: 10 }, description: 'Ability to climb stairs' },
  ],
  interpretationThresholds: [
    { min: 0, max: 20, label: 'TOTAL_DEPENDENCE', clinicalMeaning: 'Total dependence — requires 24-hour care' },
    { min: 21, max: 60, label: 'SEVERE_DEPENDENCE', clinicalMeaning: 'Severe dependence — requires significant daily assistance' },
    { min: 61, max: 90, label: 'MODERATE_DEPENDENCE', clinicalMeaning: 'Moderate dependence — requires some assistance with ADLs' },
    { min: 91, max: 99, label: 'SLIGHT_DEPENDENCE', clinicalMeaning: 'Slight dependence — independent with most ADLs' },
    { min: 100, max: 100, label: 'INDEPENDENT', clinicalMeaning: 'Independent in all basic ADLs' },
  ],
};

// ---------------------------------------------------------------------------
// Katz ADL Index
// ---------------------------------------------------------------------------

export const KATZ_ADL: FunctionalInstrumentDefinition = {
  type: 'KATZ_ADL',
  name: 'Katz Index of Independence in Activities of Daily Living',
  abbreviation: 'Katz ADL',
  description: 'Binary assessment of independence in 6 ADL categories. Higher scores indicate greater independence.',
  scoreRange: { min: 0, max: 6 },
  higherIsBetter: true,
  subscales: [
    { id: 'bathing', name: 'Bathing', scoreRange: { min: 0, max: 1 }, description: 'Independent in bathing' },
    { id: 'dressing', name: 'Dressing', scoreRange: { min: 0, max: 1 }, description: 'Independent in dressing' },
    { id: 'toileting', name: 'Toileting', scoreRange: { min: 0, max: 1 }, description: 'Independent in toileting' },
    { id: 'transferring', name: 'Transferring', scoreRange: { min: 0, max: 1 }, description: 'Independent in transfers' },
    { id: 'continence', name: 'Continence', scoreRange: { min: 0, max: 1 }, description: 'Continent of bowel and bladder' },
    { id: 'feeding', name: 'Feeding', scoreRange: { min: 0, max: 1 }, description: 'Independent in feeding' },
  ],
  interpretationThresholds: [
    { min: 6, max: 6, label: 'FULL_FUNCTION', clinicalMeaning: 'Full function — independent in all 6 ADLs (Grade A)' },
    { min: 4, max: 5, label: 'MODERATE_IMPAIRMENT', clinicalMeaning: 'Moderate impairment — dependent in 1-2 ADLs (Grade B-C)' },
    { min: 2, max: 3, label: 'SEVERE_IMPAIRMENT', clinicalMeaning: 'Severe impairment — dependent in 3-4 ADLs (Grade D-E)' },
    { min: 0, max: 1, label: 'VERY_SEVERE_IMPAIRMENT', clinicalMeaning: 'Very severe impairment — dependent in 5-6 ADLs (Grade F-G)' },
  ],
};

// ---------------------------------------------------------------------------
// Morse Fall Scale
// ---------------------------------------------------------------------------

export const MORSE_FALL_SCALE: FunctionalInstrumentDefinition = {
  type: 'MORSE_FALL',
  name: 'Morse Fall Scale',
  abbreviation: 'Morse',
  description: 'Assesses fall risk based on 6 factors. Higher scores indicate greater fall risk.',
  scoreRange: { min: 0, max: 125 },
  higherIsBetter: false,
  subscales: [
    { id: 'fall_history', name: 'History of Falling', scoreRange: { min: 0, max: 25 }, description: 'Fall within 3 months: No=0, Yes=25' },
    { id: 'secondary_dx', name: 'Secondary Diagnosis', scoreRange: { min: 0, max: 15 }, description: 'More than one diagnosis: No=0, Yes=15' },
    { id: 'ambulatory_aid', name: 'Ambulatory Aid', scoreRange: { min: 0, max: 30 }, description: 'None/bedrest=0, Crutches/cane/walker=15, Furniture=30' },
    { id: 'iv_therapy', name: 'IV Therapy / Heparin Lock', scoreRange: { min: 0, max: 20 }, description: 'No=0, Yes=20' },
    { id: 'gait', name: 'Gait', scoreRange: { min: 0, max: 20 }, description: 'Normal=0, Weak=10, Impaired=20' },
    { id: 'mental_status', name: 'Mental Status', scoreRange: { min: 0, max: 15 }, description: 'Oriented to own ability=0, Overestimates/forgets=15' },
  ],
  interpretationThresholds: [
    { min: 0, max: 24, label: 'LOW_RISK', clinicalMeaning: 'Low fall risk — standard fall precautions' },
    { min: 25, max: 44, label: 'MODERATE_RISK', clinicalMeaning: 'Moderate fall risk — implement fall prevention protocol' },
    { min: 45, max: 125, label: 'HIGH_RISK', clinicalMeaning: 'High fall risk — implement high-risk fall prevention interventions' },
  ],
};

// ---------------------------------------------------------------------------
// Braden Scale
// ---------------------------------------------------------------------------

export const BRADEN_SCALE: FunctionalInstrumentDefinition = {
  type: 'BRADEN',
  name: 'Braden Scale for Predicting Pressure Sore Risk',
  abbreviation: 'Braden',
  description: 'Assesses pressure injury risk. Lower scores indicate higher risk.',
  scoreRange: { min: 6, max: 23 },
  higherIsBetter: true,
  subscales: [
    { id: 'sensory_perception', name: 'Sensory Perception', scoreRange: { min: 1, max: 4 }, description: 'Ability to respond to pressure-related discomfort' },
    { id: 'moisture', name: 'Moisture', scoreRange: { min: 1, max: 4 }, description: 'Degree of skin moisture exposure' },
    { id: 'activity', name: 'Activity', scoreRange: { min: 1, max: 4 }, description: 'Degree of physical activity' },
    { id: 'mobility', name: 'Mobility', scoreRange: { min: 1, max: 4 }, description: 'Ability to change and control body position' },
    { id: 'nutrition', name: 'Nutrition', scoreRange: { min: 1, max: 4 }, description: 'Usual food intake pattern' },
    { id: 'friction_shear', name: 'Friction & Shear', scoreRange: { min: 1, max: 3 }, description: 'Friction and shear risk' },
  ],
  interpretationThresholds: [
    { min: 6, max: 9, label: 'VERY_HIGH_RISK', clinicalMeaning: 'Very high pressure injury risk — aggressive prevention required' },
    { min: 10, max: 12, label: 'HIGH_RISK', clinicalMeaning: 'High pressure injury risk — comprehensive prevention plan' },
    { min: 13, max: 14, label: 'MODERATE_RISK', clinicalMeaning: 'Moderate pressure injury risk — standard prevention' },
    { min: 15, max: 18, label: 'MILD_RISK', clinicalMeaning: 'Mild pressure injury risk — basic prevention' },
    { min: 19, max: 23, label: 'NO_RISK', clinicalMeaning: 'No significant pressure injury risk' },
  ],
  cmsReference: 'CMS F686',
};

// ---------------------------------------------------------------------------
// MDS 3.0 Section GG
// ---------------------------------------------------------------------------

export const MDS_SECTION_GG: FunctionalInstrumentDefinition = {
  type: 'MDS_GG',
  name: 'MDS 3.0 Section GG: Functional Abilities and Goals',
  abbreviation: 'MDS GG',
  description: 'CMS-required functional assessment for SNF residents. Scores rate performance on 1-6 scale per item.',
  scoreRange: { min: 0, max: 100 }, // Composite varies
  higherIsBetter: true,
  subscales: [
    { id: 'eating', name: 'Eating', scoreRange: { min: 1, max: 6 }, description: 'Ability to eat and drink' },
    { id: 'oral_hygiene', name: 'Oral Hygiene', scoreRange: { min: 1, max: 6 }, description: 'Oral hygiene management' },
    { id: 'toileting_hygiene', name: 'Toileting Hygiene', scoreRange: { min: 1, max: 6 }, description: 'Toileting hygiene' },
    { id: 'sit_to_lying', name: 'Sit to Lying', scoreRange: { min: 1, max: 6 }, description: 'Moving from sitting to lying' },
    { id: 'lying_to_sitting', name: 'Lying to Sitting', scoreRange: { min: 1, max: 6 }, description: 'Moving from lying to sitting' },
    { id: 'sit_to_stand', name: 'Sit to Stand', scoreRange: { min: 1, max: 6 }, description: 'Coming to standing' },
    { id: 'chair_transfer', name: 'Chair/Bed Transfer', scoreRange: { min: 1, max: 6 }, description: 'Transfer to/from bed/chair' },
    { id: 'toilet_transfer', name: 'Toilet Transfer', scoreRange: { min: 1, max: 6 }, description: 'Transfer on/off toilet' },
    { id: 'walk_50ft', name: 'Walk 50 Feet', scoreRange: { min: 1, max: 6 }, description: 'Walking 50 feet with/without device' },
    { id: 'walk_150ft', name: 'Walk 150 Feet', scoreRange: { min: 1, max: 6 }, description: 'Walking 150 feet with/without device' },
  ],
  interpretationThresholds: [
    // MDS GG uses per-item scoring: 06=Independent, 05=Setup/cleanup, 04=Supervision,
    // 03=Partial/moderate assist, 02=Substantial/maximal assist, 01=Dependent
    { min: 0, max: 20, label: 'DEPENDENT', clinicalMeaning: 'Primarily dependent for self-care and mobility' },
    { min: 21, max: 40, label: 'SUBSTANTIAL_ASSIST', clinicalMeaning: 'Requires substantial assistance' },
    { min: 41, max: 50, label: 'PARTIAL_ASSIST', clinicalMeaning: 'Requires partial/moderate assistance' },
    { min: 51, max: 55, label: 'SUPERVISION', clinicalMeaning: 'Requires supervision or cueing' },
    { min: 56, max: 60, label: 'INDEPENDENT', clinicalMeaning: 'Independent or requires setup only' },
  ],
  cmsReference: 'CMS MDS 3.0 RAI Manual, Section GG',
};

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const FUNCTIONAL_INSTRUMENTS: Record<FunctionalInstrumentType, FunctionalInstrumentDefinition> = {
  BARTHEL: BARTHEL_INDEX,
  KATZ_ADL: KATZ_ADL,
  MORSE_FALL: MORSE_FALL_SCALE,
  BRADEN: BRADEN_SCALE,
  MDS_GG: MDS_SECTION_GG,
  CUSTOM: {
    type: 'CUSTOM',
    name: 'Custom Assessment',
    abbreviation: 'Custom',
    description: 'Facility-specific functional assessment instrument',
    scoreRange: { min: 0, max: 100 },
    higherIsBetter: true,
    subscales: [],
    interpretationThresholds: [],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getInstrument(type: FunctionalInstrumentType): FunctionalInstrumentDefinition {
  return FUNCTIONAL_INSTRUMENTS[type];
}

export function interpretScore(type: FunctionalInstrumentType, score: number): string {
  const instrument = FUNCTIONAL_INSTRUMENTS[type];
  const threshold = instrument.interpretationThresholds.find(
    (t) => score >= t.min && score <= t.max
  );
  return threshold?.clinicalMeaning ?? `Score: ${score}`;
}

export function isValidScore(type: FunctionalInstrumentType, score: number): boolean {
  const instrument = FUNCTIONAL_INSTRUMENTS[type];
  return score >= instrument.scoreRange.min && score <= instrument.scoreRange.max;
}

export function getSubscaleDefinitions(type: FunctionalInstrumentType): SubscaleDefinition[] {
  return FUNCTIONAL_INSTRUMENTS[type].subscales;
}
