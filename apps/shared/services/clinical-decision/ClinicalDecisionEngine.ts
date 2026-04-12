// =============================================================================
// ATTENDING AI - Clinical Decision Support Engine
// apps/shared/services/clinical-decision/ClinicalDecisionEngine.ts
//
// Evidence-based clinical recommendations with guideline citations
// Real-time interventions that go beyond alerts to actionable guidance
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type RecommendationType = 
  | 'diagnostic'
  | 'therapeutic'
  | 'preventive'
  | 'monitoring'
  | 'referral'
  | 'lifestyle'
  | 'safety'
  | 'cost_optimization';

export type EvidenceLevel = 'A' | 'B' | 'C' | 'D' | 'expert_opinion';
export type RecommendationStrength = 'strong' | 'moderate' | 'weak' | 'conditional';
export type UrgencyLevel = 'routine' | 'soon' | 'urgent' | 'emergent';

export interface ClinicalRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  rationale: string;
  
  // Evidence
  evidenceLevel: EvidenceLevel;
  strength: RecommendationStrength;
  guidelines: GuidelineReference[];
  
  // Actionability
  urgency: UrgencyLevel;
  actions: RecommendedAction[];
  alternatives?: AlternativeAction[];
  
  // Context
  triggeredBy: string[];
  contraindications?: string[];
  precautions?: string[];
  
  // Outcomes
  expectedBenefit: string;
  numberNeededToTreat?: number;
  riskReduction?: string;
  
  // Tracking
  createdAt: Date;
  expiresAt?: Date;
  dismissed?: boolean;
  dismissedReason?: string;
  implemented?: boolean;
  implementedAt?: Date;
}

export interface GuidelineReference {
  organization: string;
  guidelineName: string;
  year: number;
  section?: string;
  url?: string;
  grade?: string;
}

export interface RecommendedAction {
  type: 'order' | 'prescribe' | 'refer' | 'educate' | 'monitor' | 'discontinue' | 'adjust';
  description: string;
  details?: string;
  orderTemplate?: OrderTemplate;
  priority: number;
}

export interface AlternativeAction {
  description: string;
  reason: string;
  whenToConsider: string;
}

export interface OrderTemplate {
  orderType: 'lab' | 'imaging' | 'medication' | 'referral' | 'procedure';
  code?: string;
  codeSystem?: string;
  name: string;
  instructions?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
}

export interface PatientContext {
  patientId: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  
  // Clinical data
  diagnoses: Diagnosis[];
  medications: Medication[];
  allergies: Allergy[];
  vitals: VitalSign[];
  labs: LabResult[];
  
  // History
  procedures: Procedure[];
  hospitalizations: Hospitalization[];
  
  // Social/Risk factors
  smokingStatus?: 'current' | 'former' | 'never';
  alcoholUse?: string;
  bmi?: number;
  
  // Care context
  encounterType?: 'outpatient' | 'inpatient' | 'emergency' | 'telehealth';
  chiefComplaint?: string;
}

export interface Diagnosis {
  code: string;
  codeSystem: 'ICD10' | 'SNOMED';
  name: string;
  status: 'active' | 'resolved' | 'inactive';
  onsetDate?: Date;
}

export interface Medication {
  name: string;
  dose?: string;
  frequency?: string;
  route?: string;
  status: 'active' | 'discontinued' | 'on-hold';
  rxnormCode?: string;
  startDate?: Date;
}

export interface Allergy {
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  type: 'drug' | 'food' | 'environmental';
}

export interface VitalSign {
  type: string;
  value: number;
  unit: string;
  date: Date;
}

export interface LabResult {
  name: string;
  code?: string;
  value: number | string;
  unit?: string;
  referenceRange?: string;
  date: Date;
  interpretation?: 'normal' | 'abnormal' | 'critical';
}

export interface Procedure {
  name: string;
  code?: string;
  date: Date;
}

export interface Hospitalization {
  reason: string;
  admitDate: Date;
  dischargeDate?: Date;
  facility?: string;
}

// =============================================================================
// CLINICAL RULES DATABASE
// =============================================================================

interface ClinicalRule {
  id: string;
  name: string;
  description: string;
  condition: (ctx: PatientContext) => boolean;
  generate: (ctx: PatientContext) => ClinicalRecommendation | null;
  priority: number;
  category: RecommendationType;
}

