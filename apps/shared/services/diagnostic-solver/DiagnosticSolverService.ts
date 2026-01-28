// =============================================================================
// ATTENDING AI - Diagnostic Odyssey Solver
// apps/shared/services/diagnostic-solver/DiagnosticSolverService.ts
//
// AI-powered diagnostic assistance for complex/undiagnosed cases including:
// - Pattern recognition across patient history
// - Rare disease consideration
// - Differential diagnosis generation
// - Diagnostic workup recommendations
// - Literature connections
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface PatientCase {
  id: string;
  patientId: string;
  demographics: {
    age: number;
    sex: 'male' | 'female' | 'other';
    ethnicity?: string;
    birthCountry?: string;
  };
  chiefComplaint: string;
  symptoms: Symptom[];
  physicalExamFindings: PhysicalExamFinding[];
  medicalHistory: string[];
  familyHistory: string[];
  socialHistory: {
    occupation?: string;
    travel?: TravelHistory[];
    exposures?: string[];
    habits?: string[];
  };
  labs: LabResult[];
  imaging: ImagingResult[];
  previousDiagnoses: string[];
  previousTreatments: Treatment[];
  timeline: ClinicalEvent[];
  currentMedications: string[];
  allergies: string[];
}

export interface Symptom {
  name: string;
  onset: string;
  duration?: string;
  severity: 'mild' | 'moderate' | 'severe';
  frequency?: 'constant' | 'intermittent' | 'episodic';
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  associatedSymptoms?: string[];
  bodyLocation?: string;
  quality?: string;
  progression?: 'improving' | 'stable' | 'worsening';
}

export interface PhysicalExamFinding {
  system: string;
  finding: string;
  significance: 'normal' | 'abnormal' | 'critical';
  details?: string;
}

export interface LabResult {
  name: string;
  value: number | string;
  unit?: string;
  normalRange?: string;
  interpretation: 'normal' | 'low' | 'high' | 'critical' | 'abnormal';
  date: string;
}

export interface ImagingResult {
  type: string;
  bodyPart: string;
  date: string;
  findings: string[];
  impression: string;
}

export interface Treatment {
  name: string;
  type: 'medication' | 'procedure' | 'therapy' | 'surgery';
  dateStarted?: string;
  dateStopped?: string;
  response: 'effective' | 'partial' | 'ineffective' | 'adverse' | 'unknown';
  details?: string;
}

export interface TravelHistory {
  location: string;
  dates: string;
  activities?: string[];
}

export interface ClinicalEvent {
  date: string;
  event: string;
  significance: 'routine' | 'notable' | 'significant' | 'critical';
  details?: string;
}

export interface DifferentialDiagnosis {
  diagnosis: string;
  icd10Code?: string;
  likelihood: 'very-likely' | 'likely' | 'possible' | 'unlikely' | 'rare-but-consider';
  confidence: number; // 0-100
  category: 'common' | 'uncommon' | 'rare' | 'very-rare';
  supportingEvidence: string[];
  againstEvidence: string[];
  testToConfirm: string[];
  testToExclude: string[];
  urgency: 'emergent' | 'urgent' | 'routine';
  specialty?: string;
  orphaCode?: string; // For rare diseases
  omimId?: string; // For genetic diseases
}

export interface DiagnosticWorkup {
  phase: 'immediate' | 'initial' | 'secondary' | 'specialized';
  tests: RecommendedTest[];
  consultations: RecommendedConsult[];
  rationale: string;
}

export interface RecommendedTest {
  name: string;
  category: 'lab' | 'imaging' | 'procedure' | 'genetic' | 'biopsy';
  priority: 'stat' | 'urgent' | 'routine';
  rationale: string;
  expectedFindings?: string;
  orderCode?: string;
  estimatedCost?: string;
  turnaroundTime?: string;
}

export interface RecommendedConsult {
  specialty: string;
  urgency: 'emergent' | 'urgent' | 'routine';
  reason: string;
  specificQuestions?: string[];
}

export interface LiteratureReference {
  title: string;
  authors: string;
  journal?: string;
  year?: number;
  pmid?: string;
  doi?: string;
  relevance: string;
  keyFindings?: string[];
}

export interface DiagnosticAnalysis {
  caseId: string;
  analysisDate: Date;
  clinicalSummary: string;
  keyFeatures: string[];
  diagnosticChallenges: string[];
  differentialDiagnoses: DifferentialDiagnosis[];
  workupRecommendations: DiagnosticWorkup[];
  clinicalPearls: string[];
  redFlags: string[];
  literatureReferences: LiteratureReference[];
  confidenceLevel: number;
  nextSteps: string[];
  estimatedTimeTodiagnosis?: string;
}

// =============================================================================
// Disease Database (Simplified - would connect to OMIM, Orphanet, etc.)
// =============================================================================

interface DiseasePattern {
  name: string;
  icd10: string;
  category: DifferentialDiagnosis['category'];
  requiredFeatures: string[];
  supportiveFeatures: string[];
  excludingFeatures: string[];
  keyLabs: string[];
  keyImaging: string[];
  ageRange?: { min?: number; max?: number };
  sexPredilection?: 'male' | 'female' | 'none';
  specialty: string;
  urgency: DifferentialDiagnosis['urgency'];
  testToConfirm: string[];
  orphaCode?: string;
}

