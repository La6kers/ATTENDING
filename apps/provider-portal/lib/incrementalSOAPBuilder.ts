/**
 * IncrementalSOAPBuilder
 *
 * Builds SOAP (Subjective, Objective, Assessment, Plan) note sections
 * progressively during the encounter, rather than generating the entire
 * note at the end. Ingests data from ambient transcripts, COMPASS
 * assessments, diagnoses, vitals, and direct provider input.
 */

export type SOAPSection = 'subjective' | 'objective' | 'assessment' | 'plan';

export interface SOAPEntry {
  section: SOAPSection;
  content: string;
  source: 'ambient' | 'compass' | 'provider' | 'ai' | 'ehr';
  timestamp: number;
  confidence: number; // 0-1
}

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  entries: SOAPEntry[];
  lastUpdated: number;
  completeness: Record<SOAPSection, number>; // 0-100%
}

export interface SOAPUpdateEvent {
  section: SOAPSection;
  content: string;
  source: SOAPEntry['source'];
}

const SUBJECTIVE_TRIGGERS = [
  'i feel',
  'it hurts',
  'started',
  'worse when',
  'history of',
  'allergic to',
];

const OBJECTIVE_TRIGGERS = [
  'blood pressure',
  'heart rate',
  'exam shows',
  'lungs clear',
  'abdomen soft',
];

const ASSESSMENT_TRIGGERS = [
  'looks like',
  'consistent with',
  'diagnosis',
  'likely',
  'rule out',
];

const PLAN_TRIGGERS = [
  'prescribe',
  'order',
  'refer',
  'follow up',
  'return if',
  'discharge',
];

function matchesTriggers(text: string, triggers: string[]): boolean {
  const lower = text.toLowerCase();
  return triggers.some((trigger) => lower.includes(trigger));
}

export class IncrementalSOAPBuilder {
  private entries: SOAPEntry[] = [];
  private note: SOAPNote = {
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    entries: [],
    lastUpdated: Date.now(),
    completeness: { subjective: 0, objective: 0, assessment: 0, plan: 0 },
  };

  /**
   * Adds a new entry to the appropriate section, recalculates completeness,
   * and rebuilds the section text.
   */
  addEntry(event: SOAPUpdateEvent): void {
    const entry: SOAPEntry = {
      section: event.section,
      content: event.content,
      source: event.source,
      timestamp: Date.now(),
      confidence: 1,
    };

    this.entries.push(entry);
    this.note.entries = [...this.entries];
    this.rebuildSection(event.section);
    this.recalculateCompleteness();
    this.note.lastUpdated = Date.now();
  }

  /**
   * Parses an ambient transcript line and classifies it into the appropriate
   * SOAP section using keyword matching.
   *
   * Patient statements map to Subjective; provider observations to Objective;
   * provider assessments to Assessment; provider plans to Plan.
   */
  ingestAmbientTranscript(speaker: string, text: string): void {
    const isPatient = speaker.toLowerCase() === 'patient';
    const trimmed = text.trim();
    if (!trimmed) return;

    if (isPatient) {
      // Patient statements go to Subjective
      this.addEntry({ section: 'subjective', content: trimmed, source: 'ambient' });
      return;
    }

    // Provider statements - classify by keyword triggers
    let classified = false;

    if (matchesTriggers(trimmed, OBJECTIVE_TRIGGERS)) {
      this.addEntry({ section: 'objective', content: trimmed, source: 'ambient' });
      classified = true;
    }

    if (matchesTriggers(trimmed, ASSESSMENT_TRIGGERS)) {
      this.addEntry({ section: 'assessment', content: trimmed, source: 'ambient' });
      classified = true;
    }

    if (matchesTriggers(trimmed, PLAN_TRIGGERS)) {
      this.addEntry({ section: 'plan', content: trimmed, source: 'ambient' });
      classified = true;
    }

    if (matchesTriggers(trimmed, SUBJECTIVE_TRIGGERS)) {
      this.addEntry({ section: 'subjective', content: trimmed, source: 'ambient' });
      classified = true;
    }

    // If no triggers matched, default to objective for provider statements
    if (!classified) {
      this.addEntry({ section: 'objective', content: trimmed, source: 'ambient' });
    }
  }