const CLINICAL_RULES: ClinicalRule[] = [
  // =========================================================================
  // DIABETES MANAGEMENT
  // =========================================================================
  {
    id: 'dm_a1c_high',
    name: 'Elevated A1c - Therapy Intensification',
    description: 'Recommend therapy intensification for A1c > 8%',
    category: 'therapeutic',
    priority: 1,
    condition: (ctx) => {
      const hasDiabetes = ctx.diagnoses.some(d => 
        d.code.startsWith('E11') || d.name.toLowerCase().includes('diabetes')
      );
      const a1c = ctx.labs.find(l => l.name.toLowerCase().includes('a1c'));
      return hasDiabetes && a1c && parseFloat(String(a1c.value)) > 8;
    },
    generate: (ctx) => {
      const a1c = ctx.labs.find(l => l.name.toLowerCase().includes('a1c'));
      const a1cValue = parseFloat(String(a1c?.value));
      const onMetformin = ctx.medications.some(m => 
        m.name.toLowerCase().includes('metformin') && m.status === 'active'
      );
      const onSGLT2 = ctx.medications.some(m => 
        ['empagliflozin', 'dapagliflozin', 'canagliflozin', 'jardiance', 'farxiga', 'invokana']
          .some(drug => m.name.toLowerCase().includes(drug))
      );
      const onGLP1 = ctx.medications.some(m =>
        ['semaglutide', 'liraglutide', 'dulaglutide', 'ozempic', 'wegovy', 'victoza', 'trulicity']
          .some(drug => m.name.toLowerCase().includes(drug))
      );
      const hasASCVD = ctx.diagnoses.some(d =>
        ['I25', 'I21', 'I63', 'I70'].some(code => d.code.startsWith(code))
      );
      const hasCKD = ctx.diagnoses.some(d => d.code.startsWith('N18'));
      const hasHF = ctx.diagnoses.some(d => d.code.startsWith('I50'));

      let recommendation: string;
      let actions: RecommendedAction[] = [];

      if (!onMetformin) {
        recommendation = 'Start metformin as first-line therapy';
        actions.push({
          type: 'prescribe',
          description: 'Start Metformin 500mg BID with meals, titrate to 1000mg BID',
          priority: 1,
          orderTemplate: {
            orderType: 'medication',
            name: 'Metformin 500mg',
            code: '6809',
            codeSystem: 'RXNORM',
            instructions: 'Take with meals. Start 500mg twice daily, increase to 1000mg twice daily after 1-2 weeks if tolerated.',
            frequency: 'BID',
          }
        });
      } else if (hasASCVD || hasCKD || hasHF) {
        if (!onSGLT2 && !onGLP1) {
          recommendation = hasHF || hasCKD 
            ? 'Add SGLT2 inhibitor for cardiorenal protection'
            : 'Add GLP-1 RA for cardiovascular benefit';
          
          if (hasHF || hasCKD) {
            actions.push({
              type: 'prescribe',
              description: 'Start Empagliflozin 10mg daily (preferred for HF/CKD)',
              priority: 1,
              orderTemplate: {
                orderType: 'medication',
                name: 'Empagliflozin 10mg',
                code: '1545653',
                codeSystem: 'RXNORM',
                instructions: 'Take once daily in the morning',
                frequency: 'Daily',
              }
            });
          } else {
            actions.push({
              type: 'prescribe',
              description: 'Start Semaglutide 0.25mg weekly, titrate up',
              priority: 1,
              orderTemplate: {
                orderType: 'medication',
                name: 'Semaglutide 0.25mg injection',
                code: '1991302',
                codeSystem: 'RXNORM',
                instructions: 'Inject subcutaneously once weekly. Titrate: 0.25mg x4 weeks, then 0.5mg x4 weeks, then 1mg',
                frequency: 'Weekly',
              }
            });
          }
        }
      } else {
        recommendation = 'Intensify diabetes therapy - consider adding second agent';
        actions.push({
          type: 'prescribe',
          description: 'Consider adding SGLT2 inhibitor or GLP-1 RA based on patient factors',
          priority: 1,
        });
      }

      actions.push({
        type: 'order',
        description: 'Recheck A1c in 3 months',
        priority: 2,
        orderTemplate: {
          orderType: 'lab',
          name: 'Hemoglobin A1c',
          code: '4548-4',
          codeSystem: 'LOINC',
        }
      });

      actions.push({
        type: 'educate',
        description: 'Diabetes self-management education',
        priority: 3,
      });

      return {
        id: `rec_${Date.now()}_dm_a1c`,
        type: 'therapeutic',
        title: 'Diabetes Therapy Intensification Recommended',
        description: `Current A1c is ${a1cValue}% (goal <7% for most patients). ${recommendation}.`,
        rationale: `A1c above goal increases risk of microvascular complications. Per ADA guidelines, therapy should be intensified if A1c remains above target after 3 months.`,
        evidenceLevel: 'A',
        strength: 'strong',
        guidelines: [
          {
            organization: 'American Diabetes Association',
            guidelineName: 'Standards of Medical Care in Diabetes',
            year: 2024,
            section: 'Pharmacologic Approaches to Glycemic Treatment',
            url: 'https://diabetesjournals.org/care/article/47/Supplement_1/S158/153955',
            grade: 'A',
          }
        ],
        urgency: a1cValue > 10 ? 'urgent' : 'soon',
        actions,
        alternatives: [
          {
            description: 'If GLP-1 RA not tolerated, consider DPP-4 inhibitor',
            reason: 'Lower efficacy but better GI tolerability',
            whenToConsider: 'GI intolerance to GLP-1 RA',
          },
          {
            description: 'If cost is a barrier, consider sulfonylurea',
            reason: 'Effective and inexpensive, but hypoglycemia risk',
            whenToConsider: 'Financial constraints, close monitoring possible',
          }
        ],
        triggeredBy: [`A1c ${a1cValue}%`, 'Active diabetes diagnosis'],
        contraindications: onMetformin ? undefined : ['eGFR < 30', 'History of lactic acidosis'],
        expectedBenefit: 'Each 1% reduction in A1c reduces microvascular complications by ~35%',
        riskReduction: '35% reduction in microvascular complications per 1% A1c reduction',
        createdAt: new Date(),
      };
    }
  },

  // =========================================================================
  // CARDIOVASCULAR - STATIN THERAPY
  // =========================================================================
  {
    id: 'cv_statin_ascvd',
    name: 'Statin Therapy for ASCVD',
    description: 'Recommend high-intensity statin for patients with ASCVD',
    category: 'therapeutic',
    priority: 1,
    condition: (ctx) => {
      const hasASCVD = ctx.diagnoses.some(d =>
        ['I25', 'I21', 'I20', 'I63', 'I65', 'I70', 'G45'].some(code => d.code.startsWith(code)) ||
        ['coronary artery disease', 'myocardial infarction', 'stroke', 'tia', 'peripheral artery disease']
          .some(term => d.name.toLowerCase().includes(term))
      );
      const onHighIntensityStatin = ctx.medications.some(m => {
        const name = m.name.toLowerCase();
        const dose = parseInt(m.dose || '0');
        return (name.includes('atorvastatin') && dose >= 40) ||
               (name.includes('rosuvastatin') && dose >= 20);
      });
      return hasASCVD && !onHighIntensityStatin && ctx.age < 75;
    },
    generate: (ctx) => {
      const currentStatin = ctx.medications.find(m => 
        ['statin', 'atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin', 'lovastatin']
          .some(s => m.name.toLowerCase().includes(s))
      );

      return {
        id: `rec_${Date.now()}_statin`,
        type: 'therapeutic',
        title: 'High-Intensity Statin Therapy Recommended',
        description: currentStatin 
          ? `Patient is on ${currentStatin.name} ${currentStatin.dose}. Recommend intensifying to high-intensity statin for secondary prevention.`
          : 'Patient with ASCVD should be on high-intensity statin for secondary prevention.',
        rationale: 'High-intensity statin therapy reduces cardiovascular events by 30-40% in patients with established ASCVD.',
        evidenceLevel: 'A',
        strength: 'strong',
        guidelines: [
          {
            organization: 'ACC/AHA',
            guidelineName: 'Guideline on the Management of Blood Cholesterol',
            year: 2018,
            section: 'Secondary Prevention',
            grade: 'A',
          }
        ],
        urgency: 'soon',
        actions: [
          {
            type: currentStatin ? 'adjust' : 'prescribe',
            description: 'Start/intensify to Atorvastatin 80mg or Rosuvastatin 20-40mg daily',
            priority: 1,
            orderTemplate: {
              orderType: 'medication',
              name: 'Atorvastatin 80mg',
              code: '617314',
              codeSystem: 'RXNORM',
              instructions: 'Take once daily at bedtime',
              frequency: 'Daily',
            }
          },
          {
            type: 'order',
            description: 'Check lipid panel in 4-12 weeks',
            priority: 2,
            orderTemplate: {
              orderType: 'lab',
              name: 'Lipid Panel',
              code: '24331-1',
              codeSystem: 'LOINC',
            }
          },
          {
            type: 'order',
            description: 'Check LFTs if not done in past year',
            priority: 3,
            orderTemplate: {
              orderType: 'lab',
              name: 'Hepatic Function Panel',
              code: '24325-3',
              codeSystem: 'LOINC',
            }
          }
        ],
        alternatives: [
          {
            description: 'If statin intolerant, try every-other-day dosing or switch to rosuvastatin',
            reason: 'Rosuvastatin is more hydrophilic with potentially less myopathy',
            whenToConsider: 'Myalgias on current statin',
          },
          {
            description: 'Add ezetimibe if LDL not at goal on max tolerated statin',
            reason: 'Additional 15-20% LDL reduction',
            whenToConsider: 'LDL >70 on max statin',
          }
        ],
        triggeredBy: ['ASCVD diagnosis', 'Not on high-intensity statin'],
        precautions: ['Monitor for myopathy', 'Check LFTs'],
        expectedBenefit: '30-40% reduction in major cardiovascular events',
        numberNeededToTreat: 25,
        riskReduction: '30-40% relative risk reduction for MACE',
        createdAt: new Date(),
      };
    }
  },

  // =========================================================================
  // HYPERTENSION MANAGEMENT
  // =========================================================================
  {
    id: 'htn_uncontrolled',
    name: 'Uncontrolled Hypertension',
    description: 'Recommend therapy adjustment for uncontrolled BP',
    category: 'therapeutic',
    priority: 1,
    condition: (ctx) => {
      const hasHTN = ctx.diagnoses.some(d => 
        d.code.startsWith('I10') || d.name.toLowerCase().includes('hypertension')
      );
      const recentBP = ctx.vitals
        .filter(v => v.type === 'blood_pressure' || v.type === 'systolic')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      if (!recentBP) return false;
      const systolic = typeof recentBP.value === 'string' 
        ? parseInt(recentBP.value.split('/')[0])
        : recentBP.value;
      
      return hasHTN && systolic >= 140;
    },
    generate: (ctx) => {
      const recentBP = ctx.vitals
        .filter(v => v.type === 'blood_pressure' || v.type === 'systolic')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      const bpValue = typeof recentBP.value === 'string' ? recentBP.value : `${recentBP.value}`;
      const systolic = parseInt(bpValue.split('/')[0]);
      
      const currentBPMeds = ctx.medications.filter(m => 
        ['lisinopril', 'losartan', 'amlodipine', 'metoprolol', 'carvedilol', 'hydrochlorothiazide', 
         'chlorthalidone', 'atenolol', 'valsartan', 'olmesartan', 'irbesartan', 'ramipril', 'enalapril']
          .some(drug => m.name.toLowerCase().includes(drug)) && m.status === 'active'
      );

      const hasDiabetes = ctx.diagnoses.some(d => d.code.startsWith('E11'));
      const hasCKD = ctx.diagnoses.some(d => d.code.startsWith('N18'));
      const hasHF = ctx.diagnoses.some(d => d.code.startsWith('I50'));
      const hasCAD = ctx.diagnoses.some(d => d.code.startsWith('I25'));

      let actions: RecommendedAction[] = [];
      let recommendation: string;

      if (currentBPMeds.length === 0) {
        // First-line therapy
        if (hasDiabetes || hasCKD) {
          recommendation = 'Start ACE inhibitor or ARB as first-line for renal protection';
          actions.push({
            type: 'prescribe',
            description: 'Start Lisinopril 10mg daily',
            priority: 1,
            orderTemplate: {
              orderType: 'medication',
              name: 'Lisinopril 10mg',
              code: '314076',
              codeSystem: 'RXNORM',
              instructions: 'Take once daily. Monitor potassium and creatinine in 1-2 weeks.',
              frequency: 'Daily',
            }
          });
        } else {
          recommendation = 'Start first-line antihypertensive (ACE-I, ARB, CCB, or thiazide)';
          actions.push({
            type: 'prescribe',
            description: 'Start Amlodipine 5mg daily',
            priority: 1,
            orderTemplate: {
              orderType: 'medication',
              name: 'Amlodipine 5mg',
              code: '329528',
              codeSystem: 'RXNORM',
              instructions: 'Take once daily',
              frequency: 'Daily',
            }
          });
        }
      } else if (currentBPMeds.length === 1) {
        // Add second agent
        recommendation = 'Add second antihypertensive agent';
        const currentClass = this.identifyDrugClass(currentBPMeds[0].name);
        
        if (currentClass === 'acei' || currentClass === 'arb') {
          actions.push({
            type: 'prescribe',
            description: 'Add Amlodipine 5mg daily (CCB)',
            priority: 1,
            orderTemplate: {
              orderType: 'medication',
              name: 'Amlodipine 5mg',
              code: '329528',
              codeSystem: 'RXNORM',
              frequency: 'Daily',
            }
          });
        } else {
          actions.push({
            type: 'prescribe',
            description: 'Add Lisinopril 10mg daily (ACE-I)',
            priority: 1,
            orderTemplate: {
              orderType: 'medication',
              name: 'Lisinopril 10mg',
              code: '314076',
              codeSystem: 'RXNORM',
              frequency: 'Daily',
            }
          });
        }
      } else {
        // On multiple agents - optimize
        recommendation = 'Optimize current regimen - maximize doses or add third agent';
        actions.push({
          type: 'adjust',
          description: 'Maximize current medication doses before adding new agents',
          priority: 1,
        });
        actions.push({
          type: 'prescribe',
          description: 'Consider adding Chlorthalidone 12.5-25mg if not on diuretic',
          priority: 2,
          orderTemplate: {
            orderType: 'medication',
            name: 'Chlorthalidone 12.5mg',
            code: '197770',
            codeSystem: 'RXNORM',
            frequency: 'Daily',
          }
        });
      }

      actions.push({
        type: 'monitor',
        description: 'Follow-up BP check in 2-4 weeks',
        priority: 3,
      });

      if (hasDiabetes || hasCKD) {
        actions.push({
          type: 'order',
          description: 'Check BMP in 1-2 weeks after medication change',
          priority: 2,
          orderTemplate: {
            orderType: 'lab',
            name: 'Basic Metabolic Panel',
            code: '24320-4',
            codeSystem: 'LOINC',
          }
        });
      }

      return {
        id: `rec_${Date.now()}_htn`,
        type: 'therapeutic',
        title: 'Blood Pressure Control Intervention Needed',
        description: `Current BP ${bpValue} mmHg is above goal (<130/80 for most patients). ${recommendation}.`,
        rationale: 'Uncontrolled hypertension significantly increases risk of stroke, MI, heart failure, and CKD. Each 10 mmHg reduction in SBP reduces cardiovascular risk by ~20%.',
        evidenceLevel: 'A',
        strength: 'strong',
        guidelines: [
          {
            organization: 'ACC/AHA',
            guidelineName: 'Guideline for Prevention, Detection, Evaluation, and Management of High Blood Pressure',
            year: 2017,
            section: 'Pharmacological Treatment',
            grade: 'A',
          }
        ],
        urgency: systolic >= 180 ? 'urgent' : 'soon',
        actions,
        alternatives: [
          {
            description: 'If ACE-I causes cough, switch to ARB',
            reason: 'Similar efficacy without cough side effect',
            whenToConsider: 'Persistent dry cough on ACE-I',
          },
          {
            description: 'If ankle edema on CCB, reduce dose or switch to ACE-I/ARB',
            reason: 'Peripheral edema is common with dihydropyridine CCBs',
            whenToConsider: 'Bothersome edema affecting adherence',
          }
        ],
        triggeredBy: [`BP ${bpValue}`, 'Hypertension diagnosis'],
        precautions: ['Monitor electrolytes with diuretics/ACE-I', 'Watch for orthostatic hypotension in elderly'],
        expectedBenefit: '20% reduction in cardiovascular events per 10 mmHg SBP reduction',
        riskReduction: '35-40% stroke risk reduction with controlled BP',
        createdAt: new Date(),
      };
    }
  },

  // =========================================================================
  // CKD - ACE/ARB THERAPY
  // =========================================================================
  {
    id: 'ckd_acei_arb',
    name: 'CKD with Proteinuria - ACE-I/ARB',
    description: 'Recommend ACE-I or ARB for CKD with proteinuria',
    category: 'therapeutic',
    priority: 1,
    condition: (ctx) => {
      const hasCKD = ctx.diagnoses.some(d => d.code.startsWith('N18'));
      const hasProteinuria = ctx.labs.some(l => 
        (l.name.toLowerCase().includes('albumin') && l.name.toLowerCase().includes('creatinine') &&
         parseFloat(String(l.value)) > 30) ||
        (l.name.toLowerCase().includes('protein') && l.interpretation === 'abnormal')
      );
      const onACEIorARB = ctx.medications.some(m =>
        ['lisinopril', 'enalapril', 'ramipril', 'losartan', 'valsartan', 'irbesartan', 'olmesartan', 'candesartan']
          .some(drug => m.name.toLowerCase().includes(drug)) && m.status === 'active'
      );
      return hasCKD && hasProteinuria && !onACEIorARB;
    },
    generate: (ctx) => {
      const uacr = ctx.labs.find(l => 
        l.name.toLowerCase().includes('albumin') && l.name.toLowerCase().includes('creatinine')
      );

      return {
        id: `rec_${Date.now()}_ckd_acei`,
        type: 'therapeutic',
        title: 'ACE Inhibitor/ARB Recommended for Renal Protection',
        description: `Patient has CKD with proteinuria${uacr ? ` (UACR ${uacr.value} ${uacr.unit})` : ''}. ACE-I or ARB therapy slows CKD progression.`,
        rationale: 'ACE inhibitors and ARBs reduce proteinuria and slow progression of CKD. They reduce the risk of ESRD by up to 50% in patients with proteinuric CKD.',
        evidenceLevel: 'A',
        strength: 'strong',
        guidelines: [
          {
            organization: 'KDIGO',
            guidelineName: 'Clinical Practice Guideline for the Evaluation and Management of CKD',
            year: 2024,
            section: 'Blood Pressure Management in CKD',
            grade: '1A',
          }
        ],
        urgency: 'soon',
        actions: [
          {
            type: 'prescribe',
            description: 'Start Lisinopril 5-10mg daily (lower dose for CKD)',
            priority: 1,
            orderTemplate: {
              orderType: 'medication',
              name: 'Lisinopril 5mg',
              code: '314075',
              codeSystem: 'RXNORM',
              instructions: 'Take once daily. Monitor potassium and creatinine in 1-2 weeks.',
              frequency: 'Daily',
            }
          },
          {
            type: 'order',
            description: 'Check BMP in 1-2 weeks',
            priority: 2,
            orderTemplate: {
              orderType: 'lab',
              name: 'Basic Metabolic Panel',
              code: '24320-4',
              codeSystem: 'LOINC',
            }
          },
          {
            type: 'monitor',
            description: 'Accept up to 30% increase in creatinine - expected and beneficial',
            priority: 3,
          }
        ],
        contraindications: ['Bilateral renal artery stenosis', 'History of angioedema', 'Pregnancy'],
        precautions: ['Monitor K+ closely if on K+ supplements or K+-sparing diuretics', 'Hold if GI illness with dehydration'],
        expectedBenefit: 'Up to 50% reduction in risk of ESRD progression',
        riskReduction: '30-50% reduction in doubling of creatinine or ESRD',
        createdAt: new Date(),
        triggeredBy: ['CKD diagnosis', 'Proteinuria', 'Not on ACE-I/ARB'],
      };
    }
  },

  // =========================================================================
  // PREVENTIVE - COLORECTAL CANCER SCREENING
  // =========================================================================
  {
    id: 'prev_crc_screening',
    name: 'Colorectal Cancer Screening Due',
    description: 'Recommend CRC screening for eligible patients',
    category: 'preventive',
    priority: 2,
    condition: (ctx) => {
      if (ctx.age < 45 || ctx.age > 75) return false;
      
      // Check for exclusions
      const hasColonCancer = ctx.diagnoses.some(d => 
        d.code.startsWith('C18') || d.code.startsWith('C19') || d.code.startsWith('C20')
      );
      const hasColectomy = ctx.procedures.some(p => 
        p.name.toLowerCase().includes('colectomy')
      );
      if (hasColonCancer || hasColectomy) return false;

      // Check for recent screening
      const recentColonoscopy = ctx.procedures.some(p => {
        const yearsAgo = (Date.now() - new Date(p.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return p.name.toLowerCase().includes('colonoscopy') && yearsAgo < 10;
      });
      const recentFIT = ctx.labs.some(l => {
        const yearsAgo = (Date.now() - new Date(l.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return (l.name.toLowerCase().includes('fit') || l.name.toLowerCase().includes('fobt')) && yearsAgo < 1;
      });

      return !recentColonoscopy && !recentFIT;
    },
    generate: (ctx) => {
      const familyHxCRC = ctx.diagnoses.some(d => 
        d.name.toLowerCase().includes('family history') && d.name.toLowerCase().includes('colon')
      );

      return {
        id: `rec_${Date.now()}_crc`,
        type: 'preventive',
        title: 'Colorectal Cancer Screening Recommended',
        description: `Patient is ${ctx.age} years old and due for colorectal cancer screening.${familyHxCRC ? ' Note: Family history of CRC - colonoscopy preferred.' : ''}`,
        rationale: 'Colorectal cancer screening reduces CRC mortality by detecting cancer early or preventing it through polyp removal. Screening is recommended for all adults 45-75.',
        evidenceLevel: 'A',
        strength: 'strong',
        guidelines: [
          {
            organization: 'USPSTF',
            guidelineName: 'Screening for Colorectal Cancer',
            year: 2021,
            grade: 'A',
          },
          {
            organization: 'ACS',
            guidelineName: 'Colorectal Cancer Screening Guidelines',
            year: 2018,
          }
        ],
        urgency: 'routine',
        actions: [
          {
            type: 'order',
            description: familyHxCRC ? 'Order colonoscopy (preferred due to family history)' : 'Order FIT test or refer for colonoscopy',
            priority: 1,
            orderTemplate: familyHxCRC ? {
              orderType: 'referral',
              name: 'Colonoscopy referral',
              instructions: 'Screening colonoscopy. Family history of colorectal cancer.',
            } : {
              orderType: 'lab',
              name: 'FIT (Fecal Immunochemical Test)',
              code: '82274',
              codeSystem: 'CPT',
              instructions: 'Collect sample and return within 3 days',
            }
          },
          {
            type: 'educate',
            description: 'Discuss screening options with patient',
            priority: 2,
          }
        ],
        alternatives: [
          {
            description: 'Colonoscopy every 10 years',
            reason: 'Gold standard, allows polyp removal',
            whenToConsider: 'Patient preference, family history, or prior polyps',
          },
          {
            description: 'FIT-DNA (Cologuard) every 3 years',
            reason: 'More sensitive than FIT alone, non-invasive',
            whenToConsider: 'Patient declines colonoscopy and wants more sensitive test',
          },
          {
            description: 'CT Colonography every 5 years',
            reason: 'Non-invasive, good sensitivity',
            whenToConsider: 'Incomplete colonoscopy or patient preference',
          }
        ],
        triggeredBy: ['Age 45-75', 'No recent CRC screening'],
        expectedBenefit: '50-60% reduction in CRC mortality with regular screening',
        numberNeededToTreat: 200,
        createdAt: new Date(),
      };
    }
  },

  // =========================================================================
  // SAFETY - NSAID + ANTICOAGULANT
  // =========================================================================
  {
    id: 'safety_nsaid_anticoag',
    name: 'NSAID with Anticoagulant - Bleeding Risk',
    description: 'Alert for concurrent NSAID and anticoagulant use',
    category: 'safety',
    priority: 0,
    condition: (ctx) => {
      const onNSAID = ctx.medications.some(m =>
        ['ibuprofen', 'naproxen', 'meloxicam', 'diclofenac', 'indomethacin', 'ketorolac', 'celecoxib']
          .some(drug => m.name.toLowerCase().includes(drug)) && m.status === 'active'
      );
      const onAnticoagulant = ctx.medications.some(m =>
        ['warfarin', 'apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban', 'enoxaparin', 'heparin']
          .some(drug => m.name.toLowerCase().includes(drug)) && m.status === 'active'
      );
      return onNSAID && onAnticoagulant;
    },
    generate: (ctx) => {
      const nsaid = ctx.medications.find(m =>
        ['ibuprofen', 'naproxen', 'meloxicam', 'diclofenac', 'indomethacin', 'ketorolac', 'celecoxib']
          .some(drug => m.name.toLowerCase().includes(drug)) && m.status === 'active'
      );
      const anticoag = ctx.medications.find(m =>
        ['warfarin', 'apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban', 'enoxaparin', 'heparin']
          .some(drug => m.name.toLowerCase().includes(drug)) && m.status === 'active'
      );

      return {
        id: `rec_${Date.now()}_nsaid_safety`,
        type: 'safety',
        title: '⚠️ High Bleeding Risk: NSAID + Anticoagulant',
        description: `Patient is on ${nsaid?.name} AND ${anticoag?.name}. This combination significantly increases GI and other bleeding risk.`,
        rationale: 'Concurrent use of NSAIDs with anticoagulants increases bleeding risk 2-4 fold, particularly GI bleeding. This combination should be avoided when possible.',
        evidenceLevel: 'A',
        strength: 'strong',
        guidelines: [
          {
            organization: 'ACC/AHA',
            guidelineName: 'Guideline for Antithrombotic Therapy',
            year: 2023,
            section: 'Drug Interactions',
          }
        ],
        urgency: 'urgent',
        actions: [
          {
            type: 'discontinue',
            description: `Discontinue ${nsaid?.name} if possible`,
            priority: 1,
          },
          {
            type: 'prescribe',
            description: 'Switch to Acetaminophen for pain management',
            priority: 2,
            orderTemplate: {
              orderType: 'medication',
              name: 'Acetaminophen 650mg',
              code: '313782',
              codeSystem: 'RXNORM',
              instructions: 'Take 650mg every 6 hours as needed for pain. Max 3000mg/day.',
              frequency: 'Q6H PRN',
            }
          },
          {
            type: 'prescribe',
            description: 'If NSAID required, add PPI for GI protection',
            priority: 3,
            orderTemplate: {
              orderType: 'medication',
              name: 'Omeprazole 20mg',
              code: '313585',
              codeSystem: 'RXNORM',
              instructions: 'Take once daily 30 minutes before breakfast',
              frequency: 'Daily',
            }
          }
        ],
        alternatives: [
          {
            description: 'Topical NSAIDs (diclofenac gel) for localized pain',
            reason: 'Lower systemic absorption, reduced bleeding risk',
            whenToConsider: 'Localized joint/muscle pain',
          },
          {
            description: 'Duloxetine for chronic pain',
            reason: 'No bleeding risk, effective for chronic pain',
            whenToConsider: 'Chronic musculoskeletal or neuropathic pain',
          }
        ],
        triggeredBy: [`Active ${nsaid?.name}`, `Active ${anticoag?.name}`],
        expectedBenefit: '50-75% reduction in GI bleeding risk by avoiding combination',
        createdAt: new Date(),
      };
    }
  },

  // =========================================================================
  // COST OPTIMIZATION - GENERIC SUBSTITUTION
  // =========================================================================
  {
    id: 'cost_brand_to_generic',
    name: 'Generic Medication Available',
    description: 'Recommend generic substitution for cost savings',
    category: 'cost_optimization',
    priority: 3,
    condition: (ctx) => {
      const brandMeds = ['Lipitor', 'Crestor', 'Nexium', 'Prevacid', 'Plavix', 'Singulair', 'Zetia'];
      return ctx.medications.some(m =>
        brandMeds.some(brand => m.name.toLowerCase().includes(brand.toLowerCase())) && m.status === 'active'
      );
    },
    generate: (ctx) => {
      const brandMeds = [
        { brand: 'Lipitor', generic: 'Atorvastatin', savings: '$200-300/month' },
        { brand: 'Crestor', generic: 'Rosuvastatin', savings: '$150-250/month' },
        { brand: 'Nexium', generic: 'Esomeprazole', savings: '$100-200/month' },
        { brand: 'Prevacid', generic: 'Lansoprazole', savings: '$100-150/month' },
        { brand: 'Plavix', generic: 'Clopidogrel', savings: '$150-200/month' },
        { brand: 'Singulair', generic: 'Montelukast', savings: '$100-150/month' },
      ];

      const currentBrand = ctx.medications.find(m =>
        brandMeds.some(b => m.name.toLowerCase().includes(b.brand.toLowerCase()))
      );
      const matchedBrand = brandMeds.find(b => 
        currentBrand?.name.toLowerCase().includes(b.brand.toLowerCase())
      );

      if (!matchedBrand) return null;

      return {
        id: `rec_${Date.now()}_generic`,
        type: 'cost_optimization',
        title: 'Generic Medication Substitution Available',
        description: `${matchedBrand.brand} can be switched to generic ${matchedBrand.generic}. Estimated savings: ${matchedBrand.savings}.`,
        rationale: 'Generic medications are bioequivalent to brand-name drugs but cost significantly less. Switching to generics improves adherence by reducing cost burden.',
        evidenceLevel: 'A',
        strength: 'strong',
        guidelines: [
          {
            organization: 'FDA',
            guidelineName: 'Generic Drug Facts',
            year: 2023,
          }
        ],
        urgency: 'routine',
        actions: [
          {
            type: 'prescribe',
            description: `Switch to ${matchedBrand.generic} (same dose)`,
            priority: 1,
            orderTemplate: {
              orderType: 'medication',
              name: matchedBrand.generic,
            }
          }
        ],
        triggeredBy: [`Taking brand ${matchedBrand.brand}`],
        expectedBenefit: `Estimated savings of ${matchedBrand.savings}`,
        createdAt: new Date(),
      };
    }
  },
];

// =============================================================================
// CLINICAL DECISION ENGINE
// =============================================================================

export class ClinicalDecisionEngine extends EventEmitter {
  private rules: ClinicalRule[] = CLINICAL_RULES;

  constructor() {
    super();
  }

  // =========================================================================
  // MAIN ANALYSIS
  // =========================================================================

  async analyzePatient(context: PatientContext): Promise<ClinicalRecommendation[]> {
    const recommendations: ClinicalRecommendation[] = [];

    // Sort rules by priority (lower = higher priority)
    const sortedRules = [...this.rules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      try {
        if (rule.condition(context)) {
          const recommendation = rule.generate(context);
          if (recommendation) {
            recommendations.push(recommendation);
            this.emit('recommendationGenerated', recommendation);
          }
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }

    // Sort by urgency
    const urgencyOrder: Record<UrgencyLevel, number> = {
      emergent: 0,
      urgent: 1,
      soon: 2,
      routine: 3,
    };

    recommendations.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    this.emit('analysisComplete', { patientId: context.patientId, recommendations });
    return recommendations;
  }

  // =========================================================================
  // FILTER BY CATEGORY
  // =========================================================================

  async getRecommendationsByType(
    context: PatientContext,
    type: RecommendationType
  ): Promise<ClinicalRecommendation[]> {
    const all = await this.analyzePatient(context);
    return all.filter(r => r.type === type);
  }

  async getSafetyAlerts(context: PatientContext): Promise<ClinicalRecommendation[]> {
    return this.getRecommendationsByType(context, 'safety');
  }

  async getTherapeuticRecommendations(context: PatientContext): Promise<ClinicalRecommendation[]> {
    return this.getRecommendationsByType(context, 'therapeutic');
  }

  async getPreventiveRecommendations(context: PatientContext): Promise<ClinicalRecommendation[]> {
    return this.getRecommendationsByType(context, 'preventive');
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  private identifyDrugClass(drugName: string): string {
    const name = drugName.toLowerCase();
    
    if (['lisinopril', 'enalapril', 'ramipril', 'benazepril', 'quinapril'].some(d => name.includes(d))) {
      return 'acei';
    }
    if (['losartan', 'valsartan', 'irbesartan', 'olmesartan', 'candesartan'].some(d => name.includes(d))) {
      return 'arb';
    }
    if (['amlodipine', 'nifedipine', 'diltiazem', 'verapamil'].some(d => name.includes(d))) {
      return 'ccb';
    }
    if (['metoprolol', 'carvedilol', 'atenolol', 'bisoprolol', 'propranolol'].some(d => name.includes(d))) {
      return 'beta_blocker';
    }
    if (['hydrochlorothiazide', 'chlorthalidone', 'indapamide'].some(d => name.includes(d))) {
      return 'thiazide';
    }
    
    return 'unknown';
  }

  // =========================================================================
  // CUSTOM RULES
  // =========================================================================

  addRule(rule: ClinicalRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  getRules(): ClinicalRule[] {
    return [...this.rules];
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const clinicalDecisionEngine = new ClinicalDecisionEngine();
