// =============================================================================
// ATTENDING AI - Content Classifier Tests
// packages/ai-governance/src/__tests__/content-classifier.test.ts
// =============================================================================

import { describe, it, expect } from 'vitest';
import { ContentClassifier } from '../classification/ContentClassifier';

describe('ContentClassifier', () => {
  const classifier = new ContentClassifier();

  // ---------------------------------------------------------------------------
  // Emergency Detection
  // ---------------------------------------------------------------------------

  describe('emergency classification', () => {
    it('should classify content with emergency signals as emergency', () => {
      // Need 3+ emergency keywords to exceed the 0.3 threshold (14 keywords, score = matches/14 * 2)
      const result = classifier.classify(
        'Patient reports severe chest pain radiating to left arm. Call 911 immediately. ' +
        'This is an emergency — patient is unconscious and not breathing.'
      );
      expect(result.classification).toBe('emergency');
      expect(result.requiresClinicianReview).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect suicide/self-harm language', () => {
      const result = classifier.classify(
        'Patient expresses suicidal ideation with a plan for self-harm. ' +
        'This is an emergency requiring immediate crisis intervention. Call 911.'
      );
      expect(result.classification).toBe('emergency');
      expect(result.requiresClinicianReview).toBe(true);
    });

    it('should detect stroke symptoms', () => {
      const result = classifier.classify(
        'Patient showing signs of stroke: facial drooping, arm weakness. ' +
        'Call 911 immediately — this is a medical emergency.'
      );
      expect(result.classification).toBe('emergency');
    });

    it('should detect anaphylaxis', () => {
      const result = classifier.classify(
        'Severe allergic reaction progressing to anaphylaxis. ' +
        'Call 911 — this is an emergency. Patient is not breathing.'
      );
      expect(result.classification).toBe('emergency');
    });
  });

  // ---------------------------------------------------------------------------
  // Clinical Guidance
  // ---------------------------------------------------------------------------

  describe('clinical guidance classification', () => {
    it('should classify clinical content as clinical-guidance', () => {
      const result = classifier.classify(
        'Based on the lab results and vital signs, the clinical finding is consistent with Type 2 Diabetes. ' +
        'Recommend starting metformin. Consider ordering HbA1c for monitoring.'
      );
      expect(result.classification).toBe('clinical-guidance');
      expect(result.requiresClinicianReview).toBe(true);
    });

    it('should detect differential diagnosis content', () => {
      const result = classifier.classify(
        'Differential diagnosis: Rule out pneumonia, consider assessment for COPD exacerbation. ' +
        'Recommend chest X-ray and CBC with differential.'
      );
      expect(result.classification).toBe('clinical-guidance');
    });

    it('should detect medication-related content', () => {
      const result = classifier.classify(
        'Current medication review: Patient is on lisinopril 10mg. Dosage adjustment ' +
        'should consider the contraindication with potassium supplements.'
      );
      expect(result.classification).toBe('clinical-guidance');
      expect(result.requiresClinicianReview).toBe(true);
    });

    it('should boost clinical score with patient data context', () => {
      const ambiguous = 'The results may indicate a pattern worth monitoring.';

      const withoutContext = classifier.classify(ambiguous);
      const withContext = classifier.classify(ambiguous, {
        hasPatientData: true,
        hasLabResults: true,
        hasMedications: true,
        isProviderFacing: true,
      });

      // Context should boost toward clinical
      expect(withContext.confidence).toBeGreaterThan(withoutContext.confidence);
    });
  });

  // ---------------------------------------------------------------------------
  // Educational Content
  // ---------------------------------------------------------------------------

  describe('educational classification', () => {
    it('should classify educational content', () => {
      const result = classifier.classify(
        'In general, high blood pressure, also known as hypertension, is a common condition. ' +
        'Prevention includes regular exercise and a balanced diet. ' +
        'Studies show that reducing sodium intake typically helps.'
      );
      expect(result.classification).toBe('educational');
      expect(result.requiresClinicianReview).toBe(false);
    });

    it('should classify "what is" questions as educational', () => {
      const result = classifier.classify(
        'What is diabetes? An overview of Type 2 diabetes and general information about blood sugar management. ' +
        'Common causes include obesity and sedentary lifestyle.'
      );
      expect(result.classification).toBe('educational');
    });

    it('should classify health tips as educational', () => {
      const result = classifier.classify(
        'Here are some health tips for prevention of heart disease. Research suggests that ' +
        'regular exercise and a healthy diet can typically reduce risk.'
      );
      expect(result.classification).toBe('educational');
    });
  });

  // ---------------------------------------------------------------------------
  // Informational (Default)
  // ---------------------------------------------------------------------------

  describe('informational classification', () => {
    it('should classify generic content as informational', () => {
      const result = classifier.classify('Your appointment has been scheduled for next Tuesday.');
      expect(result.classification).toBe('informational');
      expect(result.requiresClinicianReview).toBe(false);
      expect(result.confidence).toBe(0.5);
    });

    it('should classify empty-ish content as informational', () => {
      const result = classifier.classify('Hello! How can I help you today?');
      expect(result.classification).toBe('informational');
    });
  });

  // ---------------------------------------------------------------------------
  // Signals
  // ---------------------------------------------------------------------------

  describe('classification signals', () => {
    it('should return keyword signals for matched terms', () => {
      const result = classifier.classify('The patient needs a referral for the assessment.');
      expect(result.signals.length).toBeGreaterThan(0);
      expect(result.signals.some(s => s.type === 'keyword')).toBe(true);
    });

    it('should include weight for each signal', () => {
      const result = classifier.classify('Recommend ordering labs and work up for anemia.');
      for (const signal of result.signals) {
        expect(signal.weight).toBeGreaterThan(0);
        expect(signal.weight).toBeLessThanOrEqual(1);
      }
    });
  });
});
