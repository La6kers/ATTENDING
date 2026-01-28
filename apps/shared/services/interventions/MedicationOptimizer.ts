// =============================================================================
// ATTENDING AI - Medication Optimization Engine
// apps/shared/services/interventions/MedicationOptimizer.ts
//
// AI-powered medication review for deprescribing, polypharmacy management,
// therapeutic duplication, cost optimization, and adherence improvement.
// Goes beyond drug interactions to optimize the entire medication regimen.
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type OptimizationType = 
  | 'deprescribe'
  | 'therapeutic_substitution'
  | 'dose_optimization'
  | 'formulation_change'
  | 'cost_reduction'
  | 'adherence_improvement'
  | 'duplicate_therapy'
  | 'drug_disease_interaction'
  | 'pill_burden_reduction'
  | 'renal_adjustment'
  | 'hepatic_adjustment'
  | 'age_related';

export interface MedicationOptimization {
  id: string;
  type: OptimizationType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Current state
  currentMedication: MedicationInfo;
  
  // Recommendation
  recommendation: string;
  rationale: string;
  suggestedAction: 'discontinue' | 'reduce' | 'switch' | 'consolidate' | 'modify' | 'monitor';
  
  // Alternative (if applicable)
  alternativeMedication?: MedicationInfo;
  
  // Evidence
  evidenceLevel: 'high' | 'moderate' | 'low' | 'expert_opinion';
  guidelines?: string[];
  
  // Impact
  expectedBenefit: string;
  estimatedSavings?: number;
  pillBurdenReduction?: number;
  
  // Safety
  tapering?: TaperingSchedule;
  monitoringRequired?: string[];
  warnings?: string[];
  
  // Tracking
  createdAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'deferred';
  providerNotes?: string;
}

export interface MedicationInfo {
  name: string;
  dose: string;
  frequency: string;
  route: string;
  indication?: string;
  rxnormCode?: string;
  drugClass?: string;
  startDate?: Date;
  prescriber?: string;
  monthlyCost?: number;
}

export interface TaperingSchedule {
  steps: TaperingStep[];
  duration: string;
  monitoringPoints: string[];
}

export interface TaperingStep {
  week: number;
  dose: string;
  frequency: string;
  instructions: string;
}

export interface MedicationReviewContext {
  patientId: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  
  // Medications
  medications: MedicationInfo[];
  
  // Clinical context
  diagnoses: Array<{ code: string; name: string; status: string }>;
  allergies: string[];
  
  // Organ function
  renalFunction?: { creatinine: number; egfr: number };
  hepaticFunction?: { childPugh?: 'A' | 'B' | 'C'; ast?: number; alt?: number };
  
  // Other factors
  cognitiveStatus?: 'intact' | 'mild_impairment' | 'moderate_impairment' | 'severe_impairment';
  fallRisk?: boolean;
  lifeExpectancy?: 'limited' | 'normal';
  functionalStatus?: 'independent' | 'assisted' | 'dependent';
  
  // Goals
  patientGoals?: string[];
  costSensitive?: boolean;
}

export interface MedicationReviewReport {
  patientId: string;
  reviewDate: Date;
  
  // Summary
  totalMedications: number;
  highRiskMedications: number;
  polypharmacyLevel: 'none' | 'moderate' | 'severe';
  
  // Optimizations
  optimizations: MedicationOptimization[];
  
  // Metrics
  potentialCostSavings: number;
  pillBurdenReduction: number;
  interactionsIdentified: number;
  
  // Recommendations summary
  urgentActions: number;
  routineActions: number;
}

// =============================================================================
// DEPRESCRIBING CRITERIA (BEERS, STOPP/START, etc.)
// =============================================================================

interface DeprescribingRule {
  id: string;
  drugClasses: string[];
  drugNames: string[];
  criteria: {
    ageMin?: number;
    conditions?: string[];
    conditionsAbsent?: string[];
    durationMin?: number; // months
  };
  recommendation: string;
  rationale: string;
  evidenceLevel: MedicationOptimization['evidenceLevel'];
  guidelines: string[];
  tapering?: boolean;
}

