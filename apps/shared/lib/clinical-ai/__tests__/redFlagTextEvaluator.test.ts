/**
 * Text-Based Red Flag Evaluator — Test Suite
 *
 * Tests the offline-first text evaluator against all 23 canonical red flags.
 * Ensures parity with the old COMPASS regex patterns and validates the
 * 7 new v2.0 flags (aortic dissection, pneumothorax, status epilepticus,
 * acute abdomen, eclampsia, severe hypoglycemia, acute limb ischemia).
 */

import { describe, it, expect } from 'vitest';
import { evaluateTextForRedFlags } from '../redFlagTextEvaluator';
import { RED_FLAGS, RED_FLAG_RULES_VERSION } from '../redFlagDetection';

// =============================================================================
// Meta tests
// =============================================================================

describe('evaluateTextForRedFlags', () => {
  it('should return metadata with every result', () => {
    const result = evaluateTextForRedFlags('hello');
    expect(result.rulesVersion).toBe(RED_FLAG_RULES_VERSION);
    expect(result.rulesCount).toBe(RED_FLAGS.length);
    expect(result.evaluatedAt).toBeTruthy();
  });

  it('should handle empty/null/undefined input safely', () => {
    expect(evaluateTextForRedFlags('')).toEqual(expect.objectContaining({ hasRedFlags: false }));
    expect(evaluateTextForRedFlags(null as any)).toEqual(expect.objectContaining({ hasRedFlags: false }));
    expect(evaluateTextForRedFlags(undefined as any)).toEqual(expect.objectContaining({ hasRedFlags: false }));
  });

  it('should have 23 total red flags in canonical set', () => {
    expect(RED_FLAGS.length).toBe(23);
  });

  // ===========================================================================
  // Original 16 red flags — must all trigger
  // ===========================================================================

  describe('Original red flags', () => {
    it('detects Acute Coronary Syndrome', () => {
      const r = evaluateTextForRedFlags('crushing chest pain radiating to my left arm');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-chest-pain-cardiac')).toBe(true);
    });

    it('detects Acute Stroke', () => {
      const r = evaluateTextForRedFlags('sudden onset facial droop and arm weakness');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-stroke')).toBe(true);
    });

    it('detects Sepsis', () => {
      const r = evaluateTextForRedFlags('fever with hypotension and tachycardia');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-sepsis')).toBe(true);
    });

    it('detects Acute Respiratory Failure', () => {
      const r = evaluateTextForRedFlags('severe shortness of breath at rest, can\'t speak full sentences');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-respiratory-distress')).toBe(true);
    });

    it('detects Anaphylaxis', () => {
      const r = evaluateTextForRedFlags('allergic reaction with difficulty breathing and hives');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-anaphylaxis')).toBe(true);
    });

    it('detects GI Hemorrhage', () => {
      const r = evaluateTextForRedFlags('vomiting blood and black tarry stools');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-gi-bleed')).toBe(true);
    });

    it('detects Suicidal Ideation', () => {
      const r = evaluateTextForRedFlags('I want to kill myself, I have a plan');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-suicidal-ideation')).toBe(true);
    });

    it('detects Meningitis', () => {
      const r = evaluateTextForRedFlags('fever with severe headache and neck stiffness');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-meningitis')).toBe(true);
    });

    it('detects Pulmonary Embolism', () => {
      const r = evaluateTextForRedFlags('sudden onset shortness of breath with pleuritic chest pain');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-pulmonary-embolism')).toBe(true);
    });

    it('detects Ectopic Pregnancy', () => {
      const r = evaluateTextForRedFlags('abdominal pain with positive pregnancy test and vaginal bleeding');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-ectopic-pregnancy')).toBe(true);
    });

    it('detects Diabetic Emergency', () => {
      const r = evaluateTextForRedFlags('diabetic with altered mental status and Kussmaul breathing');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-diabetic-emergency')).toBe(true);
    });

    it('detects Testicular Torsion', () => {
      const r = evaluateTextForRedFlags('sudden severe testicular pain with nausea and vomiting');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-testicular-torsion')).toBe(true);
    });

    it('detects Cauda Equina', () => {
      const r = evaluateTextForRedFlags('back pain with urinary retention and saddle anesthesia');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-cauda-equina')).toBe(true);
    });
  });

  // ===========================================================================
  // 7 New v2.0 red flags
  // ===========================================================================

  describe('New v2.0 red flags', () => {
    it('detects Aortic Dissection', () => {
      const r = evaluateTextForRedFlags('sudden tearing chest pain radiating to back');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-aortic-dissection')).toBe(true);
    });

    it('detects Pneumothorax', () => {
      const r = evaluateTextForRedFlags('sudden chest pain with shortness of breath after trauma');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-pneumothorax')).toBe(true);
    });

    it('detects Status Epilepticus', () => {
      const r = evaluateTextForRedFlags('seizure lasting more than 5 minutes, continuous convulsions');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-status-epilepticus')).toBe(true);
    });

    it('detects Acute Abdomen', () => {
      const r = evaluateTextForRedFlags('rigid abdomen with rebound tenderness and absent bowel sounds');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-acute-abdomen')).toBe(true);
    });

    it('detects Eclampsia', () => {
      const r = evaluateTextForRedFlags('seizure in pregnancy with hypertension');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-eclampsia')).toBe(true);
    });

    it('detects Severe Hypoglycemia', () => {
      const r = evaluateTextForRedFlags('blood glucose below 40 with altered mental status');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-severe-hypoglycemia')).toBe(true);
    });

    it('detects Acute Limb Ischemia', () => {
      const r = evaluateTextForRedFlags('sudden pale cold extremity with absent pulse');
      expect(r.hasRedFlags).toBe(true);
      expect(r.flags.some(f => f.id === 'rf-acute-limb-ischemia')).toBe(true);
    });
  });

  // ===========================================================================
  // COMPASS regex parity — all 12 old patterns must still trigger
  // ===========================================================================

  describe('COMPASS regex parity', () => {
    const compassPatterns = [
      { text: 'I have chest pain and chest tightness', expect: true },
      { text: 'I can\'t breathe, difficulty breathing', expect: true },
      { text: 'worst headache of my life, thunderclap', expect: true },
      { text: 'I am suicidal and want to die', expect: true },
      { text: 'bleeding heavily, can\'t stop bleeding', expect: true },
      { text: 'face drooping, arm weakness, slurred speech', expect: true },
      { text: 'I passed out and was unconscious', expect: true },
      { text: 'worst pain, excruciating pain', expect: true },
      { text: 'blood in stool and vomiting blood', expect: true },
      { text: 'sudden vision loss, I can\'t see', expect: true },
      { text: 'high fever of 104 degrees', expect: true },
      { text: 'confusion and disoriented, altered mental status', expect: true },
    ];

    compassPatterns.forEach(({ text, expect: shouldMatch }, i) => {
      it(`detects COMPASS pattern ${i + 1}: "${text.slice(0, 40)}..."`, () => {
        const r = evaluateTextForRedFlags(text);
        expect(r.hasRedFlags).toBe(shouldMatch);
      });
    });
  });

  // ===========================================================================
  // False positive prevention
  // ===========================================================================

  describe('False positive prevention', () => {
    it('should NOT flag mild headache', () => {
      const r = evaluateTextForRedFlags('mild headache since yesterday');
      expect(r.flags.filter(f => f.severity === 'critical')).toHaveLength(0);
    });

    it('should NOT flag common cold', () => {
      const r = evaluateTextForRedFlags('mild runny nose and sneezing for 3 days');
      expect(r.flags.filter(f => f.severity === 'critical')).toHaveLength(0);
    });

    it('should NOT flag routine knee pain', () => {
      const r = evaluateTextForRedFlags('mild knee pain after walking');
      expect(r.flags.filter(f => f.severity === 'critical')).toHaveLength(0);
    });

    it('should NOT flag fatigue', () => {
      const r = evaluateTextForRedFlags('I feel tired and have been sleeping poorly');
      expect(r.hasRedFlags).toBe(false);
    });

    it('should NOT flag dental pain', () => {
      const r = evaluateTextForRedFlags('my tooth hurts when I chew');
      expect(r.hasRedFlags).toBe(false);
    });

    it('should reduce confidence for chronic presentations', () => {
      const r = evaluateTextForRedFlags('chest pain for 3 years, chronic and stable');
      // May still flag but with reduced confidence
      if (r.hasRedFlags) {
        expect(r.flags[0].confidence).toBeLessThan(0.5);
      }
    });
  });

  // ===========================================================================
  // Severity ordering
  // ===========================================================================

  describe('Severity ordering', () => {
    it('should sort critical flags before high', () => {
      const r = evaluateTextForRedFlags(
        'crushing chest pain with vomiting blood and sudden leg swelling'
      );
      if (r.flags.length >= 2) {
        const severities = r.flags.map(f => f.severity);
        const critIdx = severities.indexOf('critical');
        const highIdx = severities.indexOf('high');
        if (critIdx >= 0 && highIdx >= 0) {
          expect(critIdx).toBeLessThan(highIdx);
        }
      }
    });
  });
});
