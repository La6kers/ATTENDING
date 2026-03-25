// =============================================================================
// ATTENDING AI - Clinical Trial Matching Service
// apps/shared/services/interventions/ClinicalTrialMatcher.ts
//
// Automatically identifies patients eligible for clinical trials based on
// their conditions, demographics, and clinical data. Integrates with
// ClinicalTrials.gov and institutional trial registries.
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export interface ClinicalTrial {
  id: string;
  nctId: string;
  title: string;
  briefSummary: string;
  phase: 'Phase 1' | 'Phase 2' | 'Phase 3' | 'Phase 4' | 'N/A';
  status: 'Recruiting' | 'Not yet recruiting' | 'Active, not recruiting' | 'Completed' | 'Suspended';
  
  // Conditions
  conditions: string[];
  conditionCodes?: string[];
  
  // Eligibility
  eligibilityCriteria: EligibilityCriteria;
  
  // Locations
  locations: TrialLocation[];
  
  // Sponsor
  sponsor: string;
  collaborators?: string[];
  
  // Timing
  startDate?: Date;
  estimatedCompletionDate?: Date;
  lastUpdated: Date;
  
  // Contact
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  
  // Study details
  studyType: 'Interventional' | 'Observational' | 'Expanded Access';
  interventions?: string[];
  primaryOutcome?: string;
  
  // Links
  url: string;
}

export interface EligibilityCriteria {
  gender: 'All' | 'Male' | 'Female';
  minAge?: number;
  maxAge?: number;
  healthyVolunteers: boolean;
  
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  
  // Structured criteria for matching
  requiredConditions?: string[];
  requiredMedications?: string[];
  excludedConditions?: string[];
  excludedMedications?: string[];
  labRequirements?: LabRequirement[];
}

export interface LabRequirement {
  labName: string;
  labCode?: string;
  operator: '>' | '<' | '>=' | '<=' | '=' | 'between';
  value: number;
  upperValue?: number;
  unit?: string;
}

export interface TrialLocation {
  facility: string;
  city: string;
  state: string;
  country: string;
  zipCode?: string;
  status: 'Recruiting' | 'Not yet recruiting' | 'Active, not recruiting';
  contactName?: string;
  contactPhone?: string;
  distance?: number; // Miles from patient
}

export interface PatientTrialContext {
  patientId: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  
  // Location
  zipCode?: string;
  city?: string;
  state?: string;
  maxDistanceMiles?: number;
  
  // Clinical data
  diagnoses: Array<{ code: string; name: string; status: string }>;
  medications: Array<{ name: string; status: string }>;
  labs: Array<{ name: string; code?: string; value: number; unit?: string; date: Date }>;
  
  // Performance status
  ecogStatus?: number;
  kps?: number; // Karnofsky Performance Status
  
  // Other
  priorTreatments?: string[];
  allergies?: string[];
}

export interface TrialMatch {
  trial: ClinicalTrial;
  matchScore: number;
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  potentialExclusions: string[];
  nearestLocation?: TrialLocation;
  recommendationStrength: 'strong' | 'moderate' | 'weak';
  notes?: string;
}

// =============================================================================
// SAMPLE CLINICAL TRIALS DATABASE
// =============================================================================