const DEPRESCRIBING_RULES: DeprescribingRule[] = [
  // PPIs
  {
    id: 'ppi_long_term',
    drugClasses: ['proton pump inhibitor'],
    drugNames: ['omeprazole', 'esomeprazole', 'pantoprazole', 'lansoprazole', 'rabeprazole', 'nexium', 'prilosec', 'protonix'],
    criteria: {
      durationMin: 8,
      conditionsAbsent: ['barrett esophagus', 'severe esophagitis', 'zollinger-ellison'],
    },
    recommendation: 'Consider PPI deprescribing or step-down to H2 blocker',
    rationale: 'Long-term PPI use associated with increased risk of C. diff, bone fractures, CKD, and B12 deficiency. Most patients can be successfully stepped down.',
    evidenceLevel: 'high',
    guidelines: ['ACG Guidelines', 'Choosing Wisely'],
    tapering: true,
  },

  // Benzodiazepines
  {
    id: 'benzo_elderly',
    drugClasses: ['benzodiazepine'],
    drugNames: ['lorazepam', 'diazepam', 'alprazolam', 'clonazepam', 'temazepam', 'ativan', 'valium', 'xanax', 'klonopin'],
    criteria: {
      ageMin: 65,
    },
    recommendation: 'Strongly consider benzodiazepine tapering and discontinuation',
    rationale: 'Beers Criteria: Older adults have increased sensitivity. Risk of cognitive impairment, delirium, falls, fractures, and motor vehicle accidents.',
    evidenceLevel: 'high',
    guidelines: ['AGS Beers Criteria 2023', 'STOPP/START v2'],
    tapering: true,
  },

  // Anticholinergics
  {
    id: 'anticholinergic_elderly',
    drugClasses: ['anticholinergic', 'antihistamine'],
    drugNames: ['diphenhydramine', 'hydroxyzine', 'oxybutynin', 'tolterodine', 'benadryl', 'ditropan'],
    criteria: {
      ageMin: 65,
    },
    recommendation: 'Avoid anticholinergic medications; consider alternatives',
    rationale: 'High anticholinergic burden increases risk of cognitive decline, falls, constipation, urinary retention, and delirium.',
    evidenceLevel: 'high',
    guidelines: ['AGS Beers Criteria 2023'],
    tapering: false,
  },

  // NSAIDs chronic
  {
    id: 'nsaid_chronic',
    drugClasses: ['nsaid'],
    drugNames: ['ibuprofen', 'naproxen', 'meloxicam', 'diclofenac', 'indomethacin', 'advil', 'aleve', 'motrin'],
    criteria: {
      ageMin: 65,
      durationMin: 3,
    },
    recommendation: 'Consider NSAID discontinuation; use alternatives',
    rationale: 'Chronic NSAID use increases GI bleeding, cardiovascular events, and AKI risk. Effect amplified in elderly.',
    evidenceLevel: 'high',
    guidelines: ['AGS Beers Criteria 2023', 'ACR Guidelines'],
    tapering: false,
  },

  // Duplicate statin
  {
    id: 'statin_no_indication',
    drugClasses: ['statin'],
    drugNames: ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin', 'lovastatin', 'lipitor', 'crestor'],
    criteria: {
      ageMin: 75,
      conditionsAbsent: ['coronary artery disease', 'stroke', 'diabetes', 'peripheral artery disease'],
    },
    recommendation: 'Consider statin deprescribing for primary prevention in patients >75',
    rationale: 'Limited evidence for primary prevention benefit in those >75. Shared decision-making recommended.',
    evidenceLevel: 'moderate',
    guidelines: ['ACC/AHA Cholesterol Guidelines', 'USPSTF'],
    tapering: false,
  },

  // Bisphosphonates
  {
    id: 'bisphosphonate_duration',
    drugClasses: ['bisphosphonate'],
    drugNames: ['alendronate', 'risedronate', 'ibandronate', 'zoledronic', 'fosamax', 'boniva'],
    criteria: {
      durationMin: 60, // 5 years
    },
    recommendation: 'Consider bisphosphonate drug holiday after 5 years',
    rationale: 'Limited benefit beyond 5 years for most patients. Risk of atypical femur fractures and osteonecrosis of jaw increases with duration.',
    evidenceLevel: 'moderate',
    guidelines: ['AACE/ACE Guidelines', 'Endocrine Society'],
    tapering: false,
  },

  // Sulfonylureas in elderly
  {
    id: 'sulfonylurea_elderly',
    drugClasses: ['sulfonylurea'],
    drugNames: ['glipizide', 'glyburide', 'glimepiride', 'glucotrol', 'diabeta'],
    criteria: {
      ageMin: 65,
    },
    recommendation: 'Consider switching from sulfonylurea to safer alternative',
    rationale: 'Sulfonylureas cause hypoglycemia, especially glyburide. Consider switching to DPP-4i, SGLT2i, or GLP-1 RA.',
    evidenceLevel: 'high',
    guidelines: ['ADA Standards of Care', 'AGS Beers Criteria'],
    tapering: false,
  },

  // Sliding scale insulin
  {
    id: 'sliding_scale_insulin',
    drugClasses: ['insulin'],
    drugNames: ['sliding scale', 'correctional insulin'],
    criteria: {},
    recommendation: 'Replace sliding scale insulin with scheduled basal-bolus regimen',
    rationale: 'Sliding scale insulin alone is reactive, leads to glycemic variability, and is associated with worse outcomes.',
    evidenceLevel: 'high',
    guidelines: ['ADA Standards of Care', 'Endocrine Society'],
    tapering: false,
  },
];

