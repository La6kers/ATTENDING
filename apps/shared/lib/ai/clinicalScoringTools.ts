// ============================================================
// ATTENDING AI — Clinical Scoring Tools
// Validated clinical decision rules that GATE workup recommendations
// These determine WHETHER to order a test, not just WHAT to order
//
// Sources: MDCalc, original validation studies
// ============================================================

import type { PatientPresentation, VitalSigns } from './differentialDiagnosis';

// ============================================================
// Types
// ============================================================

export interface ScoringResult {
  toolId: string;
  toolName: string;
  score: number;
  maxScore: number;
  interpretation: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'very-high';
  workupModification: WorkupModification;
  components: { criterion: string; met: boolean; points: number }[];
  source: string;
}

export interface WorkupModification {
  add?: { labs?: string[]; imaging?: string[]; procedures?: string[]; consults?: string[] };
  remove?: { imaging?: string[]; labs?: string[] };
  notes: string[];
}

interface ScoringTool {
  id: string;
  name: string;
  appliesTo: (presentation: PatientPresentation) => boolean;
  calculate: (presentation: PatientPresentation) => ScoringResult;
}

// ============================================================
// Helper: extract info from presentation
// ============================================================

function cc(p: PatientPresentation): string { return p.chiefComplaint.toLowerCase(); }
function symptomText(p: PatientPresentation): string {
  return [p.chiefComplaint, ...p.symptoms.map(s => s.name)].join(' ').toLowerCase();
}
function answers(p: PatientPresentation): Record<string, string> {
  return p.symptomSpecificAnswers || {};
}
function age(p: PatientPresentation): number { return p.demographics.age; }
function vitals(p: PatientPresentation): VitalSigns | undefined { return p.vitals; }

// ============================================================
// Scoring Tools
// ============================================================