const CLINICAL_TRIALS: ClinicalTrial[] = [
  {
    id: 'trial_1',
    nctId: 'NCT04000001',
    title: 'Study of Semaglutide vs Standard Care in Type 2 Diabetes with CKD',
    briefSummary: 'A randomized controlled trial comparing semaglutide to standard of care in patients with type 2 diabetes and chronic kidney disease.',
    phase: 'Phase 3',
    status: 'Recruiting',
    conditions: ['Type 2 Diabetes Mellitus', 'Chronic Kidney Disease'],
    conditionCodes: ['E11', 'N18'],
    eligibilityCriteria: {
      gender: 'All',
      minAge: 18,
      maxAge: 80,
      healthyVolunteers: false,
      inclusionCriteria: [
        'Diagnosis of type 2 diabetes',
        'eGFR 30-60 mL/min/1.73m²',
        'HbA1c 7.0-10.0%',
        'Stable diabetes regimen for 3 months',
      ],
      exclusionCriteria: [
        'Type 1 diabetes',
        'Prior GLP-1 RA use',
        'Active malignancy',
        'Pregnancy or breastfeeding',
      ],
      requiredConditions: ['E11'],
      excludedConditions: ['E10', 'C'],
      labRequirements: [
        { labName: 'eGFR', operator: 'between', value: 30, upperValue: 60 },
        { labName: 'HbA1c', operator: 'between', value: 7, upperValue: 10 },
      ],
    },
    locations: [
      { facility: 'University of Colorado', city: 'Aurora', state: 'CO', country: 'USA', zipCode: '80045', status: 'Recruiting' },
      { facility: 'Stanford Medical Center', city: 'Palo Alto', state: 'CA', country: 'USA', zipCode: '94304', status: 'Recruiting' },
    ],
    sponsor: 'Novo Nordisk',
    studyType: 'Interventional',
    interventions: ['Semaglutide 1mg weekly', 'Standard of Care'],
    primaryOutcome: 'Change in eGFR at 52 weeks',
    url: 'https://clinicaltrials.gov/study/NCT04000001',
    lastUpdated: new Date(),
  },
  {
    id: 'trial_2',
    nctId: 'NCT04000002',
    title: 'SGLT2 Inhibitor for Heart Failure with Preserved Ejection Fraction',
    briefSummary: 'Evaluating the efficacy of empagliflozin in patients with HFpEF.',
    phase: 'Phase 3',
    status: 'Recruiting',
    conditions: ['Heart Failure with Preserved Ejection Fraction'],
    conditionCodes: ['I50'],
    eligibilityCriteria: {
      gender: 'All',
      minAge: 40,
      maxAge: 85,
      healthyVolunteers: false,
      inclusionCriteria: [
        'LVEF ≥ 50%',
        'NYHA Class II-IV heart failure',
        'Elevated NT-proBNP',
        'Stable heart failure regimen for 4 weeks',
      ],
      exclusionCriteria: [
        'Type 1 diabetes',
        'eGFR < 20',
        'Recent MI or stroke (within 90 days)',
        'Current SGLT2 inhibitor use',
      ],
      requiredConditions: ['I50'],
      labRequirements: [
        { labName: 'LVEF', operator: '>=', value: 50 },
        { labName: 'eGFR', operator: '>=', value: 20 },
      ],
    },
    locations: [
      { facility: 'Mayo Clinic', city: 'Rochester', state: 'MN', country: 'USA', zipCode: '55905', status: 'Recruiting' },
      { facility: 'Cleveland Clinic', city: 'Cleveland', state: 'OH', country: 'USA', zipCode: '44195', status: 'Recruiting' },
    ],
    sponsor: 'Boehringer Ingelheim',
    studyType: 'Interventional',
    interventions: ['Empagliflozin 10mg daily', 'Placebo'],
    primaryOutcome: 'Composite of CV death and HF hospitalization',
    url: 'https://clinicaltrials.gov/study/NCT04000002',
    lastUpdated: new Date(),
  },
  {
    id: 'trial_3',
    nctId: 'NCT04000003',
    title: 'Novel Anti-Inflammatory Agent in Rheumatoid Arthritis',
    briefSummary: 'Phase 2 study of a novel JAK inhibitor in moderate to severe RA.',
    phase: 'Phase 2',
    status: 'Recruiting',
    conditions: ['Rheumatoid Arthritis'],
    conditionCodes: ['M05', 'M06'],
    eligibilityCriteria: {
      gender: 'All',
      minAge: 18,
      maxAge: 75,
      healthyVolunteers: false,
      inclusionCriteria: [
        'ACR/EULAR 2010 criteria for RA',
        'Active disease (DAS28 > 3.2)',
        'Inadequate response to MTX',
        'Stable MTX dose for 4 weeks',
      ],
      exclusionCriteria: [
        'Prior JAK inhibitor use',
        'Active infection',
        'History of VTE',
        'Malignancy within 5 years',
      ],
      requiredConditions: ['M05', 'M06'],
      requiredMedications: ['methotrexate'],
    },
    locations: [
      { facility: 'Johns Hopkins', city: 'Baltimore', state: 'MD', country: 'USA', zipCode: '21287', status: 'Recruiting' },
      { facility: 'UCSF Medical Center', city: 'San Francisco', state: 'CA', country: 'USA', zipCode: '94143', status: 'Recruiting' },
    ],
    sponsor: 'AbbVie',
    studyType: 'Interventional',
    interventions: ['Novel JAK Inhibitor', 'Placebo'],
    primaryOutcome: 'ACR50 response at 12 weeks',
    url: 'https://clinicaltrials.gov/study/NCT04000003',
    lastUpdated: new Date(),
  },
  {
    id: 'trial_4',
    nctId: 'NCT04000004',
    title: 'Immunotherapy Combination in Advanced Non-Small Cell Lung Cancer',
    briefSummary: 'Phase 3 study of pembrolizumab plus novel agent vs pembrolizumab alone.',
    phase: 'Phase 3',
    status: 'Recruiting',
    conditions: ['Non-Small Cell Lung Cancer', 'NSCLC'],
    conditionCodes: ['C34'],
    eligibilityCriteria: {
      gender: 'All',
      minAge: 18,
      maxAge: 999,
      healthyVolunteers: false,
      inclusionCriteria: [
        'Histologically confirmed NSCLC',
        'Stage IV disease',
        'PD-L1 TPS ≥ 50%',
        'No EGFR or ALK alterations',
        'ECOG PS 0-1',
      ],
      exclusionCriteria: [
        'Prior immunotherapy',
        'Active autoimmune disease',
        'Untreated brain metastases',
        'Systemic corticosteroids > 10mg prednisone equivalent',
      ],
      requiredConditions: ['C34'],
    },
    locations: [
      { facility: 'MD Anderson Cancer Center', city: 'Houston', state: 'TX', country: 'USA', zipCode: '77030', status: 'Recruiting' },
      { facility: 'Memorial Sloan Kettering', city: 'New York', state: 'NY', country: 'USA', zipCode: '10065', status: 'Recruiting' },
    ],
    sponsor: 'Merck',
    studyType: 'Interventional',
    interventions: ['Pembrolizumab + Novel Agent', 'Pembrolizumab alone'],
    primaryOutcome: 'Overall Survival',
    url: 'https://clinicaltrials.gov/study/NCT04000004',
    lastUpdated: new Date(),
  },
  {
    id: 'trial_5',
    nctId: 'NCT04000005',
    title: 'Digital Cognitive Behavioral Therapy for Depression',
    briefSummary: 'Evaluating a smartphone-based CBT intervention for major depressive disorder.',
    phase: 'N/A',
    status: 'Recruiting',
    conditions: ['Major Depressive Disorder', 'Depression'],
    conditionCodes: ['F32', 'F33'],
    eligibilityCriteria: {
      gender: 'All',
      minAge: 18,
      maxAge: 65,
      healthyVolunteers: false,
      inclusionCriteria: [
        'DSM-5 criteria for MDD',
        'PHQ-9 score ≥ 10',
        'Smartphone with internet access',
        'English speaking',
      ],
      exclusionCriteria: [
        'Active suicidal ideation',
        'Bipolar disorder',
        'Psychotic disorder',
        'Current substance use disorder',
      ],
      requiredConditions: ['F32', 'F33'],
    },
    locations: [
      { facility: 'Kaiser Permanente Colorado', city: 'Denver', state: 'CO', country: 'USA', zipCode: '80231', status: 'Recruiting' },
      { facility: 'UCLA Health', city: 'Los Angeles', state: 'CA', country: 'USA', zipCode: '90095', status: 'Recruiting' },
    ],
    sponsor: 'NIMH',
    studyType: 'Interventional',
    interventions: ['Digital CBT App', 'Waitlist Control'],
    primaryOutcome: 'Change in PHQ-9 at 8 weeks',
    url: 'https://clinicaltrials.gov/study/NCT04000005',
    lastUpdated: new Date(),
  },
];