// =============================================================================
// THERAPEUTIC ALTERNATIVES DATABASE
// =============================================================================

interface TherapeuticAlternative {
  originalDrugs: string[];
  alternative: {
    name: string;
    dose: string;
    frequency: string;
  };
  reason: string;
  costSavings?: string;
  advantages: string[];
}

const THERAPEUTIC_ALTERNATIVES: TherapeuticAlternative[] = [
  {
    originalDrugs: ['esomeprazole', 'nexium'],
    alternative: { name: 'Omeprazole', dose: '20mg', frequency: 'Daily' },
    reason: 'Therapeutic equivalence at lower cost',
    costSavings: '$150-200/month',
    advantages: ['Same efficacy', 'Generic available', 'Lower cost'],
  },
  {
    originalDrugs: ['crestor', 'rosuvastatin'],
    alternative: { name: 'Atorvastatin', dose: '40mg', frequency: 'Daily' },
    reason: 'Similar LDL reduction at lower cost',
    costSavings: '$50-100/month',
    advantages: ['Generic available', 'Equivalent efficacy for most', 'Lower cost'],
  },
  {
    originalDrugs: ['lyrica', 'pregabalin'],
    alternative: { name: 'Gabapentin', dose: '300mg', frequency: 'TID' },
    reason: 'Same mechanism, lower cost',
    costSavings: '$200-300/month',
    advantages: ['Generic available', 'Similar efficacy', 'Lower cost'],
  },
  {
    originalDrugs: ['eliquis'],
    alternative: { name: 'Warfarin', dose: 'INR-adjusted', frequency: 'Daily' },
    reason: 'Cost reduction option if INR monitoring feasible',
    costSavings: '$400-500/month',
    advantages: ['Much lower cost', 'Reversible', 'Long track record'],
  },
];

// =============================================================================
// MEDICATION OPTIMIZER SERVICE
// =============================================================================

export class MedicationOptimizer extends EventEmitter {
  
  constructor() {
    super();
  }

  // =========================================================================
  // MAIN REVIEW
  // =========================================================================

