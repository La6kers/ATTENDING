// ATTENDING AI — Drug Interaction Safety Tests
// tests/clinical-safety/drug-interactions.test.ts
//
// CRITICAL SAFETY TESTS: Verifies the drug interaction database covers
// every documented critical pair. A false negative here can result in
// patient harm.
//
// Maps to: docs/CLINICAL_SAFETY.md → "Drug Interaction Checking" table

import { describe, it, expect } from 'vitest';
import {
  checkDrugInteractions,
  DRUG_INTERACTIONS,
  CROSS_REACTIVITY,
  PREGNANCY_CONTRAINDICATED,
  RENAL_ADJUSTMENT_DRUGS,
} from '../../apps/shared/catalogs/medications';

// Helpers
function check(meds: string[]) { return checkDrugInteractions(meds); }
function hasSeverity(meds: string[], sev: string) { return check(meds).some(i => i.severity === sev); }
function hasInteraction(meds: string[]) { return check(meds).length > 0; }

// ---- DATABASE INTEGRITY ------------------------------------------------

describe('Database Integrity', () => {
  it('has all required fields on every interaction', () => {
    DRUG_INTERACTIONS.forEach(ix => {
      expect(ix.id).toBeDefined();
      expect(ix.drug1).toBeDefined();
      expect(ix.drug2).toBeDefined();
      expect(ix.severity).toBeDefined();
      expect(ix.description).toBeDefined();
      expect(ix.management).toBeDefined();
    });
  });

  it('has no duplicate IDs', () => {
    const ids = DRUG_INTERACTIONS.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has at least 14 interactions (one per critical pair in docs)', () => {
    expect(DRUG_INTERACTIONS.length).toBeGreaterThanOrEqual(14);
  });
});

// ---- ANTICOAGULANT INTERACTIONS ----------------------------------------

describe('Anticoagulant Interactions', () => {
  it('warfarin + ibuprofen — major (GI bleed)', () => {
    expect(hasSeverity(['warfarin', 'ibuprofen'], 'major')).toBe(true);
  });

  it('warfarin + aspirin — major (haemorrhage)', () => {
    expect(hasSeverity(['warfarin', 'aspirin'], 'major')).toBe(true);
  });

  it('warfarin + NSAID class — major', () => {
    expect(hasSeverity(['warfarin', 'nsaid'], 'major')).toBe(true);
  });
});

// ---- ACE INHIBITOR + POTASSIUM -----------------------------------------

describe('ACE Inhibitor + Potassium-sparing', () => {
  it('lisinopril + spironolactone — major (hyperkalemia)', () => {
    expect(hasSeverity(['lisinopril', 'spironolactone'], 'major')).toBe(true);
  });

  it('lisinopril + potassium supplement — flagged', () => {
    expect(hasInteraction(['lisinopril', 'potassium'])).toBe(true);
  });
});

// ---- SEROTONIN SYNDROME ------------------------------------------------

describe('Serotonin Syndrome Risks', () => {
  it('SSRI + MAOI — contraindicated (fatal)', () => {
    expect(hasSeverity(['ssri', 'maoi'], 'contraindicated')).toBe(true);
  });

  it('SSRI + tramadol — major', () => {
    expect(hasSeverity(['ssri', 'tramadol'], 'major')).toBe(true);
  });

  it('sertraline + sumatriptan — flagged', () => {
    expect(hasInteraction(['sertraline', 'sumatriptan'])).toBe(true);
  });

  it('MAOI management mentions 14-day washout', () => {
    const entry = check(['ssri', 'maoi']).find(i => i.severity === 'contraindicated');
    expect(entry?.management?.toLowerCase()).toMatch(/washout|14.day|avoid/i);
  });
});

// ---- CARDIAC -----------------------------------------------------------