// =============================================================================
// CLINICAL TRIAL MATCHER SERVICE
// =============================================================================

export class ClinicalTrialMatcher extends EventEmitter {
  private trials: ClinicalTrial[] = CLINICAL_TRIALS;

  constructor() {
    super();
  }

  // =========================================================================
  // MAIN MATCHING
  // =========================================================================

  async findMatchingTrials(context: PatientTrialContext): Promise<TrialMatch[]> {
    const matches: TrialMatch[] = [];

    for (const trial of this.trials.filter(t => t.status === 'Recruiting')) {
      const match = this.evaluateTrialMatch(trial, context);
      if (match.matchScore > 0.3) {
        matches.push(match);
      }
    }

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    this.emit('matchesFound', { patientId: context.patientId, matches });
    return matches;
  }

  private evaluateTrialMatch(trial: ClinicalTrial, context: PatientTrialContext): TrialMatch {
    const matchedCriteria: string[] = [];
    const unmatchedCriteria: string[] = [];
    const potentialExclusions: string[] = [];
    let score = 0;
    let maxScore = 0;

    const eligibility = trial.eligibilityCriteria;

    // Gender check
    maxScore += 1;
    if (eligibility.gender === 'All' || 
        eligibility.gender.toLowerCase() === context.gender.toLowerCase()) {
      score += 1;
      matchedCriteria.push('Gender eligible');
    } else {
      unmatchedCriteria.push(`Gender: requires ${eligibility.gender}`);
    }

    // Age check
    maxScore += 1;
    if ((!eligibility.minAge || context.age >= eligibility.minAge) &&
        (!eligibility.maxAge || context.age <= eligibility.maxAge)) {
      score += 1;
      matchedCriteria.push('Age eligible');
    } else {
      unmatchedCriteria.push(`Age: requires ${eligibility.minAge || 0}-${eligibility.maxAge || 'no max'}`);
    }

    // Condition match
    maxScore += 3;
    const conditionMatched = this.checkConditionMatch(trial, context);
    if (conditionMatched.matched) {
      score += 3;
      matchedCriteria.push(`Condition: ${conditionMatched.matchedCondition}`);
    } else {
      unmatchedCriteria.push('Condition not matched');
    }

    // Required conditions check
    if (eligibility.requiredConditions) {
      for (const reqCond of eligibility.requiredConditions) {
        maxScore += 1;
        const hasCondition = context.diagnoses.some(d => 
          d.code.startsWith(reqCond) && d.status === 'active'
        );
        if (hasCondition) {
          score += 1;
        }
      }
    }

    // Excluded conditions check
    if (eligibility.excludedConditions) {
      for (const exclCond of eligibility.excludedConditions) {
        const hasExcluded = context.diagnoses.some(d => 
          d.code.startsWith(exclCond) && d.status === 'active'
        );
        if (hasExcluded) {
          potentialExclusions.push(`Has excluded condition: ${exclCond}`);
        }
      }
    }

    // Required medications check
    if (eligibility.requiredMedications) {
      for (const reqMed of eligibility.requiredMedications) {
        maxScore += 1;
        const hasMed = context.medications.some(m => 
          m.name.toLowerCase().includes(reqMed.toLowerCase()) && m.status === 'active'
        );
        if (hasMed) {
          score += 1;
          matchedCriteria.push(`On required medication: ${reqMed}`);
        } else {
          unmatchedCriteria.push(`Not on required medication: ${reqMed}`);
        }
      }
    }

    // Excluded medications check
    if (eligibility.excludedMedications) {
      for (const exclMed of eligibility.excludedMedications) {
        const hasMed = context.medications.some(m => 
          m.name.toLowerCase().includes(exclMed.toLowerCase()) && m.status === 'active'
        );
        if (hasMed) {
          potentialExclusions.push(`On excluded medication: ${exclMed}`);
        }
      }
    }

    // Lab requirements check
    if (eligibility.labRequirements) {
      for (const labReq of eligibility.labRequirements) {
        maxScore += 1;
        const labMet = this.checkLabRequirement(labReq, context.labs);
        if (labMet.met) {
          score += 1;
          matchedCriteria.push(`${labReq.labName} in range`);
        } else if (labMet.value !== null) {
          unmatchedCriteria.push(`${labReq.labName}: ${labMet.value} (need ${labReq.operator} ${labReq.value})`);
        }
      }
    }

    // ECOG/Performance status
    if (context.ecogStatus !== undefined) {
      // Most trials require ECOG 0-2
      if (context.ecogStatus > 2) {
        potentialExclusions.push(`ECOG ${context.ecogStatus} may be too high for most trials`);
      } else {
        matchedCriteria.push(`ECOG ${context.ecogStatus} typically acceptable`);
      }
    }

    // Find nearest location
    const nearestLocation = this.findNearestLocation(trial.locations, context);

    // Calculate final score
    const matchScore = maxScore > 0 ? score / maxScore : 0;

    // Determine recommendation strength
    let recommendationStrength: TrialMatch['recommendationStrength'] = 'weak';
    if (matchScore >= 0.8 && potentialExclusions.length === 0) {
      recommendationStrength = 'strong';
    } else if (matchScore >= 0.6 && potentialExclusions.length <= 1) {
      recommendationStrength = 'moderate';
    }

    return {
      trial,
      matchScore,
      matchedCriteria,
      unmatchedCriteria,
      potentialExclusions,
      nearestLocation,
      recommendationStrength,
    };
  }

