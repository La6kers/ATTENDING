// =============================================================================
// ATTENDING AI - Medications AI Agent Service
// apps/provider-portal/lib/services/medicationsAIAgent.ts
//
// AI agent for reviewing medication lists, identifying interactions,
// optimization opportunities, and drafting refill/change recommendations.
// =============================================================================

export type MedicationStatus = 'active' | 'pending-refill' | 'expiring' | 'discontinued' | 'new';
export type InteractionSeverity = 'minor' | 'moderate' | 'major' | 'contraindicated';

export interface PatientMedication {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  mrn: string;
  medication: string;
  genericName: string;
  dose: string;
  frequency: string;
  route: string;
  prescriber: string;
  startDate: string;
  lastRefill?: string;
  refillsRemaining: number;
  status: MedicationStatus;
  indication: string;
  adherenceScore?: number;
  sideEffectsReported?: string[];
  costPerMonth?: number;
  priorAuth?: boolean;
}

export interface MedicationReviewItem {
  patientName: string;
  patientAge: number;
  patientGender: string;
  mrn: string;
  medications: PatientMedication[];
  reviewed: boolean;
  hasIssues: boolean;
  issueCount: number;
}

export interface MedAIAnalysis {
  summary: string;
  interactions: DrugInteraction[];
  optimizations: MedOptimization[];
  adherenceInsights: string;
  costSavings?: CostSaving[];
  patientMessage: string;
  pendedActions: PendedMedAction[];
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: InteractionSeverity;
  description: string;
  recommendation: string;
  mechanism?: string;
}