const SCORING_TOOLS: ScoringTool[] = [

  // ================================================================
  // OTTAWA KNEE RULES — When to X-ray a knee injury
  // Sensitivity 98.5% for fractures (Stiell, JAMA 1996)
  // ================================================================
  {
    id: 'ottawa_knee',
    name: 'Ottawa Knee Rules',
    appliesTo: (p) => /knee/i.test(cc(p)),
    calculate: (p) => {
      const a = answers(p);
      const st = symptomText(p);
      const components: ScoringResult['components'] = [];
      let score = 0;

      const ageOver55 = age(p) >= 55;
      components.push({ criterion: 'Age ≥ 55', met: ageOver55, points: ageOver55 ? 1 : 0 });
      if (ageOver55) score++;

      const isolatedPatella = /patella|kneecap|front/i.test(a.knee_pain_location || '');
      components.push({ criterion: 'Isolated patellar tenderness', met: isolatedPatella, points: isolatedPatella ? 1 : 0 });
      if (isolatedPatella) score++;

      const fibularHead = /lateral|outside/i.test(a.knee_pain_location || '') && /direct|blow|fall/i.test(a.knee_mechanism || '');
      components.push({ criterion: 'Fibular head tenderness', met: fibularHead, points: fibularHead ? 1 : 0 });
      if (fibularHead) score++;

      const cantBearWeight = /unable|cannot|difficult/i.test(a.knee_weight_bearing || '');
      components.push({ criterion: 'Inability to bear weight (4 steps)', met: cantBearWeight, points: cantBearWeight ? 1 : 0 });
      if (cantBearWeight) score++;

      const cantFlex = /lock|catch|stiff/i.test(a.knee_locking || '') || /unable/i.test(a.knee_weight_bearing || '');
      components.push({ criterion: 'Inability to flex to 90°', met: cantFlex, points: cantFlex ? 1 : 0 });
      if (cantFlex) score++;

      const positive = score >= 1;
      return {
        toolId: 'ottawa_knee',
        toolName: 'Ottawa Knee Rules',
        score,
        maxScore: 5,
        interpretation: positive
          ? `Positive (${score}/5 criteria met) — X-ray indicated to rule out fracture`
          : 'Negative (0/5 criteria) — X-ray NOT indicated. Sensitivity 98.5% for fractures.',
        riskLevel: positive ? 'moderate' : 'low',
        workupModification: positive
          ? { add: { imaging: ['X-ray knee (AP, lateral — Ottawa Rules positive)'] }, notes: [`Ottawa Knee Rules positive (${score}/5) — imaging recommended`] }
          : { remove: { imaging: ['X-ray knee'] }, notes: ['Ottawa Knee Rules negative — radiography not indicated (98.5% sensitivity for fractures, Stiell JAMA 1996)'] },
        components,
        source: 'Stiell et al. JAMA 1996; Ann Emerg Med 1997',
      };
    },
  },

  // ================================================================
  // WELLS SCORE FOR PE — D-dimer vs CT-PA decision
  // ================================================================
  {
    id: 'wells_pe',
    name: 'Wells Score (PE)',
    appliesTo: (p) => /chest\s*pain|shortness.*breath|dyspnea|sob|hemoptysis|calf.*pain|leg.*swell/i.test(cc(p)),
    calculate: (p) => {
      const st = symptomText(p);
      const a = answers(p);
      const v = vitals(p);
      const components: ScoringResult['components'] = [];
      let score = 0;

      const tachycardia = !!(v?.heartRate && v.heartRate > 100);
      components.push({ criterion: 'Heart rate > 100', met: tachycardia, points: tachycardia ? 1.5 : 0 });
      if (tachycardia) score += 1.5;

      const immobilization = /surgery|immobil|bed\s*rest|cast|recent\s*surgery/i.test(st);
      components.push({ criterion: 'Recent surgery/immobilization', met: immobilization, points: immobilization ? 1.5 : 0 });
      if (immobilization) score += 1.5;

      const hemoptysis = /blood.*cough|cough.*blood|hemoptysis/i.test(st);
      components.push({ criterion: 'Hemoptysis', met: hemoptysis, points: hemoptysis ? 1 : 0 });
      if (hemoptysis) score++;

      const calfSwelling = /calf.*pain|calf.*swell|leg.*swell|dvt/i.test(st) || /calf/i.test(a.sob_leg_symptoms || '');
      components.push({ criterion: 'Signs/symptoms of DVT', met: calfSwelling, points: calfSwelling ? 3 : 0 });
      if (calfSwelling) score += 3;

      const peMoreLikely = /chest.*pain.*sudden|sudden.*sob|pleuritic/i.test(st);
      components.push({ criterion: 'PE most likely diagnosis', met: peMoreLikely, points: peMoreLikely ? 3 : 0 });
      if (peMoreLikely) score += 3;

      let riskLevel: ScoringResult['riskLevel'] = 'low';
      let interpretation = '';
      let modification: WorkupModification;

      if (score <= 4) {
        riskLevel = 'low';
        interpretation = `Low probability (${score} points) — D-dimer first. If negative, PE safely excluded.`;
        modification = {
          add: { labs: ['D-dimer (Wells ≤4 — low probability)'] },
          remove: { imaging: ['CT Pulmonary Angiogram'] },
          notes: ['Wells PE Score ≤4 — start with D-dimer before CT-PA'],
        };
      } else {
        riskLevel = score > 6 ? 'very-high' : 'high';
        interpretation = `High probability (${score} points) — CT Pulmonary Angiogram indicated. Do NOT use D-dimer to exclude.`;
        modification = {
          add: { imaging: ['CT Pulmonary Angiogram (Wells >4 — high probability)'], labs: ['D-dimer', 'Troponin', 'BNP'] },
          notes: [`Wells PE Score ${score} (>4) — D-dimer unreliable, proceed to CT-PA`],
        };
      }

      return {
        toolId: 'wells_pe', toolName: 'Wells Score (PE)', score, maxScore: 12.5,
        interpretation, riskLevel, workupModification: modification, components,
        source: 'Wells et al. Ann Intern Med 2001',
      };
    },
  },

  // ================================================================
  // CENTOR SCORE — Sore throat management
  // ================================================================
  {
    id: 'centor',
    name: 'Centor Score (Modified)',
    appliesTo: (p) => /sore\s*throat|throat\s*pain|pharyngitis|tonsilitis/i.test(cc(p)),
    calculate: (p) => {
      const st = symptomText(p);
      const a = answers(p);
      const components: ScoringResult['components'] = [];
      let score = 0;

      const fever = /fever/i.test(st);
      components.push({ criterion: 'Fever or history of fever', met: fever, points: fever ? 1 : 0 });
      if (fever) score++;

      const noTonsilExudate = !/exudate|pus|white\s*patch/i.test(st);
      const tonsilExudate = !noTonsilExudate;
      components.push({ criterion: 'Tonsillar exudates', met: tonsilExudate, points: tonsilExudate ? 1 : 0 });
      if (tonsilExudate) score++;

      const noCough = !/cough/i.test(st);
      components.push({ criterion: 'Absence of cough', met: noCough, points: noCough ? 1 : 0 });
      if (noCough) score++;

      const anteriorCervical = /swollen.*gland|lymph|neck.*lump/i.test(st);
      components.push({ criterion: 'Tender anterior cervical lymphadenopathy', met: anteriorCervical, points: anteriorCervical ? 1 : 0 });
      if (anteriorCervical) score++;

      // Age modifier
      const agePoints = age(p) < 15 ? 1 : age(p) > 44 ? -1 : 0;
      components.push({ criterion: `Age modifier (${age(p)}yo)`, met: agePoints !== 0, points: agePoints });
      score += agePoints;
      score = Math.max(score, 0);

      let interpretation = '';
      let modification: WorkupModification;
      let riskLevel: ScoringResult['riskLevel'] = 'low';

      if (score <= 1) {
        interpretation = `Low risk (${score}) — No testing or antibiotics needed. Viral pharyngitis likely.`;
        riskLevel = 'low';
        modification = { remove: { labs: ['Rapid strep', 'Throat culture'] }, notes: ['Centor ≤1 — testing not indicated. Supportive care only.'] };
      } else if (score <= 3) {
        interpretation = `Moderate risk (${score}) — Rapid antigen detection test recommended.`;
        riskLevel = 'moderate';
        modification = { add: { labs: ['Rapid strep antigen test'] }, notes: [`Centor ${score} — rapid strep indicated. Treat only if positive.`] };
      } else {
        interpretation = `High risk (${score}) — Consider empiric antibiotics or test and treat.`;
        riskLevel = 'high';
        modification = { add: { labs: ['Rapid strep antigen test', 'Throat culture (if rapid negative)'] }, notes: [`Centor ${score} — high probability GAS. Consider empiric treatment.`] };
      }

      return {
        toolId: 'centor', toolName: 'Centor Score (Modified)', score, maxScore: 5,
        interpretation, riskLevel, workupModification: modification, components,
        source: 'McIsaac et al. CMAJ 2004; Centor et al. Med Decis Making 1981',
      };
    },
  },

  // ================================================================
  // HEART SCORE — Chest pain risk stratification
  // ================================================================
  {
    id: 'heart_score',
    name: 'HEART Score',
    appliesTo: (p) => /chest\s*(pain|pressure|tightness|heaviness)/i.test(cc(p)),
    calculate: (p) => {
      const a = answers(p);
      const st = symptomText(p);
      const v = vitals(p);
      const components: ScoringResult['components'] = [];
      let score = 0;

      // History (0-2)
      const highRiskHistory = /radiation.*arm|radiation.*jaw|diaphoresis|exertion/i.test(st + ' ' + Object.values(a).join(' '));
      const historyPoints = highRiskHistory ? 2 : 1;
      components.push({ criterion: `History (${highRiskHistory ? 'highly suspicious' : 'moderately suspicious'})`, met: true, points: historyPoints });
      score += historyPoints;

      // ECG — can't assess without data, assume normal (0)
      components.push({ criterion: 'ECG (not available — assumed normal)', met: false, points: 0 });

      // Age (0-2)
      const agePoints = age(p) >= 65 ? 2 : age(p) >= 45 ? 1 : 0;
      components.push({ criterion: `Age (${age(p)}yo)`, met: agePoints > 0, points: agePoints });
      score += agePoints;

      // Risk factors — limited data from intake
      const riskFactors = /diabetes|hypertension|smoking|family.*heart|cholesterol|obesity/i.test(st);
      const rfPoints = riskFactors ? 2 : 0;
      components.push({ criterion: 'Risk factors', met: riskFactors, points: rfPoints });
      score += rfPoints;

      // Troponin — not available at intake (0)
      components.push({ criterion: 'Troponin (not available — assumed normal)', met: false, points: 0 });

      let interpretation = '';
      let modification: WorkupModification;
      let riskLevel: ScoringResult['riskLevel'] = 'low';

      if (score <= 3) {
        interpretation = `Low risk (HEART ${score}) — 1.6% MACE rate. Consider discharge with follow-up.`;
        riskLevel = 'low';
        modification = {
          add: { labs: ['Troponin (single)'], imaging: ['12-lead ECG'] },
          notes: [`HEART Score ${score} (low risk) — if troponin negative, safe for discharge with PCP follow-up`],
        };
      } else if (score <= 6) {
        interpretation = `Moderate risk (HEART ${score}) — 12% MACE rate. Observation and serial troponins recommended.`;
        riskLevel = 'moderate';
        modification = {
          add: { labs: ['Troponin (serial q3h ×2)', 'BMP', 'CBC', 'BNP'], imaging: ['12-lead ECG', 'Chest X-ray'] },
          notes: [`HEART Score ${score} (moderate risk) — observation unit with serial troponins`],
        };
      } else {
        interpretation = `High risk (HEART ${score}) — 65% MACE rate. Admit for aggressive ACS workup.`;
        riskLevel = 'very-high';
        modification = {
          add: { labs: ['Troponin (serial q3h ×2)', 'BMP', 'CBC', 'BNP', 'PT/INR', 'Lipid panel'], imaging: ['12-lead ECG (stat)', 'Chest X-ray', 'Echocardiogram'], consults: ['Cardiology'] },
          notes: [`HEART Score ${score} (high risk) — admit, cardiology consult, consider catheterization`],
        };
      }

      return {
        toolId: 'heart_score', toolName: 'HEART Score', score, maxScore: 10,
        interpretation, riskLevel, workupModification: modification, components,
        source: 'Six et al. Neth Heart J 2008; Backus et al. Int J Cardiol 2013',
      };
    },
  },

  // ================================================================
  // CURB-65 — Pneumonia severity
  // ================================================================
  {
    id: 'curb65',
    name: 'CURB-65',
    appliesTo: (p) => /pneumonia/i.test(symptomText(p)) || (/cough|fever/i.test(cc(p)) && /fever|sputum|chills/i.test(symptomText(p))),
    calculate: (p) => {
      const v = vitals(p);
      const st = symptomText(p);
      const components: ScoringResult['components'] = [];
      let score = 0;

      const confusion = /confus|altered|disoriented/i.test(st);
      components.push({ criterion: 'Confusion', met: confusion, points: confusion ? 1 : 0 });
      if (confusion) score++;

      const uremia = false; // Requires lab — mark as not assessable
      components.push({ criterion: 'BUN > 19 mg/dL (requires lab)', met: false, points: 0 });

      const rrHigh = !!(v?.respiratoryRate && v.respiratoryRate >= 30);
      components.push({ criterion: 'Respiratory rate ≥ 30', met: rrHigh, points: rrHigh ? 1 : 0 });
      if (rrHigh) score++;

      const bpLow = !!(v?.bloodPressure && (v.bloodPressure.systolic < 90 || v.bloodPressure.diastolic <= 60));
      components.push({ criterion: 'BP: systolic <90 or diastolic ≤60', met: bpLow, points: bpLow ? 1 : 0 });
      if (bpLow) score++;

      const age65 = age(p) >= 65;
      components.push({ criterion: 'Age ≥ 65', met: age65, points: age65 ? 1 : 0 });
      if (age65) score++;

      let modification: WorkupModification;
      let riskLevel: ScoringResult['riskLevel'] = 'low';
      let interpretation = '';

      if (score <= 1) {
        riskLevel = 'low';
        interpretation = `Low severity (CURB-65: ${score}) — outpatient treatment appropriate. <3% mortality.`;
        modification = { notes: [`CURB-65 ${score} — outpatient management with oral antibiotics and follow-up`] };
      } else if (score === 2) {
        riskLevel = 'moderate';
        interpretation = `Moderate severity (CURB-65: ${score}) — consider short inpatient stay. ~9% mortality.`;
        modification = {
          add: { labs: ['CBC', 'BMP', 'Blood cultures ×2', 'Procalcitonin'] },
          notes: [`CURB-65 ${score} — consider admission or supervised outpatient. IV antibiotics if admitted.`],
        };
      } else {
        riskLevel = score >= 4 ? 'very-high' : 'high';
        interpretation = `High severity (CURB-65: ${score}) — hospital admission required. ${score >= 4 ? 'Consider ICU.' : ''} ~15-40% mortality.`;
        modification = {
          add: { labs: ['CBC', 'BMP', 'Blood cultures ×2', 'Procalcitonin', 'Lactate', 'ABG'], imaging: ['Chest X-ray (stat)'], consults: score >= 4 ? ['Pulmonology', 'Critical Care'] : [] },
          notes: [`CURB-65 ${score} — admit${score >= 4 ? ', ICU evaluation' : ''}. IV antibiotics. Monitor closely.`],
        };
      }

      return {
        toolId: 'curb65', toolName: 'CURB-65', score, maxScore: 5,
        interpretation, riskLevel, workupModification: modification, components,
        source: 'Lim et al. Thorax 2003',
      };
    },
  },

  // ================================================================
  // ALVARADO SCORE — Appendicitis probability
  // ================================================================
  {
    id: 'alvarado',
    name: 'Alvarado Score',
    appliesTo: (p) => /abdom|stomach|belly/i.test(cc(p)) && /right\s*lower|rlq/i.test(answers(p).abd_quadrant || symptomText(p)),
    calculate: (p) => {
      const st = symptomText(p);
      const a = answers(p);
      const v = vitals(p);
      const components: ScoringResult['components'] = [];
      let score = 0;

      const migrating = /start.*umbil.*moved|periumbilical.*rlq/i.test(st);
      components.push({ criterion: 'Migration of pain to RLQ', met: migrating, points: migrating ? 1 : 0 });
      if (migrating) score++;

      const anorexia = /appetite|anorexia|not\s*hungry/i.test(st);
      components.push({ criterion: 'Anorexia', met: anorexia, points: anorexia ? 1 : 0 });
      if (anorexia) score++;

      const nausea = /nausea|vomit/i.test(st);
      components.push({ criterion: 'Nausea/vomiting', met: nausea, points: nausea ? 1 : 0 });
      if (nausea) score++;

      const rlqTenderness = /right\s*lower/i.test(a.abd_quadrant || '');
      components.push({ criterion: 'RLQ tenderness', met: rlqTenderness, points: rlqTenderness ? 2 : 0 });
      if (rlqTenderness) score += 2;

      const fever = !!(v?.temperature && v.temperature > 99.5) || /fever/i.test(st);
      components.push({ criterion: 'Elevated temperature', met: fever, points: fever ? 1 : 0 });
      if (fever) score++;

      // Lab values not available at intake
      components.push({ criterion: 'Leukocytosis (requires lab)', met: false, points: 0 });
      components.push({ criterion: 'Left shift (requires lab)', met: false, points: 0 });

      let modification: WorkupModification;
      let riskLevel: ScoringResult['riskLevel'];
      let interpretation: string;

      if (score <= 4) {
        riskLevel = 'low';
        interpretation = `Low probability (Alvarado ${score}) — appendicitis unlikely. Consider observation.`;
        modification = { add: { labs: ['CBC with differential', 'Urinalysis'] }, notes: [`Alvarado ${score} — low probability. Serial exams recommended.`] };
      } else if (score <= 6) {
        riskLevel = 'moderate';
        interpretation = `Moderate probability (Alvarado ${score}) — CT abdomen recommended.`;
        modification = {
          add: { labs: ['CBC with differential', 'CMP', 'Urinalysis', 'hCG (females)'], imaging: ['CT Abdomen/Pelvis with IV contrast'] },
          notes: [`Alvarado ${score} — equivocal. CT recommended to confirm or exclude.`],
        };
      } else {
        riskLevel = 'high';
        interpretation = `High probability (Alvarado ${score}) — surgical consultation recommended.`;
        modification = {
          add: { labs: ['CBC', 'CMP', 'Urinalysis', 'Type & Screen'], imaging: ['CT Abdomen/Pelvis with IV contrast'], consults: ['General Surgery'] },
          notes: [`Alvarado ${score} — high probability appendicitis. Surgical consult.`],
        };
      }

      return {
        toolId: 'alvarado', toolName: 'Alvarado Score', score, maxScore: 10,
        interpretation, riskLevel, workupModification: modification, components,
        source: 'Alvarado A. Ann Emerg Med 1986',
      };
    },
  },

  // ================================================================
  // WELLS DVT SCORE — D-dimer vs Ultrasound
  // ================================================================
  {
    id: 'wells_dvt',
    name: 'Wells Score (DVT)',
    appliesTo: (p) => /leg.*swell|calf.*pain|dvt|leg.*pain.*swell/i.test(cc(p) + ' ' + symptomText(p)),
    calculate: (p) => {
      const st = symptomText(p);
      const components: ScoringResult['components'] = [];
      let score = 0;

      const activeCancer = /cancer|malignancy|chemo/i.test(st);
      components.push({ criterion: 'Active cancer', met: activeCancer, points: activeCancer ? 1 : 0 });
      if (activeCancer) score++;

      const paralysis = /paralysis|paresis|cast|immobiliz/i.test(st);
      components.push({ criterion: 'Paralysis/immobilization of leg', met: paralysis, points: paralysis ? 1 : 0 });
      if (paralysis) score++;

      const bedridden = /bedridden|bed\s*rest|surgery/i.test(st);
      components.push({ criterion: 'Recently bedridden >3 days or surgery within 12 weeks', met: bedridden, points: bedridden ? 1 : 0 });
      if (bedridden) score++;

      const calfSwelling = /calf.*swell|leg.*swell|edema/i.test(st);
      components.push({ criterion: 'Calf swelling >3cm vs other leg', met: calfSwelling, points: calfSwelling ? 1 : 0 });
      if (calfSwelling) score++;

      const pittingEdema = /pitting|edema/i.test(st);
      components.push({ criterion: 'Pitting edema (affected leg)', met: pittingEdema, points: pittingEdema ? 1 : 0 });
      if (pittingEdema) score++;

      let modification: WorkupModification;
      let riskLevel: ScoringResult['riskLevel'];

      if (score <= 1) {
        riskLevel = 'low';
        modification = {
          add: { labs: ['D-dimer (Wells DVT ≤1)'] },
          notes: [`Wells DVT ${score} (low probability) — D-dimer first. If negative, DVT excluded.`],
        };
      } else {
        riskLevel = 'high';
        modification = {
          add: { imaging: ['Lower extremity venous duplex ultrasound'] },
          notes: [`Wells DVT ${score} (≥2, moderate-high probability) — proceed to ultrasound`],
        };
      }

      return {
        toolId: 'wells_dvt', toolName: 'Wells Score (DVT)', score, maxScore: 8,
        interpretation: score <= 1
          ? `Low probability (${score}) — D-dimer first`
          : `Moderate-High probability (${score}) — Ultrasound indicated`,
        riskLevel, workupModification: modification, components,
        source: 'Wells et al. Lancet 1997',
      };
    },
  },

  // ================================================================
  // PHQ-9 INTEGRATION — Depression severity → management tier
  // ================================================================
  {
    id: 'phq9_proxy',
    name: 'PHQ-9 Severity Estimate',
    appliesTo: (p) => /depress|sad|hopeless|mood|mental\s*health/i.test(cc(p)),
    calculate: (p) => {
      const a = answers(p);
      const st = symptomText(p);
      const components: ScoringResult['components'] = [];
      let severity = 0;

      const neurovegetative = /insomnia|hypersomnia|appetite|sleep|energy/i.test(a.mh_neurovegetative || st);
      components.push({ criterion: 'Neurovegetative symptoms (sleep, appetite, energy)', met: neurovegetative, points: neurovegetative ? 1 : 0 });
      if (neurovegetative) severity++;

      const duration = /months|weeks|long/i.test(a.mh_duration || st);
      components.push({ criterion: 'Duration > 2 weeks', met: duration, points: duration ? 1 : 0 });
      if (duration) severity++;

      const passiveSI = /passive/i.test(a.mh_safety || '');
      components.push({ criterion: 'Passive suicidal ideation', met: passiveSI, points: passiveSI ? 1 : 0 });
      if (passiveSI) severity++;

      const activeSI = /active/i.test(a.mh_safety || '');
      components.push({ criterion: 'Active suicidal ideation', met: activeSI, points: activeSI ? 2 : 0 });
      if (activeSI) severity += 2;

      let modification: WorkupModification;
      let riskLevel: ScoringResult['riskLevel'];
      let interpretation: string;

      if (activeSI) {
        riskLevel = 'very-high';
        interpretation = 'SEVERE with active SI — psychiatric emergency. Safety assessment required.';
        modification = {
          add: { procedures: ['Columbia Suicide Severity Rating Scale (stat)', 'Safety assessment'], consults: ['Psychiatry (stat)', 'Social Work'] },
          notes: ['Active suicidal ideation — immediate psychiatric evaluation required'],
        };
      } else if (severity >= 3) {
        riskLevel = 'high';
        interpretation = 'Moderate-Severe depression — medication + therapy recommended.';
        modification = {
          add: { labs: ['TSH', 'CBC', 'BMP', 'Vitamin B12', 'Vitamin D'], procedures: ['PHQ-9 (formal scoring)'], consults: ['Psychiatry', 'Behavioral Health'] },
          notes: ['Moderate-severe depression — consider antidepressant + psychotherapy referral'],
        };
      } else if (severity >= 1) {
        riskLevel = 'moderate';
        interpretation = 'Mild-Moderate depression — therapy and monitoring recommended.';
        modification = {
          add: { labs: ['TSH', 'CBC'], procedures: ['PHQ-9 (formal scoring)', 'GAD-7'] },
          notes: ['Mild-moderate depression — structured therapy. Recheck PHQ-9 in 4-6 weeks.'],
        };
      } else {
        riskLevel = 'low';
        interpretation = 'Subclinical symptoms — monitor and supportive care.';
        modification = {
          add: { procedures: ['PHQ-9 screening'] },
          notes: ['Subclinical depressive symptoms — baseline PHQ-9 and lifestyle counseling'],
        };
      }

      return {
        toolId: 'phq9_proxy', toolName: 'PHQ-9 Severity Estimate', score: severity, maxScore: 4,
        interpretation, riskLevel, workupModification: modification, components,
        source: 'Kroenke et al. J Gen Intern Med 2001',
      };
    },
  },

  // ================================================================
  // BACK PAIN RED FLAG SCREEN — Imaging decision
  // ================================================================
  {
    id: 'back_red_flags',
    name: 'Back Pain Red Flag Screen',
    appliesTo: (p) => /back\s*pain|lower\s*back|lumbar/i.test(cc(p)),
    calculate: (p) => {
      const a = answers(p);
      const st = symptomText(p);
      const components: ScoringResult['components'] = [];
      let score = 0;

      const bbAnswer = (a.back_bladder_bowel || '').toLowerCase();
      const caudaEquina = /dysfunction|incontinence|retention|saddle\s*an|can'?t\s*control/i.test(bbAnswer) ||
        (!/normal|no\s/i.test(bbAnswer) && /bladder|bowel|saddle/i.test(bbAnswer));
      components.push({ criterion: 'Cauda equina symptoms (bowel/bladder/saddle)', met: caudaEquina, points: caudaEquina ? 3 : 0 });
      if (caudaEquina) score += 3;

      const motorDeficit = /weakness|foot.*drop/i.test(a.back_neuro || st);
      components.push({ criterion: 'Progressive motor deficit', met: motorDeficit, points: motorDeficit ? 2 : 0 });
      if (motorDeficit) score += 2;

      const trauma = /fall|accident|trauma|injury/i.test(st);
      components.push({ criterion: 'Significant trauma', met: trauma, points: trauma ? 1 : 0 });
      if (trauma) score++;

      const ageRisk = age(p) > 50 || age(p) < 20;
      components.push({ criterion: `Age <20 or >50 (${age(p)}yo)`, met: ageRisk, points: ageRisk ? 1 : 0 });
      if (ageRisk) score++;

      const cancer = /cancer|malignancy|weight\s*loss/i.test(st);
      components.push({ criterion: 'History of cancer or unexplained weight loss', met: cancer, points: cancer ? 2 : 0 });
      if (cancer) score += 2;

      const fever = /fever/i.test(st);
      components.push({ criterion: 'Fever', met: fever, points: fever ? 1 : 0 });
      if (fever) score++;

      let modification: WorkupModification;
      let riskLevel: ScoringResult['riskLevel'];
      let interpretation: string;

      if (caudaEquina) {
        riskLevel = 'very-high';
        interpretation = 'EMERGENCY: Cauda equina symptoms — STAT MRI and neurosurgery consult.';
        modification = {
          add: { imaging: ['MRI lumbar spine (STAT)'], consults: ['Neurosurgery (STAT)'] },
          notes: ['Cauda equina red flags present — emergent imaging required'],
        };
      } else if (score >= 3) {
        riskLevel = 'high';
        interpretation = `Red flags present (${score} points) — Advanced imaging indicated.`;
        modification = {
          add: { imaging: ['MRI lumbar spine without contrast'], labs: ['CBC', 'ESR', 'CRP'] },
          notes: [`Back pain red flags (${score} points) — imaging recommended. Rule out fracture, infection, malignancy.`],
        };
      } else if (score >= 1) {
        riskLevel = 'moderate';
        interpretation = `Minor risk factor (${score} point) — X-ray may be appropriate. Consider MRI if not improving in 4-6 weeks.`;
        modification = {
          add: { imaging: ['X-ray lumbar spine'] },
          notes: ['Minor red flag — baseline X-ray. MRI if symptoms persist >4-6 weeks.'],
        };
      } else {
        riskLevel = 'low';
        interpretation = 'No red flags — imaging NOT indicated in first 4-6 weeks.';
        modification = {
          remove: { imaging: ['X-ray lumbar spine', 'MRI lumbar spine', 'CT lumbar spine'] },
          notes: ['No red flags — AAFP/ACP guidelines recommend against imaging for acute low back pain within first 4-6 weeks. Conservative management.'],
        };
      }

      return {
        toolId: 'back_red_flags', toolName: 'Back Pain Red Flag Screen', score, maxScore: 10,
        interpretation, riskLevel, workupModification: modification, components,
        source: 'Chou et al. Ann Intern Med 2007 (ACP/APS Guidelines)',
      };
    },
  },

  // ================================================================
  // PERC RULE — Safely rule out PE without testing
  // ================================================================
  {
    id: 'perc',
    name: 'PERC Rule',
    appliesTo: (p) => /chest\s*pain|shortness.*breath|dyspnea|sob/i.test(cc(p)),
    calculate: (p) => {
      const st = symptomText(p);
      const v = vitals(p);
      const components: ScoringResult['components'] = [];
      let criteriaFailed = 0;

      const ageOver50 = age(p) >= 50;
      components.push({ criterion: 'Age < 50', met: !ageOver50, points: ageOver50 ? 1 : 0 });
      if (ageOver50) criteriaFailed++;

      const hrOver100 = !!(v?.heartRate && v.heartRate >= 100);
      components.push({ criterion: 'HR < 100', met: !hrOver100, points: hrOver100 ? 1 : 0 });
      if (hrOver100) criteriaFailed++;

      const o2Low = !!(v?.oxygenSaturation && v.oxygenSaturation < 95);
      components.push({ criterion: 'SpO2 ≥ 95%', met: !o2Low, points: o2Low ? 1 : 0 });
      if (o2Low) criteriaFailed++;

      const hemoptysis = /hemoptysis|blood.*cough/i.test(st);
      components.push({ criterion: 'No hemoptysis', met: !hemoptysis, points: hemoptysis ? 1 : 0 });
      if (hemoptysis) criteriaFailed++;

      const legSwelling = /leg.*swell|calf.*swell|dvt/i.test(st);
      components.push({ criterion: 'No unilateral leg swelling', met: !legSwelling, points: legSwelling ? 1 : 0 });
      if (legSwelling) criteriaFailed++;

      const allPassed = criteriaFailed === 0;

      return {
        toolId: 'perc', toolName: 'PERC Rule', score: criteriaFailed, maxScore: 8,
        interpretation: allPassed
          ? 'PERC negative — PE safely excluded without D-dimer (1.8% miss rate). No testing needed.'
          : `PERC positive (${criteriaFailed} criteria failed) — cannot safely exclude PE. Proceed to Wells Score.`,
        riskLevel: allPassed ? 'low' : 'moderate',
        workupModification: allPassed
          ? { remove: { labs: ['D-dimer'], imaging: ['CT Pulmonary Angiogram'] }, notes: ['PERC Rule satisfied — PE safely excluded without testing'] }
          : { notes: [`PERC failed (${criteriaFailed} criteria) — proceed to Wells Score for PE risk stratification`] },
        components,
        source: 'Kline et al. J Thromb Haemost 2004',
      };
    },
  },
];

// ============================================================
// Public API
// ============================================================

/**
 * Run all applicable scoring tools for this presentation.
 * Returns array of scoring results that should modify workup recommendations.
 */
export function applyRelevantScoringTools(
  presentation: PatientPresentation
): ScoringResult[] {
  const results: ScoringResult[] = [];

  for (const tool of SCORING_TOOLS) {
    if (tool.appliesTo(presentation)) {
      try {
        results.push(tool.calculate(presentation));
      } catch (_e) {
        // Scoring tool failed — skip gracefully
      }
    }
  }

  return results;
}
