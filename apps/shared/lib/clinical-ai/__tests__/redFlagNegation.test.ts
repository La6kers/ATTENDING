/**
 * Red Flag Text Evaluator — Negation Handling Test Suite
 *
 * Verifies that the evaluator does NOT flag a critical red flag when the
 * patient or chart text explicitly negates the symptom term. This was a
 * production safety bug: a behavioral health screening reported "patient
 * denies suicidal ideation" and the system flagged it as positive SI,
 * causing false alarm escalation.
 *
 * The fix lives in apps/shared/lib/clinical-ai/redFlagTextEvaluator.ts
 * via the new isNegatedTerm() helper, which is consulted from
 * checkSingleTermMatch() before any single-term trigger fires.
 *
 * RULE: A red flag must NEVER fire on a clearly negated assertion.
 *       A red flag must STILL fire on an asserted symptom, even if the same
 *       sentence contains a separate negated symptom.
 */

import { describe, it, expect } from 'vitest';
import { evaluateTextForRedFlags, isNegatedTerm } from '../redFlagTextEvaluator';

// =============================================================================
// Unit tests — isNegatedTerm()
// =============================================================================

describe('isNegatedTerm', () => {
  describe('asserted (NOT negated) phrases', () => {
    it('treats a bare assertion as not negated', () => {
      expect(isNegatedTerm('I am suicidal', 'suicidal')).toBe(false);
    });

    it('treats first-person endorsement as not negated', () => {
      expect(isNegatedTerm('I have chest pain', 'chest pain')).toBe(false);
    });

    it('treats narrative onset as not negated', () => {
      expect(isNegatedTerm('chest pain started this morning', 'chest pain')).toBe(false);
    });
  });

  describe('explicit negation cues', () => {
    it('detects "denies suicidal ideation"', () => {
      expect(isNegatedTerm('patient denies suicidal ideation', 'suicidal')).toBe(true);
    });

    it('detects "denied SI"', () => {
      expect(isNegatedTerm('patient denied suicidal thoughts at intake', 'suicidal')).toBe(true);
    });

    it('detects "no chest pain"', () => {
      expect(isNegatedTerm('no chest pain reported', 'chest pain')).toBe(true);
    });

    it('detects "without chest pain"', () => {
      expect(isNegatedTerm('chest exam was unremarkable, without chest pain', 'chest pain')).toBe(true);
    });

    it('detects "no history of suicide"', () => {
      expect(isNegatedTerm('no history of suicide attempts', 'suicide')).toBe(true);
    });

    it('detects "negative for chest pain"', () => {
      expect(isNegatedTerm('ROS negative for chest pain', 'chest pain')).toBe(true);
    });

    it('detects "ruled out chest pain"', () => {
      expect(isNegatedTerm('ED ruled out chest pain etiology', 'chest pain')).toBe(true);
    });

    it('detects "no signs of seizure"', () => {
      expect(isNegatedTerm('no signs of seizure activity', 'seizure')).toBe(true);
    });

    it('detects "doesn\'t have chest pain"', () => {
      expect(isNegatedTerm("she doesn't have chest pain", 'chest pain')).toBe(true);
    });

    it('detects "denial of suicidal thoughts"', () => {
      expect(isNegatedTerm('mood disorder with denial of suicidal ideation', 'suicidal')).toBe(true);
    });

    it('detects multi-word "no complaints of"', () => {
      expect(isNegatedTerm('no complaints of chest pain', 'chest pain')).toBe(true);
    });
  });

  describe('clause boundaries (terminators must scope negation)', () => {
    it('does NOT carry negation across a period', () => {
      // Sentence 1 negates SI. Sentence 2 asserts chest pain. The pattern
      // we are checking (chest pain) lives in sentence 2 and is asserted.
      expect(
        isNegatedTerm('Patient denies suicidal ideation. Severe chest pain ongoing.', 'chest pain')
      ).toBe(false);
    });

    it('does NOT carry negation across a semicolon', () => {
      expect(
        isNegatedTerm('no signs of seizure; chest pain present at rest', 'chest pain')
      ).toBe(false);
    });

    it('still negates within the same clause when terminator appears LATER', () => {
      expect(
        isNegatedTerm('denies suicidal ideation but reports low mood', 'suicidal')
      ).toBe(true);
    });
  });

  describe('does not match substring lookalikes', () => {
    it('does not treat "now" as the negation cue "no"', () => {
      expect(isNegatedTerm('chest pain now severe', 'chest pain')).toBe(false);
    });

    it('does not treat "noted" as the negation cue "no"', () => {
      expect(isNegatedTerm('chest pain noted on admission', 'chest pain')).toBe(false);
    });
  });

  describe('safety bias — when in doubt, do NOT negate', () => {
    it('returns false for patterns not present in text', () => {
      expect(isNegatedTerm('patient feels well', 'suicidal')).toBe(false);
    });

    it('returns false for empty inputs', () => {
      expect(isNegatedTerm('', 'suicidal')).toBe(false);
      expect(isNegatedTerm('hello world', '')).toBe(false);
    });
  });
});