const DISEASE_PATTERNS: DiseasePattern[] = [
  // Autoimmune conditions
  {
    name: 'Systemic Lupus Erythematosus',
    icd10: 'M32.9',
    category: 'uncommon',
    requiredFeatures: ['ANA positive'],
    supportiveFeatures: ['malar rash', 'photosensitivity', 'arthritis', 'serositis', 'renal disorder', 'neurologic disorder', 'hematologic disorder', 'fatigue', 'fever', 'anti-dsDNA positive'],
    excludingFeatures: ['ANA negative'],
    keyLabs: ['ANA', 'anti-dsDNA', 'complement levels', 'CBC', 'urinalysis'],
    keyImaging: [],
    ageRange: { min: 15, max: 45 },
    sexPredilection: 'female',
    specialty: 'Rheumatology',
    urgency: 'urgent',
    testToConfirm: ['ANA panel', 'anti-dsDNA', 'complement C3/C4'],
  },
  {
    name: 'Rheumatoid Arthritis',
    icd10: 'M06.9',
    category: 'common',
    requiredFeatures: ['joint pain', 'joint swelling'],
    supportiveFeatures: ['morning stiffness', 'symmetric arthritis', 'RF positive', 'anti-CCP positive', 'fatigue'],
    excludingFeatures: ['DIP involvement only'],
    keyLabs: ['RF', 'anti-CCP', 'ESR', 'CRP'],
    keyImaging: ['X-ray hands/feet', 'ultrasound joints'],
    specialty: 'Rheumatology',
    urgency: 'routine',
    testToConfirm: ['RF', 'anti-CCP', 'joint imaging'],
  },
  {
    name: 'Sjogren Syndrome',
    icd10: 'M35.0',
    category: 'uncommon',
    requiredFeatures: ['dry eyes', 'dry mouth'],
    supportiveFeatures: ['fatigue', 'arthralgia', 'parotid enlargement', 'SSA/SSB positive'],
    excludingFeatures: [],
    keyLabs: ['SSA/Ro', 'SSB/La', 'ANA', 'RF'],
    keyImaging: ['salivary gland ultrasound'],
    sexPredilection: 'female',
    specialty: 'Rheumatology',
    urgency: 'routine',
    testToConfirm: ['SSA/SSB antibodies', 'lip biopsy', 'Schirmer test'],
  },

  // Endocrine conditions
  {
    name: 'Hypothyroidism',
    icd10: 'E03.9',
    category: 'common',
    requiredFeatures: ['elevated TSH'],
    supportiveFeatures: ['fatigue', 'weight gain', 'cold intolerance', 'constipation', 'dry skin', 'hair loss', 'bradycardia'],
    excludingFeatures: ['suppressed TSH'],
    keyLabs: ['TSH', 'free T4', 'TPO antibodies'],
    keyImaging: [],
    specialty: 'Endocrinology',
    urgency: 'routine',
    testToConfirm: ['TSH', 'free T4'],
  },
  {
    name: 'Addison Disease',
    icd10: 'E27.1',
    category: 'rare',
    requiredFeatures: ['adrenal insufficiency'],
    supportiveFeatures: ['fatigue', 'weight loss', 'hyperpigmentation', 'hypotension', 'salt craving', 'nausea', 'abdominal pain'],
    excludingFeatures: [],
    keyLabs: ['morning cortisol', 'ACTH', 'ACTH stimulation test', 'electrolytes'],
    keyImaging: ['CT adrenals'],
    specialty: 'Endocrinology',
    urgency: 'urgent',
    testToConfirm: ['ACTH stimulation test', 'morning cortisol', 'ACTH level'],
  },
  {
    name: 'Pheochromocytoma',
    icd10: 'D35.0',
    category: 'rare',
    requiredFeatures: ['episodic hypertension'],
    supportiveFeatures: ['headache', 'sweating', 'palpitations', 'anxiety', 'pallor', 'tremor'],
    excludingFeatures: [],
    keyLabs: ['plasma free metanephrines', '24-hour urine catecholamines'],
    keyImaging: ['CT/MRI adrenals', 'MIBG scan'],
    specialty: 'Endocrinology',
    urgency: 'urgent',
    testToConfirm: ['plasma metanephrines', 'adrenal imaging'],
  },

  // Infectious diseases
  {
    name: 'Lyme Disease',
    icd10: 'A69.2',
    category: 'uncommon',
    requiredFeatures: ['tick exposure'],
    supportiveFeatures: ['erythema migrans', 'arthritis', 'facial palsy', 'heart block', 'fever', 'fatigue', 'headache'],
    excludingFeatures: [],
    keyLabs: ['Lyme serology', 'Western blot'],
    keyImaging: [],
    specialty: 'Infectious Disease',
    urgency: 'urgent',
    testToConfirm: ['Lyme IgM/IgG', 'Western blot if positive'],
  },
  {
    name: 'Tuberculosis',
    icd10: 'A15.9',
    category: 'uncommon',
    requiredFeatures: [],
    supportiveFeatures: ['chronic cough', 'night sweats', 'weight loss', 'hemoptysis', 'fever', 'TB exposure'],
    excludingFeatures: [],
    keyLabs: ['QuantiFERON-TB', 'AFB smear/culture'],
    keyImaging: ['chest X-ray', 'CT chest'],
    specialty: 'Infectious Disease',
    urgency: 'urgent',
    testToConfirm: ['sputum AFB culture', 'QuantiFERON-TB Gold'],
  },

  // Neurological conditions
  {
    name: 'Multiple Sclerosis',
    icd10: 'G35',
    category: 'uncommon',
    requiredFeatures: ['CNS demyelination'],
    supportiveFeatures: ['optic neuritis', 'sensory symptoms', 'motor weakness', 'ataxia', 'Lhermitte sign', 'fatigue', 'bladder dysfunction'],
    excludingFeatures: [],
    keyLabs: ['CSF analysis', 'oligoclonal bands'],
    keyImaging: ['MRI brain with contrast', 'MRI spine'],
    ageRange: { min: 20, max: 50 },
    sexPredilection: 'female',
    specialty: 'Neurology',
    urgency: 'urgent',
    testToConfirm: ['MRI brain/spine', 'CSF oligoclonal bands'],
  },
  {
    name: 'Myasthenia Gravis',
    icd10: 'G70.0',
    category: 'rare',
    requiredFeatures: ['fluctuating weakness'],
    supportiveFeatures: ['ptosis', 'diplopia', 'dysphagia', 'dysarthria', 'fatigue worse with exertion', 'respiratory weakness'],
    excludingFeatures: ['sensory symptoms'],
    keyLabs: ['AChR antibodies', 'anti-MuSK antibodies'],
    keyImaging: ['CT chest (thymoma)'],
    specialty: 'Neurology',
    urgency: 'urgent',
    testToConfirm: ['AChR antibodies', 'EMG with repetitive stimulation'],
  },

  // Hematologic conditions
  {
    name: 'Hemochromatosis',
    icd10: 'E83.11',
    category: 'uncommon',
    requiredFeatures: ['elevated ferritin', 'elevated transferrin saturation'],
    supportiveFeatures: ['fatigue', 'joint pain', 'diabetes', 'liver disease', 'bronze skin', 'cardiomyopathy', 'hypogonadism'],
    excludingFeatures: [],
    keyLabs: ['ferritin', 'transferrin saturation', 'HFE gene testing'],
    keyImaging: ['MRI liver'],
    sexPredilection: 'male',
    specialty: 'Hematology',
    urgency: 'routine',
    testToConfirm: ['HFE gene testing', 'liver MRI or biopsy'],
  },
  {
    name: 'Porphyria',
    icd10: 'E80.2',
    category: 'rare',
    requiredFeatures: [],
    supportiveFeatures: ['abdominal pain', 'neuropsychiatric symptoms', 'photosensitivity', 'red/brown urine', 'neuropathy', 'seizures'],
    excludingFeatures: [],
    keyLabs: ['urine porphyrins', 'urine PBG', 'urine ALA'],
    keyImaging: [],
    specialty: 'Hematology',
    urgency: 'urgent',
    testToConfirm: ['spot urine porphobilinogen', '24-hour urine porphyrins'],
    orphaCode: 'ORPHA:738',
  },

  // Gastrointestinal
  {
    name: 'Celiac Disease',
    icd10: 'K90.0',
    category: 'uncommon',
    requiredFeatures: [],
    supportiveFeatures: ['diarrhea', 'bloating', 'weight loss', 'iron deficiency anemia', 'osteoporosis', 'dermatitis herpetiformis', 'fatigue'],
    excludingFeatures: [],
    keyLabs: ['TTG IgA', 'total IgA', 'deamidated gliadin antibodies'],
    keyImaging: ['EGD with duodenal biopsy'],
    specialty: 'Gastroenterology',
    urgency: 'routine',
    testToConfirm: ['TTG IgA', 'duodenal biopsy'],
  },
  {
    name: 'Crohn Disease',
    icd10: 'K50.9',
    category: 'uncommon',
    requiredFeatures: [],
    supportiveFeatures: ['chronic diarrhea', 'abdominal pain', 'weight loss', 'perianal disease', 'extraintestinal manifestations', 'bloody stool'],
    excludingFeatures: [],
    keyLabs: ['CRP', 'ESR', 'fecal calprotectin'],
    keyImaging: ['CT enterography', 'MR enterography', 'colonoscopy'],
    specialty: 'Gastroenterology',
    urgency: 'routine',
    testToConfirm: ['colonoscopy with biopsy', 'imaging'],
  },

  // Rare diseases
  {
    name: 'Amyloidosis',
    icd10: 'E85.9',
    category: 'rare',
    requiredFeatures: ['tissue amyloid deposition'],
    supportiveFeatures: ['nephrotic syndrome', 'cardiomyopathy', 'hepatomegaly', 'neuropathy', 'macroglossia', 'periorbital purpura', 'fatigue'],
    excludingFeatures: [],
    keyLabs: ['SPEP/UPEP', 'free light chains', 'BNP', 'troponin'],
    keyImaging: ['echocardiogram', 'cardiac MRI'],
    specialty: 'Hematology',
    urgency: 'urgent',
    testToConfirm: ['fat pad or tissue biopsy with Congo red staining', 'bone marrow biopsy'],
    orphaCode: 'ORPHA:69',
  },
  {
    name: 'Sarcoidosis',
    icd10: 'D86.9',
    category: 'uncommon',
    requiredFeatures: ['non-caseating granulomas'],
    supportiveFeatures: ['bilateral hilar lymphadenopathy', 'pulmonary infiltrates', 'erythema nodosum', 'uveitis', 'fatigue', 'dry cough', 'hypercalcemia'],
    excludingFeatures: [],
    keyLabs: ['ACE level', 'calcium', 'vitamin D levels'],
    keyImaging: ['chest X-ray', 'CT chest', 'PET scan'],
    specialty: 'Pulmonology',
    urgency: 'routine',
    testToConfirm: ['tissue biopsy showing non-caseating granulomas'],
  },
  {
    name: 'Fabry Disease',
    icd10: 'E75.2',
    category: 'very-rare',
    requiredFeatures: ['alpha-galactosidase A deficiency'],
    supportiveFeatures: ['acroparesthesias', 'angiokeratomas', 'hypohidrosis', 'corneal verticillata', 'cardiomyopathy', 'renal failure', 'stroke'],
    excludingFeatures: [],
    keyLabs: ['alpha-galactosidase A activity', 'globotriaosylsphingosine (lyso-Gb3)'],
    keyImaging: ['cardiac MRI', 'renal ultrasound'],
    sexPredilection: 'male',
    specialty: 'Genetics',
    urgency: 'routine',
    testToConfirm: ['alpha-galactosidase A enzyme activity', 'GLA gene sequencing'],
    orphaCode: 'ORPHA:324',
  },
  {
    name: 'Ehlers-Danlos Syndrome (Hypermobile Type)',
    icd10: 'Q79.6',
    category: 'rare',
    requiredFeatures: ['joint hypermobility'],
    supportiveFeatures: ['chronic pain', 'skin hyperextensibility', 'easy bruising', 'poor wound healing', 'fatigue', 'dysautonomia', 'GI dysfunction'],
    excludingFeatures: [],
    keyLabs: [],
    keyImaging: [],
    specialty: 'Genetics',
    urgency: 'routine',
    testToConfirm: ['clinical criteria (Beighton score)', 'genetic testing for other types'],
    orphaCode: 'ORPHA:285',
  },
  {
    name: 'Mast Cell Activation Syndrome',
    icd10: 'D89.4',
    category: 'rare',
    requiredFeatures: ['mast cell mediator symptoms'],
    supportiveFeatures: ['flushing', 'urticaria', 'angioedema', 'abdominal pain', 'diarrhea', 'hypotension', 'tachycardia', 'anaphylaxis'],
    excludingFeatures: ['systemic mastocytosis'],
    keyLabs: ['serum tryptase', 'urinary prostaglandins', '24-hour urine histamine'],
    keyImaging: [],
    specialty: 'Allergy/Immunology',
    urgency: 'routine',
    testToConfirm: ['elevated tryptase during symptoms', 'urinary metabolites', 'response to mast cell stabilizers'],
  },
];