  private checkConditionMatch(
    trial: ClinicalTrial, 
    context: PatientTrialContext
  ): { matched: boolean; matchedCondition?: string } {
    // Check by ICD code
    if (trial.conditionCodes) {
      for (const code of trial.conditionCodes) {
        const match = context.diagnoses.find(d => 
          d.code.startsWith(code) && d.status === 'active'
        );
        if (match) {
          return { matched: true, matchedCondition: match.name };
        }
      }
    }

    // Check by condition name
    for (const condition of trial.conditions) {
      const match = context.diagnoses.find(d => 
        d.name.toLowerCase().includes(condition.toLowerCase()) && d.status === 'active'
      );
      if (match) {
        return { matched: true, matchedCondition: match.name };
      }
    }

    return { matched: false };
  }

  private checkLabRequirement(
    requirement: LabRequirement, 
    labs: PatientTrialContext['labs']
  ): { met: boolean; value: number | null } {
    const lab = labs.find(l => 
      l.name.toLowerCase().includes(requirement.labName.toLowerCase()) ||
      l.code === requirement.labCode
    );

    if (!lab) return { met: false, value: null };

    const value = typeof lab.value === 'number' ? lab.value : parseFloat(String(lab.value));

    switch (requirement.operator) {
      case '>': return { met: value > requirement.value, value };
      case '<': return { met: value < requirement.value, value };
      case '>=': return { met: value >= requirement.value, value };
      case '<=': return { met: value <= requirement.value, value };
      case '=': return { met: value === requirement.value, value };
      case 'between': 
        return { 
          met: value >= requirement.value && value <= (requirement.upperValue || Infinity), 
          value 
        };
      default: return { met: false, value };
    }
  }