export interface MedOptimization {
  type: 'dose-adjust' | 'deprescribe' | 'substitute' | 'add' | 'monitor';
  medication: string;
  recommendation: string;
  rationale: string;
  evidence: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CostSaving {
  currentMed: string;
  alternative: string;
  monthlySavings: number;
  notes: string;
}

export interface PendedMedAction {
  type: 'refill' | 'dose-change' | 'new-rx' | 'discontinue' | 'lab-order' | 'prior-auth';
  label: string;
  details: string;
  medication?: string;
  selected?: boolean;
}

// Mock patient medication reviews
export const MOCK_MED_REVIEWS: MedicationReviewItem[] = [
  {
    patientName: 'Michael Brown',
    patientAge: 67,
    patientGender: 'Male',
    mrn: 'MRN-5501',
    reviewed: false,
    hasIssues: true,
    issueCount: 3,
    medications: [
      { id: 'med-r-001', patientName: 'Michael Brown', patientAge: 67, patientGender: 'Male', mrn: 'MRN-5501', medication: 'Metoprolol Succinate', genericName: 'Metoprolol', dose: '100mg', frequency: 'Once daily', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2024-06-15', lastRefill: '2026-02-10', refillsRemaining: 2, status: 'active', indication: 'Hypertension, Rate control for AFib', adherenceScore: 92, costPerMonth: 15 },
      { id: 'med-r-002', patientName: 'Michael Brown', patientAge: 67, patientGender: 'Male', mrn: 'MRN-5501', medication: 'Verapamil SR', genericName: 'Verapamil', dose: '240mg', frequency: 'Once daily', route: 'Oral', prescriber: 'Dr. Sarah Kim (Cardiology)', startDate: '2026-01-20', refillsRemaining: 5, status: 'new', indication: 'Rate control for AFib', costPerMonth: 22, priorAuth: false },
      { id: 'med-r-003', patientName: 'Michael Brown', patientAge: 67, patientGender: 'Male', mrn: 'MRN-5501', medication: 'Warfarin', genericName: 'Warfarin', dose: '5mg', frequency: 'Once daily', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2023-03-10', lastRefill: '2026-02-28', refillsRemaining: 0, status: 'pending-refill', indication: 'AFib - stroke prevention', adherenceScore: 88, costPerMonth: 8 },
      { id: 'med-r-004', patientName: 'Michael Brown', patientAge: 67, patientGender: 'Male', mrn: 'MRN-5501', medication: 'Lisinopril', genericName: 'Lisinopril', dose: '20mg', frequency: 'Once daily', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2022-01-05', lastRefill: '2026-01-15', refillsRemaining: 3, status: 'active', indication: 'Hypertension', adherenceScore: 95, costPerMonth: 5 },
      { id: 'med-r-005', patientName: 'Michael Brown', patientAge: 67, patientGender: 'Male', mrn: 'MRN-5501', medication: 'Atorvastatin', genericName: 'Atorvastatin', dose: '40mg', frequency: 'Once daily at bedtime', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2022-01-05', lastRefill: '2026-02-01', refillsRemaining: 4, status: 'active', indication: 'Hyperlipidemia, CV risk reduction', adherenceScore: 90, costPerMonth: 6 },
      { id: 'med-r-006', patientName: 'Michael Brown', patientAge: 67, patientGender: 'Male', mrn: 'MRN-5501', medication: 'Omeprazole', genericName: 'Omeprazole', dose: '20mg', frequency: 'Once daily before breakfast', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2024-03-20', lastRefill: '2026-01-20', refillsRemaining: 1, status: 'active', indication: 'GERD', adherenceScore: 85, costPerMonth: 8, sideEffectsReported: ['Occasional headache'] },
      { id: 'med-r-007', patientName: 'Michael Brown', patientAge: 67, patientGender: 'Male', mrn: 'MRN-5501', medication: 'Amlodipine', genericName: 'Amlodipine', dose: '5mg', frequency: 'Once daily', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2023-09-01', lastRefill: '2026-02-15', refillsRemaining: 3, status: 'active', indication: 'Hypertension', adherenceScore: 93, costPerMonth: 5 },
      { id: 'med-r-008', patientName: 'Michael Brown', patientAge: 67, patientGender: 'Male', mrn: 'MRN-5501', medication: 'Metformin', genericName: 'Metformin', dose: '1000mg', frequency: 'Twice daily', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2021-06-01', lastRefill: '2026-02-20', refillsRemaining: 2, status: 'active', indication: 'Type 2 Diabetes', adherenceScore: 87, costPerMonth: 4 },
    ],
  },
  {
    patientName: 'Nancy White',
    patientAge: 71,
    patientGender: 'Female',
    mrn: 'MRN-5502',
    reviewed: false,
    hasIssues: true,
    issueCount: 2,
    medications: [
      { id: 'med-r-010', patientName: 'Nancy White', patientAge: 71, patientGender: 'Female', mrn: 'MRN-5502', medication: 'Tiotropium (Spiriva)', genericName: 'Tiotropium', dose: '18mcg', frequency: 'Once daily', route: 'Inhalation', prescriber: 'Dr. Thomas Reed', startDate: '2024-01-10', lastRefill: '2026-02-05', refillsRemaining: 1, status: 'active', indication: 'COPD maintenance', adherenceScore: 78, costPerMonth: 45, priorAuth: true },
      { id: 'med-r-011', patientName: 'Nancy White', patientAge: 71, patientGender: 'Female', mrn: 'MRN-5502', medication: 'Albuterol HFA', genericName: 'Albuterol', dose: '90mcg/actuation', frequency: 'Every 4-6 hours as needed', route: 'Inhalation', prescriber: 'Dr. Thomas Reed', startDate: '2024-01-10', lastRefill: '2026-01-28', refillsRemaining: 3, status: 'active', indication: 'COPD rescue', adherenceScore: 82, costPerMonth: 25 },
      { id: 'med-r-012', patientName: 'Nancy White', patientAge: 71, patientGender: 'Female', mrn: 'MRN-5502', medication: 'Fluticasone/Salmeterol (Advair)', genericName: 'Fluticasone/Salmeterol', dose: '250/50mcg', frequency: 'Twice daily', route: 'Inhalation', prescriber: 'Dr. Thomas Reed', startDate: '2025-06-15', lastRefill: '2026-02-10', refillsRemaining: 2, status: 'active', indication: 'COPD maintenance', adherenceScore: 72, costPerMonth: 65, sideEffectsReported: ['Oral thrush', 'Hoarse voice'] },
      { id: 'med-r-013', patientName: 'Nancy White', patientAge: 71, patientGender: 'Female', mrn: 'MRN-5502', medication: 'Prednisone', genericName: 'Prednisone', dose: '40mg', frequency: 'Once daily x 5 days', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2026-03-01', refillsRemaining: 0, status: 'new', indication: 'COPD exacerbation', costPerMonth: 3 },
      { id: 'med-r-014', patientName: 'Nancy White', patientAge: 71, patientGender: 'Female', mrn: 'MRN-5502', medication: 'Lisinopril', genericName: 'Lisinopril', dose: '10mg', frequency: 'Once daily', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2023-05-01', lastRefill: '2026-02-15', refillsRemaining: 4, status: 'active', indication: 'Hypertension', adherenceScore: 91, costPerMonth: 5 },
    ],
  },
  {
    patientName: 'Jennifer Wilson',
    patientAge: 29,
    patientGender: 'Female',
    mrn: 'MRN-5503',
    reviewed: false,
    hasIssues: true,
    issueCount: 1,
    medications: [
      { id: 'med-r-020', patientName: 'Jennifer Wilson', patientAge: 29, patientGender: 'Female', mrn: 'MRN-5503', medication: 'Sertraline', genericName: 'Sertraline', dose: '100mg', frequency: 'Once daily', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2025-12-15', lastRefill: '2026-02-12', refillsRemaining: 4, status: 'active', indication: 'Generalized Anxiety Disorder', adherenceScore: 88, costPerMonth: 8 },
      { id: 'med-r-021', patientName: 'Jennifer Wilson', patientAge: 29, patientGender: 'Female', mrn: 'MRN-5503', medication: 'Hydroxyzine', genericName: 'Hydroxyzine', dose: '25mg', frequency: 'As needed for acute anxiety', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2025-12-15', lastRefill: '2026-01-20', refillsRemaining: 2, status: 'active', indication: 'Acute anxiety/panic', adherenceScore: 65, costPerMonth: 6 },
      { id: 'med-r-022', patientName: 'Jennifer Wilson', patientAge: 29, patientGender: 'Female', mrn: 'MRN-5503', medication: 'Oral Contraceptive (Lo Loestrin Fe)', genericName: 'Norethindrone/Ethinyl Estradiol', dose: '1mg/10mcg', frequency: 'Once daily', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2024-03-01', lastRefill: '2026-02-01', refillsRemaining: 5, status: 'active', indication: 'Contraception', adherenceScore: 94, costPerMonth: 30 },
    ],
  },
  {
    patientName: 'James Anderson',
    patientAge: 58,
    patientGender: 'Male',
    mrn: 'MRN-5504',
    reviewed: true,
    hasIssues: false,
    issueCount: 0,
    medications: [
      { id: 'med-r-030', patientName: 'James Anderson', patientAge: 58, patientGender: 'Male', mrn: 'MRN-5504', medication: 'Metformin', genericName: 'Metformin', dose: '1000mg', frequency: 'Twice daily', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2020-03-15', lastRefill: '2026-02-18', refillsRemaining: 3, status: 'active', indication: 'Type 2 Diabetes', adherenceScore: 94, costPerMonth: 4 },
      { id: 'med-r-031', patientName: 'James Anderson', patientAge: 58, patientGender: 'Male', mrn: 'MRN-5504', medication: 'Glipizide', genericName: 'Glipizide', dose: '5mg', frequency: 'Twice daily before meals', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2023-08-01', lastRefill: '2026-02-18', refillsRemaining: 3, status: 'active', indication: 'Type 2 Diabetes', adherenceScore: 91, costPerMonth: 5 },
      { id: 'med-r-032', patientName: 'James Anderson', patientAge: 58, patientGender: 'Male', mrn: 'MRN-5504', medication: 'Lisinopril', genericName: 'Lisinopril', dose: '20mg', frequency: 'Once daily', route: 'Oral', prescriber: 'Dr. Thomas Reed', startDate: '2021-01-10', lastRefill: '2026-02-18', refillsRemaining: 5, status: 'active', indication: 'Hypertension, Diabetic nephropathy prevention', adherenceScore: 96, costPerMonth: 5 },
    ],
  },
];

export function generateMedAIAnalysis(review: MedicationReviewItem): MedAIAnalysis {
  const analyses: Record<string, MedAIAnalysis> = {
    'MRN-5501': {
      summary: `${review.patientName} is on 8 medications with 3 issues identified: a major drug interaction (metoprolol + verapamil), a pending refill for warfarin, and long-term PPI use requiring reassessment. Polypharmacy review recommended.`,
      interactions: [
        {
          drug1: 'Metoprolol',
          drug2: 'Verapamil',
          severity: 'major',
          description: 'Concurrent use of beta-blockers and non-dihydropyridine calcium channel blockers significantly increases risk of bradycardia, heart block, and hypotension.',
          recommendation: 'Contact cardiology (Dr. Kim) to discuss verapamil initiation. Consider discontinuing one agent or close monitoring with ECG.',
          mechanism: 'Both agents suppress AV nodal conduction and reduce heart rate through complementary mechanisms.',
        },
        {
          drug1: 'Warfarin',
          drug2: 'Omeprazole',
          severity: 'moderate',
          description: 'Omeprazole may increase warfarin levels by inhibiting CYP2C19 metabolism.',
          recommendation: 'Monitor INR more frequently. Consider switching to pantoprazole which has less interaction potential.',
        },
      ],
      optimizations: [
        {
          type: 'deprescribe',
          medication: 'Omeprazole',
          recommendation: 'Evaluate need for continued PPI therapy after 2 years of use',
          rationale: 'Long-term PPI use (>1 year) is associated with increased risk of C. diff, bone fractures, hypomagnesemia, and kidney disease',
          evidence: 'AGA 2024 guidelines recommend PPI deprescribing trial for patients without high-risk indications',
          priority: 'medium',
        },
        {
          type: 'substitute',
          medication: 'Warfarin',
          recommendation: 'Consider switching to a DOAC (e.g., apixaban) for AFib anticoagulation',
          rationale: 'DOACs have more predictable pharmacokinetics, fewer drug interactions, no INR monitoring needed, and lower bleeding risk',
          evidence: 'ARISTOTLE trial showed apixaban superior to warfarin for stroke prevention in AFib with less bleeding',
          priority: 'medium',
        },
      ],
      adherenceInsights: 'Overall adherence is good (avg 90%). Omeprazole has lowest adherence (85%) - may indicate patient is self-deprescribing. Warfarin adherence at 88% is concerning given narrow therapeutic index.',
      costSavings: [
        { currentMed: 'Verapamil SR ($22/mo)', alternative: 'Diltiazem ER ($12/mo)', monthlySavings: 10, notes: 'If verapamil is continued, diltiazem is a lower-cost alternative in the same class' },
      ],
      patientMessage: 'Dear Mr. Brown,\n\nWe have reviewed all of your medications and have a few items to discuss:\n\n1. Your warfarin prescription needs a refill - please call our office or your pharmacy\n2. We noticed you are on two heart rate medications that may need to be adjusted\n3. We would like to discuss whether you still need the stomach acid medication (omeprazole)\n\nPlease call our office to schedule a medication review appointment. Continue taking all medications as prescribed until we meet.\n\nBring all your medication bottles to your next visit so we can do a thorough review.',
      pendedActions: [
        { type: 'refill', label: 'Refill Warfarin 5mg', details: '90-day supply, 0 refills remaining', medication: 'Warfarin' },
        { type: 'lab-order', label: 'Order INR Check', details: 'Monitor warfarin with omeprazole interaction', medication: 'Warfarin' },
        { type: 'dose-change', label: 'Review Metoprolol/Verapamil', details: 'Contact cardiology re: dual rate control agents', medication: 'Metoprolol/Verapamil' },
        { type: 'discontinue', label: 'Consider PPI Deprescribing Trial', details: 'Step down omeprazole after 2+ years of use', medication: 'Omeprazole' },
      ],
    },
    'MRN-5502': {
      summary: `${review.patientName} has COPD on appropriate triple therapy but reports oral thrush and hoarse voice from Advair. Recent prednisone burst for exacerbation. Inhaler technique and adherence need attention.`,
      interactions: [
        {
          drug1: 'Prednisone',
          drug2: 'Fluticasone (Advair)',
          severity: 'moderate',
          description: 'Systemic corticosteroid added to inhaled corticosteroid increases total steroid burden and risk of adrenal suppression.',
          recommendation: 'Short course acceptable for exacerbation. Ensure prednisone is tapered appropriately. Monitor for steroid side effects.',
        },
      ],
      optimizations: [
        {
          type: 'monitor',
          medication: 'Fluticasone/Salmeterol (Advair)',
          recommendation: 'Address oral thrush side effect - ensure mouth rinsing after use, consider spacer device',
          rationale: 'Oral thrush indicates inadequate mouth care after inhaler use or possible need for dose reduction',
          evidence: 'GOLD 2026 guidelines recommend mouth rinsing and consider step-down if stable',
          priority: 'high',
        },
        {
          type: 'monitor',
          medication: 'Tiotropium (Spiriva)',
          recommendation: 'Assess inhaler technique - adherence score of 78% suggests possible technique issues',
          rationale: 'Low adherence with inhalers often indicates difficulty with device rather than intentional non-adherence',
          evidence: 'Studies show up to 70% of patients use inhalers incorrectly',
          priority: 'high',
        },
      ],
      adherenceInsights: 'Inhaler adherence is suboptimal (72-82%). This is common with inhaler devices and often relates to technique rather than motivation. Consider referral to respiratory therapy for device training.',
      patientMessage: 'Dear Ms. White,\n\nWe are reviewing your breathing medications and wanted to check in. We see that you have been having some side effects from your Advair inhaler (oral thrush and hoarse voice).\n\nHere are some tips to help:\n- Always rinse your mouth with water and spit after using your Advair\n- Using a spacer device can also help reduce these side effects\n\nWe would also like to review how you use your inhalers at your next visit to make sure you are getting the most benefit from them.\n\nYour recent steroid course for the flare-up should help. Please call us if your breathing does not improve.',
      pendedActions: [
        { type: 'new-rx', label: 'Nystatin Oral Suspension', details: 'For oral thrush from ICS use, swish and spit QID x 7 days', medication: 'Nystatin' },
        { type: 'refill', label: 'Refill Tiotropium', details: 'Only 1 refill remaining, adherence review needed', medication: 'Tiotropium' },
        { type: 'lab-order', label: 'Order Glucose/HbA1c', details: 'Monitor for steroid-induced hyperglycemia after prednisone burst', medication: 'Prednisone' },
      ],
    },
    'MRN-5503': {
      summary: `${review.patientName} is on sertraline 100mg for GAD with moderate response after 8 weeks. GAD-7 still elevated at 12. Low hydroxyzine use may indicate either good anxiety control or inadequate rescue dosing.`,
      interactions: [],
      optimizations: [
        {
          type: 'dose-adjust',
          medication: 'Sertraline',
          recommendation: 'Consider increasing to 150mg given GAD-7 still 12 after 8 weeks at 100mg',
          rationale: 'Partial response at 8 weeks suggests benefit but inadequate dose. Therapeutic range is 50-200mg.',
          evidence: 'APA guidelines recommend dose optimization at 4-8 weeks if partial response before switching agents',
          priority: 'medium',
        },
      ],
      adherenceInsights: 'Sertraline adherence is good (88%). Hydroxyzine adherence is low (65%) which may indicate good baseline anxiety control or patient avoiding it due to sedation.',
      patientMessage: 'Dear Ms. Wilson,\n\nWe have been reviewing how your anxiety medication is working. Your recent anxiety score shows some improvement but there is still room to feel better.\n\nWe may recommend adjusting your sertraline dose at your next appointment. This is a normal part of finding the right dose for you.\n\nIn the meantime, continue taking your sertraline every day at the same time. The hydroxyzine is available for days when your anxiety feels more intense.\n\nPlease track your anxiety symptoms before your next visit so we can make the best decision together.',
      pendedActions: [
        { type: 'dose-change', label: 'Increase Sertraline to 150mg', details: 'Partial response after 8 weeks at 100mg, GAD-7 still 12', medication: 'Sertraline' },
      ],
    },
    'MRN-5504': {
      summary: `${review.patientName}'s diabetes regimen is well-optimized. A1c improved to 7.2%. All medications are well-tolerated with excellent adherence. No changes recommended at this time.`,
      interactions: [],
      optimizations: [],
      adherenceInsights: 'Excellent adherence across all medications (91-96%). Patient is highly compliant with diabetes and hypertension management.',
      patientMessage: 'Dear Mr. Anderson,\n\nGreat news! Your medication review shows everything is working well. Your diabetes is well-controlled and your blood pressure is on target.\n\nPlease continue taking all medications as prescribed. We will check your A1c again in 3 months.\n\nKeep up the great work with your health!',
      pendedActions: [],
    },
  };

  return analyses[review.mrn] || {
    summary: `Medication review for ${review.patientName}. ${review.medications.length} active medications.`,
    interactions: [],
    optimizations: [],
    adherenceInsights: 'Adherence data not yet available.',
    patientMessage: `Dear ${review.patientName.split(' ')[0]},\n\nWe have reviewed your medications. Everything looks in order. Please continue as prescribed and call with any questions.`,
    pendedActions: [],
  };
}
