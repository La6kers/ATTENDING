// ============================================================
// ATTENDING AI — Intelligent Workup Pipeline
// Orchestrates: scoring tools → conditional workup → consolidation
// → Choosing Wisely filters → evidence grading → prioritization
//
// This replaces static workup lookup with a 7-layer pipeline:
// 1. Base workup from diagnosis-specific maps
// 2. Clinical scoring tools modify (add/remove tests)
// 3. Consolidation across differentials (dedup + set-cover)
// 4. Choosing Wisely "do not order" filters
// 5. Evidence grade attachment
// 6. Priority sorting (STAT → urgent → routine)
// 7. Rationale generation
// ============================================================

import type { PatientPresentation, DifferentialDiagnosis } from './differentialDiagnosis';
import { applyRelevantScoringTools, type ScoringResult, type WorkupModification } from './clinicalScoringTools';
import { checkChoosingWisely, type ChoosingWiselyAlert } from './choosingWisely';

// ============================================================
// Types
// ============================================================

export type EvidenceGrade = 'strong-high' | 'strong-moderate' | 'conditional' | 'expert-opinion';
export type Priority = 'stat' | 'urgent' | 'routine';

export interface WorkupItem {
  name: string;
  priority: Priority;
  evidenceGrade: EvidenceGrade;
  rationale: string;
  source?: string;
  coveredDiagnoses: string[];
  choosingWiselyFlag?: boolean;
  conditionalOn?: string;
}

export interface IntelligentWorkup {
  labs: WorkupItem[];
  imaging: WorkupItem[];
  procedures: WorkupItem[];
  consults: WorkupItem[];
  choosingWiselyAlerts: ChoosingWiselyAlert[];
  scoringToolResults: ScoringResult[];
  consolidationSummary: string;
}

// ============================================================
// Evidence Grade Database
// Maps test names to their evidence strength
// ============================================================

const EVIDENCE_GRADES: Record<string, { grade: EvidenceGrade; source: string }> = {
  // Labs — strong evidence
  'troponin': { grade: 'strong-high', source: 'AHA/ACC 2021' },
  'd-dimer': { grade: 'strong-high', source: 'Wells et al. 2001' },
  'cbc': { grade: 'strong-moderate', source: 'Standard of care' },
  'bmp': { grade: 'strong-moderate', source: 'Standard of care' },
  'bnp': { grade: 'strong-high', source: 'Wang JAMA 2005' },
  'procalcitonin': { grade: 'strong-high', source: 'Schuetz Cochrane 2017' },
  'lactate': { grade: 'strong-high', source: 'Surviving Sepsis 2021' },
  'tsh': { grade: 'strong-high', source: 'AAFP/ATA Guidelines' },
  'lipase': { grade: 'strong-high', source: 'ACG Guidelines 2013' },
  'urinalysis': { grade: 'strong-high', source: 'IDSA Guidelines' },
  'rapid strep': { grade: 'strong-high', source: 'IDSA/AHA 2012' },
  'blood cultures': { grade: 'strong-high', source: 'Surviving Sepsis 2021' },
  'hcg': { grade: 'strong-high', source: 'ACOG Guidelines' },
  'uric acid': { grade: 'strong-moderate', source: 'ACR/EULAR 2015' },
  'esr': { grade: 'strong-moderate', source: 'ACR Guidelines' },
  'crp': { grade: 'strong-moderate', source: 'ACR Guidelines' },
  'phq-9': { grade: 'strong-high', source: 'Kroenke JGIM 2001' },
  'gad-7': { grade: 'strong-high', source: 'Spitzer et al. 2006' },
  // Imaging
  'ecg': { grade: 'strong-high', source: 'AHA/ACC 2021' },
  'chest x-ray': { grade: 'strong-high', source: 'Standard of care' },
  'ct pulmonary angiogram': { grade: 'strong-high', source: 'PIOPED II Study' },
  'ct head': { grade: 'strong-high', source: 'ACR Appropriateness' },
  'mri brain': { grade: 'strong-moderate', source: 'AAN Guidelines' },
  'mri knee': { grade: 'strong-moderate', source: 'ACR Appropriateness' },
  'mri lumbar': { grade: 'strong-moderate', source: 'ACP/APS 2007' },
  'x-ray knee': { grade: 'strong-high', source: 'Ottawa Rules, Stiell 1996' },
  'ct abdomen': { grade: 'strong-high', source: 'ACR Appropriateness' },
  'ultrasound': { grade: 'strong-moderate', source: 'ACR Appropriateness' },
  'echocardiogram': { grade: 'strong-moderate', source: 'AHA/ACC' },
  // Procedures
  'lumbar puncture': { grade: 'strong-high', source: 'ACR/IDSA' },
  'joint aspiration': { grade: 'strong-high', source: 'ACR/EULAR 2015' },
  'mcmurray test': { grade: 'conditional', source: 'Solomon JAMA 2001' },
  'straight leg raise': { grade: 'strong-moderate', source: 'Devillé et al. 2000' },
  'lachman test': { grade: 'strong-high', source: 'Benjaminse BJSM 2006' },
};