  private findNearestLocation(
    locations: TrialLocation[], 
    context: PatientTrialContext
  ): TrialLocation | undefined {
    // Filter recruiting locations
    const recruiting = locations.filter(l => l.status === 'Recruiting');
    if (recruiting.length === 0) return undefined;

    // If patient has location, calculate distances
    if (context.state) {
      // Simple state matching for now (would use geo calculations in production)
      const sameState = recruiting.find(l => 
        l.state.toLowerCase() === context.state?.toLowerCase()
      );
      if (sameState) {
        return { ...sameState, distance: 50 };
      }
    }

    // Return first recruiting location
    return recruiting[0];
  }

  // =========================================================================
  // SEARCH TRIALS
  // =========================================================================

  async searchTrials(query: {
    condition?: string;
    phase?: string[];
    status?: string[];
    location?: { state?: string; maxDistance?: number };
  }): Promise<ClinicalTrial[]> {
    let results = [...this.trials];

    if (query.condition) {
      const conditionLower = query.condition.toLowerCase();
      results = results.filter(t => 
        t.conditions.some(c => c.toLowerCase().includes(conditionLower)) ||
        t.title.toLowerCase().includes(conditionLower)
      );
    }

    if (query.phase && query.phase.length > 0) {
      results = results.filter(t => query.phase!.includes(t.phase));
    }

    if (query.status && query.status.length > 0) {
      results = results.filter(t => query.status!.includes(t.status));
    }

    if (query.location?.state) {
      results = results.filter(t => 
        t.locations.some(l => 
          l.state.toLowerCase() === query.location!.state!.toLowerCase()
        )
      );
    }

    return results;
  }

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================