// =============================================================================
// Diagnostic Solver Service Class
// =============================================================================

export class DiagnosticSolverService extends EventEmitter {
  private cases: Map<string, PatientCase> = new Map();
  private analyses: Map<string, DiagnosticAnalysis> = new Map();

  constructor() {
    super();
  }

  // ===========================================================================
  // Case Management
  // ===========================================================================

  createCase(caseData: Omit<PatientCase, 'id'>): PatientCase {
    const caseId = `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const patientCase: PatientCase = {
      id: caseId,
      ...caseData,
    };
    this.cases.set(caseId, patientCase);
    return patientCase;
  }

  updateCase(caseId: string, updates: Partial<PatientCase>): PatientCase | null {
    const existing = this.cases.get(caseId);
    if (!existing) return null;
    
    const updated = { ...existing, ...updates };
    this.cases.set(caseId, updated);
    return updated;
  }

  getCase(caseId: string): PatientCase | undefined {
    return this.cases.get(caseId);
  }

  // ===========================================================================
  // Main Analysis Function
  // ===========================================================================

  async analyzeCase(caseId: string): Promise<DiagnosticAnalysis> {
    const patientCase = this.cases.get(caseId);
    if (!patientCase) {
      throw new Error('Case not found');
    }

    console.log(`[DIAGNOSTIC] Analyzing case ${caseId}`);

    // Generate clinical summary
    const clinicalSummary = this.generateClinicalSummary(patientCase);
    
    // Extract key features
    const keyFeatures = this.extractKeyFeatures(patientCase);
    
    // Identify diagnostic challenges
    const diagnosticChallenges = this.identifyDiagnosticChallenges(patientCase);
    
    // Generate differential diagnosis
    const differentialDiagnoses = this.generateDifferentialDiagnosis(patientCase);
    
    // Generate workup recommendations
    const workupRecommendations = this.generateWorkupRecommendations(patientCase, differentialDiagnoses);
    
    // Generate clinical pearls
    const clinicalPearls = this.generateClinicalPearls(patientCase, differentialDiagnoses);
    
    // Identify red flags
    const redFlags = this.identifyRedFlags(patientCase);
    
    // Get relevant literature
    const literatureReferences = this.findRelevantLiterature(patientCase, differentialDiagnoses);
    
    // Calculate confidence
    const confidenceLevel = this.calculateAnalysisConfidence(patientCase, differentialDiagnoses);
    
    // Generate next steps
    const nextSteps = this.generateNextSteps(differentialDiagnoses, workupRecommendations);

    const analysis: DiagnosticAnalysis = {
      caseId,
      analysisDate: new Date(),
      clinicalSummary,
      keyFeatures,
      diagnosticChallenges,
      differentialDiagnoses,
      workupRecommendations,
      clinicalPearls,
      redFlags,
      literatureReferences,
      confidenceLevel,
      nextSteps,
    };

    this.analyses.set(caseId, analysis);
    this.emit('analysisComplete', analysis);

    return analysis;
  }

  // ===========================================================================
  // Clinical Summary Generation
  // ===========================================================================

  private generateClinicalSummary(patientCase: PatientCase): string {
    const { demographics, chiefComplaint, symptoms, medicalHistory } = patientCase;
    
    const symptomList = symptoms.map(s => s.name).join(', ');
    const historyList = medicalHistory.slice(0, 3).join(', ');
    
    return `${demographics.age}-year-old ${demographics.sex} presenting with ${chiefComplaint}. ` +
           `Associated symptoms include ${symptomList || 'none reported'}. ` +
           `Past medical history notable for ${historyList || 'no significant history'}. ` +
           `Symptom duration: ${symptoms[0]?.duration || 'not specified'}.`;
  }

  // ===========================================================================
  // Key Feature Extraction
  // ===========================================================================

  private extractKeyFeatures(patientCase: PatientCase): string[] {
    const features: string[] = [];
    
    // Demographics as features
    if (patientCase.demographics.age < 18) features.push('Pediatric patient');
    if (patientCase.demographics.age > 65) features.push('Elderly patient');
    
    // Key symptoms
    for (const symptom of patientCase.symptoms) {
      if (symptom.severity === 'severe') {
        features.push(`Severe ${symptom.name}`);
      }
      if (symptom.duration && this.isDurationChronic(symptom.duration)) {
        features.push(`Chronic ${symptom.name}`);
      }
    }
    
    // Abnormal labs
    for (const lab of patientCase.labs) {
      if (lab.interpretation === 'critical' || lab.interpretation === 'abnormal') {
        features.push(`Abnormal ${lab.name}: ${lab.value} ${lab.unit || ''}`);
      }
    }
    
    // Abnormal exam findings
    for (const finding of patientCase.physicalExamFindings) {
      if (finding.significance === 'abnormal' || finding.significance === 'critical') {
        features.push(`${finding.system}: ${finding.finding}`);
      }
    }
    
    // Treatment failures
    const failedTreatments = patientCase.previousTreatments.filter(t => t.response === 'ineffective');
    if (failedTreatments.length > 0) {
      features.push(`Failed treatments: ${failedTreatments.map(t => t.name).join(', ')}`);
    }
    
    return features;
  }

  private isDurationChronic(duration: string): boolean {
    const chronicPatterns = [/month/i, /year/i, /chronic/i, /long/i];
    return chronicPatterns.some(p => p.test(duration));
  }

  // ===========================================================================
  // Diagnostic Challenges Identification
  // ===========================================================================

  private identifyDiagnosticChallenges(patientCase: PatientCase): string[] {
    const challenges: string[] = [];
    
    // Non-specific symptoms
    const nonSpecificSymptoms = ['fatigue', 'malaise', 'weakness', 'pain'];
    const hasNonSpecific = patientCase.symptoms.some(s => 
      nonSpecificSymptoms.some(ns => s.name.toLowerCase().includes(ns))
    );
    if (hasNonSpecific) {
      challenges.push('Non-specific presenting symptoms requiring broad differential');
    }
    
    // Multiple system involvement
    const systems = new Set(patientCase.physicalExamFindings.map(f => f.system));
    if (systems.size >= 3) {
      challenges.push('Multi-system involvement suggests systemic disease');
    }
    
    // Previous negative workup
    if (patientCase.previousDiagnoses.includes('undiagnosed') || 
        patientCase.previousDiagnoses.length === 0) {
      challenges.push('Previously undiagnosed despite workup');
    }
    
    // Treatment failures
    const failedTreatments = patientCase.previousTreatments.filter(t => t.response === 'ineffective');
    if (failedTreatments.length >= 2) {
      challenges.push('Multiple treatment failures suggest misdiagnosis or atypical presentation');
    }
    
    // Chronic presentation
    const chronicSymptoms = patientCase.symptoms.filter(s => 
      s.duration && this.isDurationChronic(s.duration)
    );
    if (chronicSymptoms.length > 0) {
      challenges.push('Chronic course may indicate indolent or slowly progressive condition');
    }
    
    return challenges;
  }

  // ===========================================================================
  // Differential Diagnosis Generation
  // ===========================================================================

  private generateDifferentialDiagnosis(patientCase: PatientCase): DifferentialDiagnosis[] {
    const differentials: DifferentialDiagnosis[] = [];
    const symptomNames = patientCase.symptoms.map(s => s.name.toLowerCase());
    const labNames = patientCase.labs.map(l => l.name.toLowerCase());
    const findings = patientCase.physicalExamFindings.map(f => f.finding.toLowerCase());
    const allFeatures = [...symptomNames, ...labNames, ...findings];
    
    for (const disease of DISEASE_PATTERNS) {
      const match = this.matchDiseasePattern(patientCase, disease, allFeatures);
      
      if (match.score > 0) {
        differentials.push({
          diagnosis: disease.name,
          icd10Code: disease.icd10,
          likelihood: this.scoresToLikelihood(match.score),
          confidence: Math.min(match.score, 95),
          category: disease.category,
          supportingEvidence: match.supporting,
          againstEvidence: match.against,
          testToConfirm: disease.testToConfirm,
          testToExclude: [],
          urgency: disease.urgency,
          specialty: disease.specialty,
          orphaCode: disease.orphaCode,
        });
      }
    }
    
    // Sort by confidence
    differentials.sort((a, b) => b.confidence - a.confidence);
    
    // Limit to top 10 for usability
    return differentials.slice(0, 10);
  }

  private matchDiseasePattern(
    patientCase: PatientCase,
    disease: DiseasePattern,
    allFeatures: string[]
  ): { score: number; supporting: string[]; against: string[] } {
    let score = 0;
    const supporting: string[] = [];
    const against: string[] = [];
    
    // Check required features
    for (const required of disease.requiredFeatures) {
      if (allFeatures.some(f => f.includes(required.toLowerCase()))) {
        score += 30;
        supporting.push(`Has ${required}`);
      } else {
        // Required feature missing - significant penalty but don't exclude
        score -= 20;
      }
    }
    
    // Check supportive features
    for (const supportive of disease.supportiveFeatures) {
      if (allFeatures.some(f => f.includes(supportive.toLowerCase()))) {
        score += 10;
        supporting.push(`Has ${supportive}`);
      }
    }
    
    // Check excluding features
    for (const excluding of disease.excludingFeatures) {
      if (allFeatures.some(f => f.includes(excluding.toLowerCase()))) {
        score -= 40;
        against.push(`Has ${excluding} (typically excludes diagnosis)`);
      }
    }
    
    // Age/sex considerations
    if (disease.ageRange) {
      if (disease.ageRange.min && patientCase.demographics.age < disease.ageRange.min) {
        score -= 15;
        against.push(`Patient age (${patientCase.demographics.age}) below typical range`);
      }
      if (disease.ageRange.max && patientCase.demographics.age > disease.ageRange.max) {
        score -= 15;
        against.push(`Patient age (${patientCase.demographics.age}) above typical range`);
      } else if (disease.ageRange.min && disease.ageRange.max) {
        if (patientCase.demographics.age >= disease.ageRange.min && 
            patientCase.demographics.age <= disease.ageRange.max) {
          score += 10;
          supporting.push('Age within typical range');
        }
      }
    }
    
    if (disease.sexPredilection && disease.sexPredilection !== 'none') {
      if (patientCase.demographics.sex === disease.sexPredilection) {
        score += 5;
        supporting.push(`${disease.sexPredilection} sex predilection matches`);
      } else {
        score -= 5;
      }
    }
    
    // Bonus for rare disease if typical workup negative
    if (disease.category === 'rare' || disease.category === 'very-rare') {
      if (patientCase.previousDiagnoses.length === 0 || 
          patientCase.previousDiagnoses.includes('undiagnosed')) {
        score += 10;
        supporting.push('Consider rare disease given unrevealing initial workup');
      }
    }
    
    return { score: Math.max(0, score), supporting, against };
  }

  private scoresToLikelihood(score: number): DifferentialDiagnosis['likelihood'] {
    if (score >= 70) return 'very-likely';
    if (score >= 50) return 'likely';
    if (score >= 30) return 'possible';
    if (score >= 15) return 'unlikely';
    return 'rare-but-consider';
  }

  // ===========================================================================
  // Workup Recommendations
  // ===========================================================================

  private generateWorkupRecommendations(
    patientCase: PatientCase,
    differentials: DifferentialDiagnosis[]
  ): DiagnosticWorkup[] {
    const workups: DiagnosticWorkup[] = [];
    
    // Immediate workup for urgent conditions
    const urgentDx = differentials.filter(d => d.urgency === 'emergent' || d.urgency === 'urgent');
    if (urgentDx.length > 0) {
      const immediateTests: RecommendedTest[] = [];
      const urgentTests = new Set<string>();
      
      for (const dx of urgentDx) {
        for (const test of dx.testToConfirm) {
          urgentTests.add(test);
        }
      }
      
      for (const test of urgentTests) {
        immediateTests.push({
          name: test,
          category: this.categorizeTest(test),
          priority: 'urgent',
          rationale: `To evaluate for ${urgentDx.map(d => d.diagnosis).join(', ')}`,
        });
      }
      
      workups.push({
        phase: 'immediate',
        tests: immediateTests,
        consultations: this.getUrgentConsults(urgentDx),
        rationale: 'Urgent evaluation needed to rule out time-sensitive conditions',
      });
    }
    
    // Initial workup - common conditions
    const likelyDx = differentials.filter(d => d.likelihood === 'very-likely' || d.likelihood === 'likely');
    const initialTests: RecommendedTest[] = [];
    const testsSeen = new Set<string>();
    
    for (const dx of likelyDx) {
      for (const test of dx.testToConfirm) {
        if (!testsSeen.has(test)) {
          testsSeen.add(test);
          initialTests.push({
            name: test,
            category: this.categorizeTest(test),
            priority: 'routine',
            rationale: `To evaluate for ${dx.diagnosis}`,
          });
        }
      }
    }
    
    if (initialTests.length > 0) {
      workups.push({
        phase: 'initial',
        tests: initialTests,
        consultations: [],
        rationale: 'Initial workup targeting most likely diagnoses',
      });
    }
    
    // Secondary workup - less common conditions
    const possibleDx = differentials.filter(d => d.likelihood === 'possible');
    if (possibleDx.length > 0) {
      const secondaryTests: RecommendedTest[] = [];
      
      for (const dx of possibleDx.slice(0, 3)) {
        for (const test of dx.testToConfirm.slice(0, 2)) {
          if (!testsSeen.has(test)) {
            testsSeen.add(test);
            secondaryTests.push({
              name: test,
              category: this.categorizeTest(test),
              priority: 'routine',
              rationale: `If initial workup unrevealing, to evaluate for ${dx.diagnosis}`,
            });
          }
        }
      }
      
      if (secondaryTests.length > 0) {
        workups.push({
          phase: 'secondary',
          tests: secondaryTests,
          consultations: [],
          rationale: 'Extended workup if initial testing unrevealing',
        });
      }
    }
    
    // Specialized workup - rare diseases
    const rareDx = differentials.filter(d => d.category === 'rare' || d.category === 'very-rare');
    if (rareDx.length > 0) {
      const specializedTests: RecommendedTest[] = [];
      const specializedConsults: RecommendedConsult[] = [];
      
      for (const dx of rareDx.slice(0, 3)) {
        for (const test of dx.testToConfirm.slice(0, 1)) {
          if (!testsSeen.has(test)) {
            testsSeen.add(test);
            specializedTests.push({
              name: test,
              category: this.categorizeTest(test),
              priority: 'routine',
              rationale: `Specialized testing for rare condition: ${dx.diagnosis}`,
            });
          }
        }
        
        if (dx.specialty && !specializedConsults.some(c => c.specialty === dx.specialty)) {
          specializedConsults.push({
            specialty: dx.specialty,
            urgency: 'routine',
            reason: `Evaluation for ${dx.diagnosis}`,
            specificQuestions: [`Consider ${dx.diagnosis} given clinical presentation`],
          });
        }
      }
      
      if (specializedTests.length > 0 || specializedConsults.length > 0) {
        workups.push({
          phase: 'specialized',
          tests: specializedTests,
          consultations: specializedConsults,
          rationale: 'Specialized evaluation for rare disease considerations',
        });
      }
    }
    
    return workups;
  }

  private categorizeTest(test: string): RecommendedTest['category'] {
    const lowerTest = test.toLowerCase();
    
    if (lowerTest.includes('biopsy')) return 'biopsy';
    if (lowerTest.includes('gene') || lowerTest.includes('genetic')) return 'genetic';
    if (lowerTest.includes('ct') || lowerTest.includes('mri') || 
        lowerTest.includes('x-ray') || lowerTest.includes('ultrasound') ||
        lowerTest.includes('scan') || lowerTest.includes('imaging')) return 'imaging';
    if (lowerTest.includes('scopy') || lowerTest.includes('graphy')) return 'procedure';
    
    return 'lab';
  }

  private getUrgentConsults(diagnoses: DifferentialDiagnosis[]): RecommendedConsult[] {
    const consults: RecommendedConsult[] = [];
    const specialtiesSeen = new Set<string>();
    
    for (const dx of diagnoses) {
      if (dx.specialty && !specialtiesSeen.has(dx.specialty)) {
        specialtiesSeen.add(dx.specialty);
        consults.push({
          specialty: dx.specialty,
          urgency: dx.urgency === 'emergent' ? 'emergent' : 'urgent',
          reason: `Urgent evaluation for possible ${dx.diagnosis}`,
        });
      }
    }
    
    return consults;
  }

  // ===========================================================================
  // Clinical Pearls
  // ===========================================================================

  private generateClinicalPearls(
    patientCase: PatientCase,
    differentials: DifferentialDiagnosis[]
  ): string[] {
    const pearls: string[] = [];
    
    // Age-specific pearls
    if (patientCase.demographics.age > 50) {
      pearls.push('In patients >50, always consider malignancy in the differential for unexplained weight loss or new symptoms');
    }
    
    // Symptom-specific pearls
    if (patientCase.symptoms.some(s => s.name.toLowerCase().includes('fatigue'))) {
      pearls.push('Fatigue is non-specific but common in autoimmune, endocrine, hematologic, and psychiatric conditions - systematic approach needed');
    }
    
    // Pattern-based pearls
    const failedTreatments = patientCase.previousTreatments.filter(t => t.response === 'ineffective');
    if (failedTreatments.length >= 2) {
      pearls.push('Multiple treatment failures suggest the diagnosis may be incorrect - reconsider from first principles');
    }
    
    // Rare disease pearls
    const rareDx = differentials.filter(d => d.category === 'rare' || d.category === 'very-rare');
    if (rareDx.length > 0) {
      pearls.push('"When you hear hoofbeats, think horses not zebras" - but after horses are excluded, zebras become the leading diagnosis');
    }
    
    // Multi-system pearls
    const systems = new Set(patientCase.physicalExamFindings.map(f => f.system));
    if (systems.size >= 3) {
      pearls.push('Multi-system involvement suggests systemic autoimmune disease, vasculitis, or infiltrative process');
    }
    
    return pearls;
  }

  // ===========================================================================
  // Red Flags
  // ===========================================================================

  private identifyRedFlags(patientCase: PatientCase): string[] {
    const redFlags: string[] = [];
    
    // Weight loss
    if (patientCase.symptoms.some(s => 
      s.name.toLowerCase().includes('weight loss') && s.severity !== 'mild'
    )) {
      redFlags.push('⚠️ Significant unexplained weight loss - consider malignancy');
    }
    
    // Night sweats
    if (patientCase.symptoms.some(s => s.name.toLowerCase().includes('night sweat'))) {
      redFlags.push('⚠️ Night sweats - consider lymphoma, TB, endocarditis');
    }
    
    // Neurological symptoms
    if (patientCase.symptoms.some(s => 
      ['weakness', 'numbness', 'vision', 'speech', 'gait'].some(n => 
        s.name.toLowerCase().includes(n)
      )
    )) {
      redFlags.push('⚠️ Neurological symptoms warrant urgent evaluation');
    }
    
    // Critical labs
    const criticalLabs = patientCase.labs.filter(l => l.interpretation === 'critical');
    for (const lab of criticalLabs) {
      redFlags.push(`⚠️ Critical ${lab.name}: ${lab.value} - requires immediate attention`);
    }
    
    // Age-based red flags
    if (patientCase.demographics.age > 50 && 
        patientCase.symptoms.some(s => s.name.toLowerCase().includes('headache'))) {
      redFlags.push('⚠️ New headache in patient >50 - consider temporal arteritis, mass lesion');
    }
    
    return redFlags;
  }

  // ===========================================================================
  // Literature References
  // ===========================================================================

  private findRelevantLiterature(
    patientCase: PatientCase,
    differentials: DifferentialDiagnosis[]
  ): LiteratureReference[] {
    // In production, this would query PubMed, UpToDate, etc.
    // For now, return placeholder references based on top diagnoses
    const references: LiteratureReference[] = [];
    
    for (const dx of differentials.slice(0, 3)) {
      references.push({
        title: `Diagnostic approach to ${dx.diagnosis}`,
        authors: 'Expert Panel',
        journal: 'UpToDate',
        year: 2024,
        relevance: `Comprehensive review of ${dx.diagnosis} diagnosis and management`,
      });
    }
    
    // Add rare disease resources if applicable
    const rareDx = differentials.filter(d => d.orphaCode);
    for (const dx of rareDx) {
      references.push({
        title: `${dx.diagnosis} - Orphanet`,
        authors: 'Orphanet Editorial Board',
        relevance: `Expert-reviewed information on rare disease: ${dx.diagnosis}`,
      });
    }
    
    return references;
  }

  // ===========================================================================
  // Confidence Calculation
  // ===========================================================================

  private calculateAnalysisConfidence(
    patientCase: PatientCase,
    differentials: DifferentialDiagnosis[]
  ): number {
    let confidence = 50; // Base confidence
    
    // More data = higher confidence
    if (patientCase.symptoms.length >= 3) confidence += 10;
    if (patientCase.labs.length >= 3) confidence += 10;
    if (patientCase.physicalExamFindings.length >= 3) confidence += 5;
    
    // Strong leading diagnosis increases confidence
    if (differentials[0]?.confidence > 70) confidence += 15;
    
    // Clear separation between top diagnoses
    if (differentials.length >= 2) {
      const gap = differentials[0].confidence - differentials[1].confidence;
      if (gap > 20) confidence += 10;
    }
    
    // Decrease confidence for very rare conditions
    if (differentials[0]?.category === 'very-rare') confidence -= 10;
    
    return Math.min(95, Math.max(20, confidence));
  }

  // ===========================================================================
  // Next Steps Generation
  // ===========================================================================

  private generateNextSteps(
    differentials: DifferentialDiagnosis[],
    workups: DiagnosticWorkup[]
  ): string[] {
    const steps: string[] = [];
    
    // Immediate steps
    const immediateWorkup = workups.find(w => w.phase === 'immediate');
    if (immediateWorkup) {
      steps.push(`URGENT: Order ${immediateWorkup.tests.map(t => t.name).join(', ')}`);
      for (const consult of immediateWorkup.consultations) {
        steps.push(`URGENT: Request ${consult.specialty} consultation`);
      }
    }
    
    // Initial workup
    const initialWorkup = workups.find(w => w.phase === 'initial');
    if (initialWorkup && initialWorkup.tests.length > 0) {
      steps.push(`Order initial workup: ${initialWorkup.tests.slice(0, 5).map(t => t.name).join(', ')}`);
    }
    
    // Follow-up
    if (differentials.length > 0) {
      steps.push(`Review results and reassess differential, leading with ${differentials[0].diagnosis}`);
    }
    
    // Specialist referral if needed
    const specialties = new Set(differentials.filter(d => d.specialty).map(d => d.specialty));
    if (specialties.size > 0) {
      steps.push(`Consider referral to: ${Array.from(specialties).join(', ')}`);
    }
    
    return steps;
  }

  // ===========================================================================
  // Get Analysis
  // ===========================================================================

  getAnalysis(caseId: string): DiagnosticAnalysis | undefined {
    return this.analyses.get(caseId);
  }
}

// Singleton instance
export const diagnosticSolverService = new DiagnosticSolverService();
export default diagnosticSolverService;