// =============================================================================
// Integration tests — evaluateTextForRedFlags() with negated phrasing
// =============================================================================

describe('evaluateTextForRedFlags — negation suppression', () => {
  describe('Suicidal ideation false-positive bug (production incident)', () => {
    it('does NOT flag rf-suicidal-ideation when patient denies SI', () => {
      const r = evaluateTextForRedFlags('Patient denies suicidal ideation and has no plan or means.');
      expect(r.flags.some(f => f.id === 'rf-suicidal-ideation')).toBe(false);
    });

    it('does NOT flag rf-suicidal-ideation on "denial of suicidal ideation"', () => {
      const r = evaluateTextForRedFlags('Mood disorder with denial of suicidal ideation noted on PHQ-9 review.');
      expect(r.flags.some(f => f.id === 'rf-suicidal-ideation')).toBe(false);
    });

    it('does NOT flag rf-suicidal-ideation on "no suicidal thoughts"', () => {
      const r = evaluateTextForRedFlags('Patient reports low mood for two weeks. No suicidal thoughts.');
      expect(r.flags.some(f => f.id === 'rf-suicidal-ideation')).toBe(false);
    });

    it('does NOT flag rf-suicidal-ideation on "patient denied SI at intake"', () => {
      const r = evaluateTextForRedFlags('Patient denied suicide ideation at intake interview.');
      expect(r.flags.some(f => f.id === 'rf-suicidal-ideation')).toBe(false);
    });

    it('STILL flags rf-suicidal-ideation when patient asserts SI', () => {
      const r = evaluateTextForRedFlags('I am suicidal and I have a plan to end my life.');
      expect(r.flags.some(f => f.id === 'rf-suicidal-ideation')).toBe(true);
    });

    it('STILL flags rf-suicidal-ideation across clause boundaries', () => {
      // First clause negates a different symptom; SI is asserted in second clause.
      const r = evaluateTextForRedFlags('No fever or cough. I want to die and have been making plans.');
      expect(r.flags.some(f => f.id === 'rf-suicidal-ideation')).toBe(true);
    });
  });

  describe('Other negated single-term triggers', () => {
    it('does NOT flag chest pain trigger when patient denies it', () => {
      const r = evaluateTextForRedFlags('Patient denies chest pain, shortness of breath, or palpitations.');
      // None of these symptoms should trigger their respective flags.
      const ids = r.flags.map(f => f.id);
      expect(ids).not.toContain('rf-chest-pain-cardiac');
    });

    it('does NOT flag syncope when patient never lost consciousness', () => {
      const r = evaluateTextForRedFlags('Patient has not passed out and denies syncope.');
      const ids = r.flags.map(f => f.id);
      expect(ids).not.toContain('rf-syncope');
    });

    it('does NOT flag seizure when ROS is negative for seizure', () => {
      const r = evaluateTextForRedFlags('ROS negative for seizure activity, weakness, or numbness.');
      const ids = r.flags.map(f => f.id);
      expect(ids).not.toContain('rf-seizure');
    });
  });

  describe('Negation does NOT silence asserted symptoms in the same note', () => {
    it('flags asserted chest pain even when SI is denied', () => {
      const r = evaluateTextForRedFlags(
        'Patient denies suicidal ideation. Reports crushing chest pain radiating to left arm.'
      );
      // SI must NOT fire
      expect(r.flags.some(f => f.id === 'rf-suicidal-ideation')).toBe(false);
      // Cardiac chest pain SHOULD still fire
      expect(r.flags.some(f => f.id === 'rf-chest-pain-cardiac')).toBe(true);
    });
  });
});