  async generatePatientNotification(match: TrialMatch, patientName: string): Promise<string> {
    return `
Dear ${patientName},

Based on your medical history, you may be eligible for a clinical research study:

**${match.trial.title}**

This ${match.trial.phase} study is evaluating ${match.trial.interventions?.join(' vs ') || 'new treatments'} for ${match.trial.conditions.join(', ')}.

**Why you may qualify:**
${match.matchedCriteria.map(c => `• ${c}`).join('\n')}

**Study Location:**
${match.nearestLocation ? `${match.nearestLocation.facility} - ${match.nearestLocation.city}, ${match.nearestLocation.state}` : 'Multiple locations available'}

Clinical trials are an important way to advance medical knowledge and may provide access to new treatments before they are widely available. Participation is completely voluntary.

Would you like to learn more about this opportunity? Please discuss with your healthcare provider or contact our research coordinator.

Learn more: ${match.trial.url}

Best regards,
Your Care Team
    `.trim();
  }

  async generateProviderSummary(matches: TrialMatch[], patientId: string): Promise<string> {
    if (matches.length === 0) {
      return 'No matching clinical trials found for this patient.';
    }

    const strongMatches = matches.filter(m => m.recommendationStrength === 'strong');
    const moderateMatches = matches.filter(m => m.recommendationStrength === 'moderate');

    let summary = `**Clinical Trial Matching Summary**\n\n`;
    summary += `Found ${matches.length} potential trial match${matches.length > 1 ? 'es' : ''} `;
    summary += `(${strongMatches.length} strong, ${moderateMatches.length} moderate)\n\n`;

    for (const match of matches.slice(0, 5)) {
      summary += `---\n`;
      summary += `**${match.trial.title}** (${match.trial.nctId})\n`;
      summary += `Phase: ${match.trial.phase} | Status: ${match.trial.status}\n`;
      summary += `Match Score: ${Math.round(match.matchScore * 100)}% | Recommendation: ${match.recommendationStrength}\n`;
      summary += `Matched: ${match.matchedCriteria.slice(0, 3).join(', ')}\n`;
      if (match.potentialExclusions.length > 0) {
        summary += `⚠️ Potential exclusions: ${match.potentialExclusions.join(', ')}\n`;
      }
      summary += `\n`;
    }

    return summary;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const clinicalTrialMatcher = new ClinicalTrialMatcher();