  async performMedicationReview(context: MedicationReviewContext): Promise<MedicationReviewReport> {
    const optimizations: MedicationOptimization[] = [];
    let potentialSavings = 0;
    let pillBurdenReduction = 0;
    let interactionsCount = 0;

    // 1. Check deprescribing opportunities
    const deprescribing = this.checkDeprescribingOpportunities(context);
    optimizations.push(...deprescribing);

    // 2. Check for therapeutic duplications
    const duplications = this.checkTherapeuticDuplications(context.medications);
    optimizations.push(...duplications);
    interactionsCount += duplications.length;

    // 3. Check for cost optimization opportunities
    const costOpts = this.checkCostOptimizations(context.medications);
    optimizations.push(...costOpts);
    potentialSavings = costOpts.reduce((sum, o) => sum + (o.estimatedSavings || 0), 0);

    // 4. Check renal dose adjustments
    if (context.renalFunction) {
      const renalAdj = this.checkRenalDoseAdjustments(context);
      optimizations.push(...renalAdj);
    }

    // 5. Check drug-disease interactions
    const drugDisease = this.checkDrugDiseaseInteractions(context);
    optimizations.push(...drugDisease);
    interactionsCount += drugDisease.length;

    // 6. Check for adherence improvements (pill burden)
    const adherenceOpts = this.checkAdherenceOpportunities(context.medications);
    optimizations.push(...adherenceOpts);
    pillBurdenReduction = adherenceOpts.reduce((sum, o) => sum + (o.pillBurdenReduction || 0), 0);

    // Sort by priority
    optimizations.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const report: MedicationReviewReport = {
      patientId: context.patientId,
      reviewDate: new Date(),
      totalMedications: context.medications.length,
      highRiskMedications: this.countHighRiskMedications(context),
      polypharmacyLevel: context.medications.length >= 10 ? 'severe' : 
                         context.medications.length >= 5 ? 'moderate' : 'none',
      optimizations,
      potentialCostSavings: potentialSavings,
      pillBurdenReduction,
      interactionsIdentified: interactionsCount,
      urgentActions: optimizations.filter(o => o.priority === 'urgent').length,
      routineActions: optimizations.filter(o => o.priority !== 'urgent').length,
    };

    this.emit('reviewCompleted', report);
    return report;
  }

  // =========================================================================
  // DEPRESCRIBING
  // =========================================================================

  private checkDeprescribingOpportunities(context: MedicationReviewContext): MedicationOptimization[] {
    const opportunities: MedicationOptimization[] = [];

    for (const med of context.medications) {
      const medNameLower = med.name.toLowerCase();
      
      for (const rule of DEPRESCRIBING_RULES) {
        // Check if medication matches rule
        const matchesDrug = rule.drugNames.some(d => medNameLower.includes(d.toLowerCase()));
        if (!matchesDrug) continue;

        // Check age criteria
        if (rule.criteria.ageMin && context.age < rule.criteria.ageMin) continue;

        // Check required conditions absent
        if (rule.criteria.conditionsAbsent) {
          const hasExcludingCondition = rule.criteria.conditionsAbsent.some(cond =>
            context.diagnoses.some(d => d.name.toLowerCase().includes(cond.toLowerCase()))
          );
          if (hasExcludingCondition) continue;
        }

        // Check duration (if start date available)
        if (rule.criteria.durationMin && med.startDate) {
          const monthsOnMed = (Date.now() - new Date(med.startDate).getTime()) / (30 * 24 * 60 * 60 * 1000);
          if (monthsOnMed < rule.criteria.durationMin) continue;
        }

        // Generate optimization
        const opt: MedicationOptimization = {
          id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'deprescribe',
          priority: rule.id.includes('benzo') || rule.id.includes('anticholinergic') ? 'high' : 'medium',
          currentMedication: med,
          recommendation: rule.recommendation,
          rationale: rule.rationale,
          suggestedAction: rule.tapering ? 'reduce' : 'discontinue',
          evidenceLevel: rule.evidenceLevel,
          guidelines: rule.guidelines,
          expectedBenefit: 'Reduced medication burden and adverse effects',
          tapering: rule.tapering ? this.generateTaperingSchedule(med) : undefined,
          warnings: this.getDeprescribingWarnings(rule.id),
          createdAt: new Date(),
          status: 'pending',
        };

        opportunities.push(opt);
      }
    }

    return opportunities;
  }