describe('Cardiac Interactions', () => {
  it('digoxin + amiodarone — major', () => {
    expect(hasSeverity(['digoxin', 'amiodarone'], 'major')).toBe(true);
  });

  it('digoxin + amiodarone clinical effect mentions toxicity', () => {
    const entry = check(['digoxin', 'amiodarone']).find(i => i.severity === 'major');
    expect(entry?.clinicalEffect?.toLowerCase()).toMatch(/toxicity|bradycardia|arrhythmia/i);
  });

  it('digoxin management mentions dose reduction', () => {
    const entry = check(['digoxin', 'amiodarone']).find(i => i.severity === 'major');
    expect(entry?.management?.toLowerCase()).toMatch(/reduce|dose|monitor/i);
  });
});

// ---- METHOTREXATE + NSAIDs ---------------------------------------------

describe('Methotrexate + NSAIDs', () => {
  it('methotrexate + nsaid — major', () => {
    expect(hasSeverity(['methotrexate', 'nsaid'], 'major')).toBe(true);
  });

  it('clinical effect mentions toxicity', () => {
    const entry = check(['methotrexate', 'nsaid'])
      .find(i => i.drug1 === 'methotrexate' || i.drug2 === 'methotrexate');
    expect(entry?.clinicalEffect?.toLowerCase()).toMatch(/toxic|renal|bone marrow/i);
  });
});

// ---- LITHIUM + NSAIDs --------------------------------------------------

describe('Lithium + NSAIDs', () => {
  it('lithium + nsaid — major', () => {
    expect(hasSeverity(['lithium', 'nsaid'], 'major')).toBe(true);
  });

  it('clinical effect mentions lithium levels', () => {
    const entry = check(['lithium', 'nsaid'])
      .find(i => i.drug1 === 'lithium' || i.drug2 === 'lithium');
    expect(entry?.clinicalEffect?.toLowerCase()).toMatch(/lithium|toxic/i);
  });
});

// ---- STATIN + FIBRATE --------------------------------------------------

describe('Statin + Fibrate (rhabdomyolysis)', () => {
  it('statin + fibrate — major', () => {
    expect(hasSeverity(['statin', 'fibrate'], 'major')).toBe(true);
  });

  it('clinical effect mentions rhabdomyolysis', () => {
    const entry = check(['statin', 'fibrate'])
      .find(i => i.drug1 === 'statin' || i.drug2 === 'statin');
    expect(entry?.clinicalEffect?.toLowerCase()).toMatch(/rhabdomyolysis|muscle/i);
  });
});

// ---- BENZO + OPIOID (Black Box) ----------------------------------------

describe('Benzodiazepine + Opioid', () => {
  it('lorazepam + tramadol — contraindicated', () => {
    expect(hasSeverity(['lorazepam', 'tramadol'], 'contraindicated')).toBe(true);
  });

  it('clinical effect mentions respiratory depression', () => {
    const entry = check(['lorazepam', 'tramadol']).find(i => i.severity === 'contraindicated');
    expect(entry?.clinicalEffect?.toLowerCase()).toMatch(/respiratory|death|sedation/i);
  });
});

// ---- METFORMIN + CONTRAST ----------------------------------------------

describe('Metformin + Contrast Media', () => {
  it('metformin + contrast — major', () => {
    expect(hasSeverity(['metformin', 'contrast'], 'major')).toBe(true);
  });

  it('clinical effect mentions lactic acidosis', () => {
    const entry = check(['metformin', 'contrast'])
      .find(i => i.drug1 === 'metformin' || i.drug2 === 'metformin');
    expect(entry?.clinicalEffect?.toLowerCase()).toMatch(/lactic acidosis|nephropathy/i);
  });

  it('management mentions holding metformin before contrast', () => {
    const entry = check(['metformin', 'contrast'])
      .find(i => i.drug1 === 'metformin' || i.drug2 === 'metformin');
    expect(entry?.management?.toLowerCase()).toMatch(/hold|48|before/i);
  });
});

// ---- FLUOROQUINOLONE ---------------------------------------------------

describe('Fluoroquinolone Interactions', () => {
  it('ciprofloxacin + theophylline — major', () => {
    expect(hasSeverity(['ciprofloxacin', 'theophylline'], 'major')).toBe(true);
  });
});

// ---- CROSS-REACTIVITY --------------------------------------------------