function getEvidenceGrade(testName: string): { grade: EvidenceGrade; source: string } {
  const lower = testName.toLowerCase();
  for (const [key, value] of Object.entries(EVIDENCE_GRADES)) {
    if (lower.includes(key)) return value;
  }
  return { grade: 'expert-opinion', source: 'Clinical consensus' };
}

// ============================================================
// Priority Assignment
// ============================================================

function getPriority(testName: string, urgency: string): Priority {
  const lower = testName.toLowerCase();
  if (lower.includes('stat') || lower.includes('(stat)')) return 'stat';
  if (urgency === 'emergent') return 'stat';
  if (/troponin|lactate|blood\s*culture|type.*screen|hcg.*stat/i.test(lower)) return 'stat';
  if (urgency === 'urgent' || /serial|urgent/i.test(lower)) return 'urgent';
  return 'routine';
}

// ============================================================
// Workup Consolidation (Set-Cover)
// ============================================================

function consolidateTests(
  differentials: DifferentialDiagnosis[],
  category: 'labs' | 'imaging' | 'procedures' | 'consults'
): WorkupItem[] {
  const testMap = new Map<string, WorkupItem>();

  for (const dx of differentials) {
    const tests = dx.recommendedWorkup[category] || [];
    for (const test of tests) {
      const normalized = test.toLowerCase().trim();
      const existing = testMap.get(normalized);

      if (existing) {
        // Add this diagnosis to the coverage list
        if (!existing.coveredDiagnoses.includes(dx.diagnosis)) {
          existing.coveredDiagnoses.push(dx.diagnosis);
        }
        // Upgrade priority if this diagnosis is more urgent
        const newPriority = getPriority(test, dx.urgency);
        if (newPriority === 'stat' || (newPriority === 'urgent' && existing.priority === 'routine')) {
          existing.priority = newPriority;
        }
      } else {
        const evidence = getEvidenceGrade(test);
        testMap.set(normalized, {
          name: test,
          priority: getPriority(test, dx.urgency),
          evidenceGrade: evidence.grade,
          rationale: `For ${dx.diagnosis} (${dx.confidence}% confidence)`,
          source: evidence.source,
          coveredDiagnoses: [dx.diagnosis],
        });
      }
    }
  }

  // Sort: STAT first, then by number of diagnoses covered (most useful tests first)
  const items = Array.from(testMap.values());
  items.sort((a, b) => {
    const priorityOrder = { stat: 0, urgent: 1, routine: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.coveredDiagnoses.length - a.coveredDiagnoses.length;
  });

  return items;
}

// ============================================================
// Main Pipeline
// ============================================================

/**
 * Generate intelligent workup recommendations using the full 7-layer pipeline.
 *
 * @param presentation - patient data from the assessment
 * @param differentials - ranked differential diagnoses from the Bayesian engine
 * @returns IntelligentWorkup with evidence-graded, prioritized, consolidated recommendations
 */
export function generateIntelligentWorkup(
  presentation: PatientPresentation,
  differentials: DifferentialDiagnosis[]
): IntelligentWorkup {
  const topDifferentials = differentials.slice(0, 5); // Focus on top 5

  // --- Layer 1: Run clinical scoring tools ---
  const scoringResults = applyRelevantScoringTools(presentation);

  // --- Layer 2: Consolidate workup across differentials (dedup + set-cover) ---
  let labs = consolidateTests(topDifferentials, 'labs');
  let imaging = consolidateTests(topDifferentials, 'imaging');
  let procedures = consolidateTests(topDifferentials, 'procedures');
  let consults = consolidateTests(topDifferentials, 'consults');

  // --- Layer 3: Apply scoring tool modifications ---
  for (const result of scoringResults) {
    const mod = result.workupModification;

    // Add tests recommended by scoring tools
    if (mod.add) {
      for (const test of mod.add.labs || []) {
        if (!labs.some(l => l.name.toLowerCase().includes(test.toLowerCase().slice(0, 10)))) {
          const ev = getEvidenceGrade(test);
          labs.push({
            name: test,
            priority: result.riskLevel === 'very-high' ? 'stat' : result.riskLevel === 'high' ? 'urgent' : 'routine',
            evidenceGrade: ev.grade,
            rationale: `${result.toolName}: ${result.interpretation}`,
            source: result.source,
            coveredDiagnoses: [],
          });
        }
      }
      for (const test of mod.add.imaging || []) {
        if (!imaging.some(i => i.name.toLowerCase().includes(test.toLowerCase().slice(0, 10)))) {
          const ev = getEvidenceGrade(test);
          imaging.push({
            name: test,
            priority: result.riskLevel === 'very-high' ? 'stat' : 'routine',
            evidenceGrade: ev.grade,
            rationale: `${result.toolName}: ${result.interpretation}`,
            source: result.source,
            coveredDiagnoses: [],
          });
        }
      }
      for (const test of mod.add.procedures || []) {
        if (!procedures.some(p => p.name.toLowerCase().includes(test.toLowerCase().slice(0, 10)))) {
          procedures.push({
            name: test,
            priority: result.riskLevel === 'very-high' ? 'stat' : 'routine',
            evidenceGrade: 'strong-moderate',
            rationale: `${result.toolName}: ${result.interpretation}`,
            source: result.source,
            coveredDiagnoses: [],
          });
        }
      }
      for (const test of mod.add.consults || []) {
        if (!consults.some(c => c.name.toLowerCase().includes(test.toLowerCase().slice(0, 10)))) {
          consults.push({
            name: test,
            priority: result.riskLevel === 'very-high' ? 'stat' : 'routine',
            evidenceGrade: 'strong-moderate',
            rationale: `${result.toolName}`,
            source: result.source,
            coveredDiagnoses: [],
          });
        }
      }
    }

    // Remove tests contraindicated by scoring tools
    if (mod.remove) {
      for (const pattern of mod.remove.imaging || []) {
        const pat = pattern.toLowerCase();
        imaging = imaging.filter(i => !i.name.toLowerCase().includes(pat.slice(0, 10)));
      }
      for (const pattern of mod.remove.labs || []) {
        const pat = pattern.toLowerCase();
        labs = labs.filter(l => !l.name.toLowerCase().includes(pat.slice(0, 10)));
      }
    }
  }

  // --- Layer 4: Apply Choosing Wisely filters ---
  const allTestNames = [
    ...labs.map(l => l.name),
    ...imaging.map(i => i.name),
    ...procedures.map(p => p.name),
  ];
  const choosingWiselyAlerts = checkChoosingWisely(presentation, allTestNames);

  // Flag tests but don't remove them — let the physician decide
  for (const alert of choosingWiselyAlerts) {
    const flagTest = (items: WorkupItem[]) => {
      for (const item of items) {
        if (item.name.toLowerCase().includes(alert.testFlagged.toLowerCase().slice(0, 10)) ||
            alert.testFlagged.toLowerCase().includes(item.name.toLowerCase().slice(0, 10))) {
          item.choosingWiselyFlag = true;
          item.conditionalOn = alert.alternative;
        }
      }
    };
    flagTest(labs);
    flagTest(imaging);
    flagTest(procedures);
  }

  // --- Layer 5: Build consolidation summary ---
  const totalTests = labs.length + imaging.length + procedures.length;
  const coveredDx = new Set<string>();
  [...labs, ...imaging, ...procedures, ...consults].forEach(item =>
    item.coveredDiagnoses.forEach(dx => coveredDx.add(dx))
  );
  const consolidationSummary = `${totalTests} tests covering ${coveredDx.size} differential diagnoses`;

  return {
    labs,
    imaging,
    procedures,
    consults,
    choosingWiselyAlerts,
    scoringToolResults: scoringResults,
    consolidationSummary,
  };
}

// ============================================================
// Format for legacy recommendedActions[] compatibility
// ============================================================

/**
 * Convert IntelligentWorkup to the legacy string[] format
 * used by DifferentialDiagnosisResult.recommendedActions
 */
export function formatWorkupAsActions(workup: IntelligentWorkup): string[] {
  const actions: string[] = [];

  // Scoring tool results first
  for (const result of workup.scoringToolResults) {
    for (const note of result.workupModification.notes) {
      actions.push(note);
    }
  }

  // STAT items
  const statItems = [
    ...workup.labs.filter(l => l.priority === 'stat'),
    ...workup.imaging.filter(i => i.priority === 'stat'),
  ];
  if (statItems.length > 0) {
    actions.push(`STAT: ${statItems.map(i => i.name).join(', ')}`);
  }

  // Routine labs
  const routineLabs = workup.labs.filter(l => l.priority !== 'stat');
  if (routineLabs.length > 0) {
    actions.push(`Labs: ${routineLabs.map(l => l.name).join(', ')}`);
  }

  // Imaging
  const routineImaging = workup.imaging.filter(i => i.priority !== 'stat');
  if (routineImaging.length > 0) {
    actions.push(`Imaging: ${routineImaging.map(i => i.name).join(', ')}`);
  }

  // Procedures/exam
  if (workup.procedures.length > 0) {
    actions.push(`Exam: ${workup.procedures.map(p => p.name).join(', ')}`);
  }

  // Consults
  if (workup.consults.length > 0) {
    actions.push(`Referral: ${workup.consults.map(c => c.name).join(', ')}`);
  }

  // Choosing Wisely alerts
  for (const alert of workup.choosingWiselyAlerts) {
    actions.push(`⚠ Choosing Wisely: ${alert.description}`);
  }

  // Safety net
  actions.push('Follow up if symptoms worsen or new symptoms develop');

  return actions;
}