  private generateTaperingSchedule(med: MedicationInfo): TaperingSchedule {
    // Generic tapering - 25% reduction every 2-4 weeks
    const currentDose = parseFloat(med.dose) || 0;
    
    return {
      steps: [
        { week: 1, dose: `${currentDose * 0.75}mg`, frequency: med.frequency, instructions: 'Reduce dose by 25%' },
        { week: 3, dose: `${currentDose * 0.5}mg`, frequency: med.frequency, instructions: 'Reduce dose by 50%' },
        { week: 5, dose: `${currentDose * 0.25}mg`, frequency: med.frequency, instructions: 'Reduce dose by 75%' },
        { week: 7, dose: 'Discontinue', frequency: 'N/A', instructions: 'Stop medication' },
      ],
      duration: '6-8 weeks',
      monitoringPoints: ['Assess for withdrawal symptoms', 'Monitor for return of original symptoms', 'Follow up in 2-4 weeks'],
    };
  }

  private getDeprescribingWarnings(ruleId: string): string[] {
    const warnings: Record<string, string[]> = {
      'benzo_elderly': ['Taper slowly to avoid withdrawal', 'Monitor for rebound anxiety/insomnia', 'Consider non-pharmacologic alternatives'],
      'ppi_long_term': ['May experience rebound acid hypersecretion', 'Consider H2 blocker bridge', 'Monitor for symptom recurrence'],
    };
    return warnings[ruleId] || [];
  }

  // =========================================================================
  // THERAPEUTIC DUPLICATIONS
  // =========================================================================

  private checkTherapeuticDuplications(medications: MedicationInfo[]): MedicationOptimization[] {
    const duplications: MedicationOptimization[] = [];
    const drugClasses = new Map<string, MedicationInfo[]>();

    // Group by drug class
    for (const med of medications) {
      const drugClass = med.drugClass || this.inferDrugClass(med.name);
      if (!drugClass) continue;
      
      const existing = drugClasses.get(drugClass) || [];
      existing.push(med);
      drugClasses.set(drugClass, existing);
    }

    // Find duplications
    drugClasses.forEach((meds, drugClass) => {
      if (meds.length > 1) {
        duplications.push({
          id: `opt_dup_${Date.now()}`,
          type: 'duplicate_therapy',
          priority: 'high',
          currentMedication: meds[0],
          recommendation: `Patient is on ${meds.length} medications in the ${drugClass} class: ${meds.map(m => m.name).join(', ')}. Review for therapeutic duplication.`,
          rationale: 'Therapeutic duplication increases risk of adverse effects without additional benefit.',
          suggestedAction: 'discontinue',
          evidenceLevel: 'high',
          expectedBenefit: 'Reduced adverse effects and cost',
          pillBurdenReduction: meds.length - 1,
          createdAt: new Date(),
          status: 'pending',
        });
      }
    });

    return duplications;
  }

  private inferDrugClass(drugName: string): string | null {
    const name = drugName.toLowerCase();
    
    const classMap: Record<string, string[]> = {
      'ACE Inhibitor': ['lisinopril', 'enalapril', 'ramipril', 'benazepril'],
      'ARB': ['losartan', 'valsartan', 'irbesartan', 'olmesartan'],
      'Statin': ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin'],
      'PPI': ['omeprazole', 'esomeprazole', 'pantoprazole', 'lansoprazole'],
      'SSRI': ['sertraline', 'fluoxetine', 'paroxetine', 'citalopram', 'escitalopram'],
      'Beta Blocker': ['metoprolol', 'carvedilol', 'atenolol', 'bisoprolol'],
      'Thiazide': ['hydrochlorothiazide', 'chlorthalidone', 'indapamide'],
      'Benzodiazepine': ['lorazepam', 'diazepam', 'alprazolam', 'clonazepam'],
      'Opioid': ['oxycodone', 'hydrocodone', 'morphine', 'tramadol', 'fentanyl'],
    };

    for (const [drugClass, drugs] of Object.entries(classMap)) {
      if (drugs.some(d => name.includes(d))) {
        return drugClass;
      }
    }

    return null;
  }

  // =========================================================================
  // COST OPTIMIZATION
  // =========================================================================