  /**
   * Maps COMPASS OLDCARTS assessment data directly into the Subjective section
   * in a structured clinical format.
   */
  ingestCompassData(compassData: {
    onset?: string;
    location?: string;
    duration?: string;
    character?: string;
    aggravating?: string;
    relieving?: string;
    timing?: string;
    severity?: string | number;
    associatedSymptoms?: string;
  }): void {
    const lines: string[] = [];

    const { onset, location, duration, character, severity, aggravating, relieving, timing, associatedSymptoms } =
      compassData;

    if (onset || location || duration) {
      const parts: string[] = [];
      if (onset) parts.push(`Onset: ${onset}`);
      if (location) parts.push(`Location: ${location}`);
      if (duration) parts.push(`Duration: ${duration}`);
      lines.push(parts.join('. ') + '.');
    }

    if (character || severity !== undefined) {
      const parts: string[] = [];
      if (character) parts.push(`Character: ${character}`);
      if (severity !== undefined) parts.push(`Severity: ${severity}/10`);
      lines.push(parts.join('. ') + '.');
    }

    if (timing) {
      lines.push(`Timing: ${timing}.`);
    }

    if (aggravating || relieving) {
      const parts: string[] = [];
      if (aggravating) parts.push(`Aggravating factors: ${aggravating}`);
      if (relieving) parts.push(`Relieving factors: ${relieving}`);
      lines.push(parts.join('. ') + '.');
    }

    if (associatedSymptoms) {
      lines.push(`Associated symptoms: ${associatedSymptoms}.`);
    }

    if (lines.length > 0) {
      this.addEntry({
        section: 'subjective',
        content: lines.join('\n'),
        source: 'compass',
      });
    }
  }

  /**
   * Maps selected diagnoses into the Assessment section.
   * Format: "1. [name] (ICD-10: [icdCode]) - [probability]% confidence"
   */
  ingestDiagnoses(
    diagnoses: Array<{ name: string; icdCode: string; probability: number; selected: boolean }>
  ): void {
    const selected = diagnoses.filter((d) => d.selected);
    if (selected.length === 0) return;

    const lines = selected.map(
      (d, i) => `${i + 1}. ${d.name} (ICD-10: ${d.icdCode}) - ${d.probability}% confidence`
    );

    this.addEntry({
      section: 'assessment',
      content: lines.join('\n'),
      source: 'ai',
    });
  }

  /**
   * Maps vitals into the Objective section.
   * Format: "Vitals: BP [bp], HR [hr], Temp [temp]F, RR [rr], SpO2 [spo2]%"
   */
  ingestVitals(vitals: {
    bp: string;
    hr: string | number;
    temp: string | number;
    rr: string | number;
    spo2: string | number;
    weight?: string | number;
    height?: string | number;
  }): void {
    let line = `Vitals: BP ${vitals.bp}, HR ${vitals.hr}, Temp ${vitals.temp}F, RR ${vitals.rr}, SpO2 ${vitals.spo2}%`;

    if (vitals.weight !== undefined) {
      line += `, Weight ${vitals.weight}`;
    }
    if (vitals.height !== undefined) {
      line += `, Height ${vitals.height}`;
    }

    this.addEntry({
      section: 'objective',
      content: line,
      source: 'ehr',
    });
  }

  /**
   * Returns the current compiled SOAP note.
   */
  getNote(): SOAPNote {
    return { ...this.note, entries: [...this.entries] };
  }