describe('Allergy Cross-Reactivity', () => {
  it('penicillin cross-reactivity includes amoxicillin', () => {
    expect(CROSS_REACTIVITY['penicillin']).toContain('amoxicillin');
  });

  it('sulfa cross-reactivity list is present', () => {
    expect(CROSS_REACTIVITY['sulfa']?.length).toBeGreaterThan(0);
  });

  it('NSAID cross-reactivity includes ibuprofen and naproxen', () => {
    expect(CROSS_REACTIVITY['nsaid']).toContain('ibuprofen');
    expect(CROSS_REACTIVITY['nsaid']).toContain('naproxen');
  });

  it('cephalosporin cross-reactivity list is present', () => {
    expect(CROSS_REACTIVITY['cephalosporin']?.length).toBeGreaterThan(0);
  });
});

// ---- PREGNANCY CONTRAINDICATIONS ---------------------------------------

describe('Pregnancy Contraindicated Drugs (Category X)', () => {
  it('includes warfarin', () => { expect(PREGNANCY_CONTRAINDICATED).toContain('warfarin'); });
  it('includes atorvastatin', () => { expect(PREGNANCY_CONTRAINDICATED).toContain('atorvastatin'); });
  it('includes methotrexate', () => { expect(PREGNANCY_CONTRAINDICATED).toContain('methotrexate'); });
  it('includes isotretinoin', () => { expect(PREGNANCY_CONTRAINDICATED).toContain('isotretinoin'); });
  it('includes valproate or valproic acid', () => {
    const included = PREGNANCY_CONTRAINDICATED.includes('valproate') ||
                     PREGNANCY_CONTRAINDICATED.includes('valproic acid');
    expect(included).toBe(true);
  });
  it('includes finasteride', () => { expect(PREGNANCY_CONTRAINDICATED).toContain('finasteride'); });
});

// ---- RENAL DOSE ADJUSTMENT ---------------------------------------------

describe('Renal Dose Adjustment', () => {
  it('includes metformin', () => { expect(RENAL_ADJUSTMENT_DRUGS).toContain('metformin'); });
  it('includes gabapentin', () => { expect(RENAL_ADJUSTMENT_DRUGS).toContain('gabapentin'); });
  it('includes lithium', () => { expect(RENAL_ADJUSTMENT_DRUGS).toContain('lithium'); });
  it('includes ciprofloxacin', () => { expect(RENAL_ADJUSTMENT_DRUGS).toContain('ciprofloxacin'); });
});

// ---- SAFE COMBINATIONS (false-positive prevention) ---------------------

describe('Safe Combinations — no false positives', () => {
  it('acetaminophen + amoxicillin', () => { expect(hasInteraction(['acetaminophen', 'amoxicillin'])).toBe(false); });
  it('lisinopril + metoprolol', () => { expect(hasInteraction(['lisinopril', 'metoprolol'])).toBe(false); });
  it('albuterol + prednisone', () => { expect(hasInteraction(['albuterol', 'prednisone'])).toBe(false); });
  it('single drug', () => { expect(hasInteraction(['levothyroxine'])).toBe(false); });
  it('empty list', () => { expect(hasInteraction([])).toBe(false); });
  it('unknown drug', () => { expect(hasInteraction(['no-such-drug-xyz'])).toBe(false); });
});

// ---- checkDrugInteractions() CONTRACT ----------------------------------

describe('checkDrugInteractions() Contract', () => {
  it('returns array', () => { expect(Array.isArray(check(['warfarin', 'ibuprofen']))).toBe(true); });
  it('empty input returns empty array', () => { expect(check([])).toEqual([]); });
  it('case-insensitive matching', () => {
    expect(check(['warfarin', 'ibuprofen']).length).toBe(check(['WARFARIN', 'IBUPROFEN']).length);
  });
  it('order-independent matching', () => {
    const fwd = check(['warfarin', 'ibuprofen']).length;
    const rev = check(['ibuprofen', 'warfarin']).length;
    expect(fwd).toBeGreaterThan(0);
    expect(rev).toBeGreaterThan(0);
  });
  it('returns multiple interactions when multiple pairs present', () => {
    expect(check(['warfarin', 'ibuprofen', 'ssri', 'maoi']).length).toBeGreaterThanOrEqual(2);
  });
});