  private checkCostOptimizations(medications: MedicationInfo[]): MedicationOptimization[] {
    const optimizations: MedicationOptimization[] = [];

    for (const med of medications) {
      const medNameLower = med.name.toLowerCase();

      for (const alt of THERAPEUTIC_ALTERNATIVES) {
        if (alt.originalDrugs.some(d => medNameLower.includes(d.toLowerCase()))) {
          optimizations.push({
            id: `opt_cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'cost_reduction',
            priority: 'low',
            currentMedication: med,
            recommendation: `Consider switching to ${alt.alternative.name} for cost savings`,
            rationale: alt.reason,
            suggestedAction: 'switch',
            alternativeMedication: {
              name: alt.alternative.name,
              dose: alt.alternative.dose,
              frequency: alt.alternative.frequency,
              route: med.route,
            },
            evidenceLevel: 'high',
            expectedBenefit: alt.advantages.join('; '),
            estimatedSavings: parseInt(alt.costSavings?.match(/\d+/)?.[0] || '0'),
            createdAt: new Date(),
            status: 'pending',
          });
        }
      }
    }

    return optimizations;
  }

  // =========================================================================
  // RENAL DOSE ADJUSTMENTS
  // =========================================================================

  private checkRenalDoseAdjustments(context: MedicationReviewContext): MedicationOptimization[] {
    const adjustments: MedicationOptimization[] = [];
    const egfr = context.renalFunction?.egfr || 100;

    const renalDrugs: Array<{
      names: string[];
      threshold: number;
      recommendation: string;
    }> = [
      {
        names: ['metformin'],
        threshold: 30,
        recommendation: egfr < 30 ? 'Contraindicated - discontinue' : egfr < 45 ? 'Reduce dose to 500-1000mg/day' : 'Monitor renal function',
      },
      {
        names: ['gabapentin'],
        threshold: 60,
        recommendation: egfr < 30 ? 'Reduce to 100-300mg daily' : egfr < 60 ? 'Reduce dose by 50%' : 'Standard dosing',
      },
      {
        names: ['enoxaparin', 'lovenox'],
        threshold: 30,
        recommendation: 'Reduce to once daily dosing or use UFH',
      },
      {
        names: ['dabigatran', 'pradaxa'],
        threshold: 30,
        recommendation: 'Contraindicated if CrCl < 30',
      },
      {
        names: ['rivaroxaban', 'xarelto'],
        threshold: 50,
        recommendation: egfr < 30 ? 'Avoid use' : 'Reduce dose to 15mg daily',
      },
    ];

    for (const med of context.medications) {
      const medNameLower = med.name.toLowerCase();

      for (const renalDrug of renalDrugs) {
        if (renalDrug.names.some(n => medNameLower.includes(n)) && egfr < renalDrug.threshold) {
          adjustments.push({
            id: `opt_renal_${Date.now()}`,
            type: 'renal_adjustment',
            priority: egfr < 30 ? 'urgent' : 'high',
            currentMedication: med,
            recommendation: `Renal adjustment needed (eGFR ${egfr}): ${renalDrug.recommendation}`,
            rationale: `Drug accumulation risk with reduced renal function`,
            suggestedAction: 'modify',
            evidenceLevel: 'high',
            expectedBenefit: 'Prevent drug toxicity',
            monitoringRequired: ['Renal function', 'Drug levels if applicable'],
            createdAt: new Date(),
            status: 'pending',
          });
        }
      }
    }

    return adjustments;
  }

  // =========================================================================
  // DRUG-DISEASE INTERACTIONS
  // =========================================================================

  private checkDrugDiseaseInteractions(context: MedicationReviewContext): MedicationOptimization[] {
    const interactions: MedicationOptimization[] = [];

    const drugDiseaseRules: Array<{
      drugs: string[];
      conditions: string[];
      severity: MedicationOptimization['priority'];
      recommendation: string;
    }> = [
      {
        drugs: ['metformin'],
        conditions: ['heart failure'],
        severity: 'medium',
        recommendation: 'Use with caution in heart failure; monitor for lactic acidosis',
      },
      {
        drugs: ['nsaid', 'ibuprofen', 'naproxen', 'meloxicam'],
        conditions: ['heart failure', 'ckd', 'chronic kidney'],
        severity: 'high',
        recommendation: 'NSAIDs worsen heart failure and CKD - avoid if possible',
      },
      {
        drugs: ['beta blocker', 'metoprolol', 'carvedilol'],
        conditions: ['asthma'],
        severity: 'high',
        recommendation: 'Beta blockers may worsen asthma - use cardioselective agent if needed',
      },
      {
        drugs: ['anticholinergic', 'oxybutynin', 'diphenhydramine'],
        conditions: ['dementia', 'cognitive impairment', 'glaucoma', 'bph'],
        severity: 'high',
        recommendation: 'Anticholinergics worsen cognition and contraindicated in glaucoma/BPH',
      },
      {
        drugs: ['thiazolidinedione', 'pioglitazone'],
        conditions: ['heart failure'],
        severity: 'urgent',
        recommendation: 'TZDs cause fluid retention - contraindicated in heart failure',
      },
    ];

    for (const med of context.medications) {
      const medNameLower = med.name.toLowerCase();

      for (const rule of drugDiseaseRules) {
        const matchesDrug = rule.drugs.some(d => medNameLower.includes(d));
        if (!matchesDrug) continue;

        const matchesCondition = rule.conditions.some(c =>
          context.diagnoses.some(d => d.name.toLowerCase().includes(c))
        );
        if (!matchesCondition) continue;

        interactions.push({
          id: `opt_dd_${Date.now()}`,
          type: 'drug_disease_interaction',
          priority: rule.severity,
          currentMedication: med,
          recommendation: rule.recommendation,
          rationale: 'Drug-disease contraindication or interaction',
          suggestedAction: rule.severity === 'urgent' ? 'discontinue' : 'modify',
          evidenceLevel: 'high',
          expectedBenefit: 'Avoid disease exacerbation',
          createdAt: new Date(),
          status: 'pending',
        });
      }
    }

    return interactions;
  }

  // =========================================================================
  // ADHERENCE / PILL BURDEN
  // =========================================================================

  private checkAdherenceOpportunities(medications: MedicationInfo[]): MedicationOptimization[] {
    const opportunities: MedicationOptimization[] = [];

    // Check for combination opportunities
    const combinationOpportunities: Array<{
      drug1: string;
      drug2: string;
      combination: string;
    }> = [
      { drug1: 'lisinopril', drug2: 'amlodipine', combination: 'Lisinopril/Amlodipine' },
      { drug1: 'losartan', drug2: 'hydrochlorothiazide', combination: 'Losartan/HCTZ' },
      { drug1: 'metformin', drug2: 'sitagliptin', combination: 'Janumet' },
      { drug1: 'atorvastatin', drug2: 'amlodipine', combination: 'Caduet' },
    ];

    for (const combo of combinationOpportunities) {
      const hasDrug1 = medications.some(m => m.name.toLowerCase().includes(combo.drug1));
      const hasDrug2 = medications.some(m => m.name.toLowerCase().includes(combo.drug2));

      if (hasDrug1 && hasDrug2) {
        opportunities.push({
          id: `opt_combo_${Date.now()}`,
          type: 'pill_burden_reduction',
          priority: 'low',
          currentMedication: medications.find(m => m.name.toLowerCase().includes(combo.drug1))!,
          recommendation: `Consider combination ${combo.combination} to reduce pill burden`,
          rationale: 'Combination products can improve adherence by reducing number of pills',
          suggestedAction: 'consolidate',
          alternativeMedication: {
            name: combo.combination,
            dose: 'Equivalent doses',
            frequency: 'Daily',
            route: 'PO',
          },
          evidenceLevel: 'moderate',
          expectedBenefit: 'Improved adherence, reduced pill burden',
          pillBurdenReduction: 1,
          createdAt: new Date(),
          status: 'pending',
        });
      }
    }

    return opportunities;
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  private countHighRiskMedications(context: MedicationReviewContext): number {
    const highRiskDrugs = [
      'warfarin', 'insulin', 'opioid', 'methotrexate', 'chemotherapy',
      'digoxin', 'lithium', 'anticoagulant', 'benzodiazepine'
    ];

    return context.medications.filter(m =>
      highRiskDrugs.some(hr => m.name.toLowerCase().includes(hr))
    ).length;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const medicationOptimizer = new MedicationOptimizer();