  /**
   * Returns completeness percentages for each section.
   * - Subjective: has HPI + ROS data
   * - Objective: has vitals + at least one exam finding
   * - Assessment: has at least one diagnosis
   * - Plan: has at least one intervention
   */
  getCompleteness(): Record<SOAPSection, number> {
    return { ...this.note.completeness };
  }

  /**
   * Returns the SOAP note formatted as plain clinical text.
   */
  exportAsClinicalText(): string {
    return [
      'SUBJECTIVE:',
      this.note.subjective || '(No data)',
      '',
      'OBJECTIVE:',
      this.note.objective || '(No data)',
      '',
      'ASSESSMENT:',
      this.note.assessment || '(No data)',
      '',
      'PLAN:',
      this.note.plan || '(No data)',
    ].join('\n');
  }

  // ---- Private helpers ----

  private rebuildSection(section: SOAPSection): void {
    const sectionEntries = this.entries.filter((e) => e.section === section);
    const text = sectionEntries.map((e) => e.content).join('\n');
    this.note[section] = text;
  }

  private recalculateCompleteness(): void {
    this.note.completeness = {
      subjective: this.calcSubjectiveCompleteness(),
      objective: this.calcObjectiveCompleteness(),
      assessment: this.calcAssessmentCompleteness(),
      plan: this.calcPlanCompleteness(),
    };
  }

  private calcSubjectiveCompleteness(): number {
    const entries = this.entries.filter((e) => e.section === 'subjective');
    if (entries.length === 0) return 0;

    let score = 0;
    const text = this.note.subjective.toLowerCase();

    // HPI data present (from COMPASS or ambient)
    const hasHPI =
      entries.some((e) => e.source === 'compass') ||
      text.includes('onset') ||
      text.includes('duration') ||
      text.includes('started');
    if (hasHPI) score += 50;

    // ROS / symptom data
    const hasROS =
      text.includes('associated symptoms') ||
      text.includes('denies') ||
      text.includes('reports') ||
      entries.length >= 2;
    if (hasROS) score += 50;

    // At least some content gets a minimum score
    if (score === 0 && entries.length > 0) score = 20;

    return Math.min(score, 100);
  }

  private calcObjectiveCompleteness(): number {
    const entries = this.entries.filter((e) => e.section === 'objective');
    if (entries.length === 0) return 0;

    let score = 0;
    const text = this.note.objective.toLowerCase();

    // Vitals present
    const hasVitals = text.includes('vitals:') || text.includes('blood pressure') || text.includes('heart rate');
    if (hasVitals) score += 50;

    // At least one exam finding
    const hasExam =
      text.includes('exam') ||
      text.includes('lungs') ||
      text.includes('abdomen') ||
      text.includes('clear') ||
      text.includes('normal');
    if (hasExam) score += 50;

    if (score === 0 && entries.length > 0) score = 20;

    return Math.min(score, 100);
  }

  private calcAssessmentCompleteness(): number {
    const entries = this.entries.filter((e) => e.section === 'assessment');
    if (entries.length === 0) return 0;

    const text = this.note.assessment.toLowerCase();

    // Has at least one diagnosis
    const hasDiagnosis =
      text.includes('icd-10') || text.includes('diagnosis') || text.includes('consistent with');
    if (hasDiagnosis) return 100;

    return 50;
  }

  private calcPlanCompleteness(): number {
    const entries = this.entries.filter((e) => e.section === 'plan');
    if (entries.length === 0) return 0;

    const text = this.note.plan.toLowerCase();

    // Has at least one intervention
    const hasIntervention =
      text.includes('prescribe') ||
      text.includes('order') ||
      text.includes('refer') ||
      text.includes('follow up') ||
      text.includes('discharge');
    if (hasIntervention) return 100;

    return 50;
  }
}

/**
 * Factory function to create a new IncrementalSOAPBuilder instance.
 */
export function createSOAPBuilder(): IncrementalSOAPBuilder {
  return new IncrementalSOAPBuilder();
}
