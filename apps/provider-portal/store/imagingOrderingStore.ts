// ============================================================
// Imaging Ordering Store - Zustand with BioMistral AI Integration
// apps/provider-portal/store/imagingOrderingStore.ts
//
// Manages imaging ordering workflow with AI-powered recommendations
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// =============================================================================
// Types
// =============================================================================

export type ImagingPriority = 'STAT' | 'URGENT' | 'ROUTINE';
export type ImagingModality = 'CT' | 'MRI' | 'XRAY' | 'US' | 'NM' | 'FLUORO' | 'MAMMO' | 'DEXA';

export interface ImagingStudy {
  code: string;
  name: string;
  description: string;
  modality: ImagingModality;
  bodyPart: string;
  defaultPriority: ImagingPriority;
  cost: number;
  durationMinutes: number;
  radiationDose?: string;
  contrast?: boolean;
  contrastType?: string;
  turnaroundHours: number;
  contraindications?: string[];
  preparation?: string;
  cptCode?: string;
}

export interface AIImagingRecommendation {
  id: string;
  studyCode: string;
  studyName: string;
  modality: ImagingModality;
  priority: ImagingPriority;
  rationale: string;
  clinicalEvidence: string[];
  confidence: number;
  category: 'critical' | 'recommended' | 'consider' | 'not-indicated';
  redFlagRelated?: boolean;
  warningMessage?: string;
}

export interface SelectedStudy {
  study: ImagingStudy;
  priority: ImagingPriority;
  aiRecommended: boolean;
  rationale?: string;
  clinicalHistory?: string;
  laterality?: 'left' | 'right' | 'bilateral' | 'none';
  contrast: boolean;
  specialInstructions?: string;
}

export interface PatientContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint: string;
  allergies: string[];
  currentMedications: string[];
  medicalHistory: string[];
  redFlags: string[];
  weight?: number;
  creatinine?: number;
  gfr?: number;
  pregnant?: boolean;
}

// =============================================================================
// Imaging Catalog
// =============================================================================

export const IMAGING_CATALOG: Record<string, ImagingStudy> = {
  // CT Studies
  'CT-HEAD-NC': {
    code: 'CT-HEAD-NC',
    name: 'CT Head without Contrast',
    description: 'Non-contrast CT of the head for acute intracranial pathology, hemorrhage, mass effect, or stroke',
    modality: 'CT',
    bodyPart: 'Head',
    defaultPriority: 'STAT',
    cost: 450,
    durationMinutes: 15,
    radiationDose: '2 mSv',
    contrast: false,
    turnaroundHours: 1,
    cptCode: '70450'
  },
  'CT-HEAD-C': {
    code: 'CT-HEAD-C',
    name: 'CT Head with Contrast',
    description: 'Contrast-enhanced CT for tumor evaluation, infection, or inflammatory conditions',
    modality: 'CT',
    bodyPart: 'Head',
    defaultPriority: 'ROUTINE',
    cost: 550,
    durationMinutes: 20,
    radiationDose: '2 mSv',
    contrast: true,
    contrastType: 'IV Iodinated',
    turnaroundHours: 4,
    contraindications: ['Contrast allergy', 'Renal insufficiency (GFR <30)'],
    cptCode: '70460'
  },
  'CTA-HEAD-NECK': {
    code: 'CTA-HEAD-NECK',
    name: 'CTA Head and Neck',
    description: 'CT angiography to evaluate vascular abnormalities, aneurysms, or arterial dissection',
    modality: 'CT',
    bodyPart: 'Head/Neck',
    defaultPriority: 'URGENT',
    cost: 750,
    durationMinutes: 20,
    radiationDose: '4 mSv',
    contrast: true,
    contrastType: 'IV Iodinated',
    turnaroundHours: 2,
    contraindications: ['Contrast allergy', 'Renal insufficiency (GFR <30)'],
    cptCode: '70496'
  },
  'CT-CSPINE': {
    code: 'CT-CSPINE',
    name: 'CT Cervical Spine without Contrast',
    description: 'Evaluation for cervical spine fractures, degenerative changes, or bony abnormalities',
    modality: 'CT',
    bodyPart: 'Cervical Spine',
    defaultPriority: 'ROUTINE',
    cost: 400,
    durationMinutes: 15,
    radiationDose: '3 mSv',
    contrast: false,
    turnaroundHours: 4,
    cptCode: '72125'
  },
  'CT-CHEST-NC': {
    code: 'CT-CHEST-NC',
    name: 'CT Chest without Contrast',
    description: 'Evaluate pulmonary parenchyma, nodules, interstitial lung disease',
    modality: 'CT',
    bodyPart: 'Chest',
    defaultPriority: 'ROUTINE',
    cost: 400,
    durationMinutes: 15,
    radiationDose: '7 mSv',
    contrast: false,
    turnaroundHours: 4,
    cptCode: '71250'
  },
  'CT-CHEST-PE': {
    code: 'CT-CHEST-PE',
    name: 'CT Chest PE Protocol',
    description: 'CT angiography for pulmonary embolism evaluation',
    modality: 'CT',
    bodyPart: 'Chest',
    defaultPriority: 'STAT',
    cost: 650,
    durationMinutes: 15,
    radiationDose: '8 mSv',
    contrast: true,
    contrastType: 'IV Iodinated',
    turnaroundHours: 1,
    contraindications: ['Contrast allergy', 'Renal insufficiency (GFR <30)'],
    cptCode: '71275'
  },
  'CT-ABD-PELVIS-C': {
    code: 'CT-ABD-PELVIS-C',
    name: 'CT Abdomen/Pelvis with Contrast',
    description: 'Comprehensive abdominal evaluation with IV contrast',
    modality: 'CT',
    bodyPart: 'Abdomen/Pelvis',
    defaultPriority: 'ROUTINE',
    cost: 750,
    durationMinutes: 20,
    radiationDose: '10 mSv',
    contrast: true,
    contrastType: 'IV Iodinated',
    turnaroundHours: 4,
    contraindications: ['Contrast allergy', 'Renal insufficiency (GFR <30)'],
    preparation: 'Oral contrast 1 hour prior if available',
    cptCode: '74177'
  },
  'CT-ABD-PELVIS-NC': {
    code: 'CT-ABD-PELVIS-NC',
    name: 'CT Abdomen/Pelvis without Contrast',
    description: 'Non-contrast CT for kidney stones, appendicitis, or when contrast contraindicated',
    modality: 'CT',
    bodyPart: 'Abdomen/Pelvis',
    defaultPriority: 'ROUTINE',
    cost: 600,
    durationMinutes: 15,
    radiationDose: '10 mSv',
    contrast: false,
    turnaroundHours: 4,
    cptCode: '74176'
  },

  // MRI Studies
  'MRI-BRAIN-NC': {
    code: 'MRI-BRAIN-NC',
    name: 'MRI Brain without Contrast',
    description: 'High-resolution brain imaging for stroke, tumor, MS, or structural abnormalities',
    modality: 'MRI',
    bodyPart: 'Brain',
    defaultPriority: 'ROUTINE',
    cost: 800,
    durationMinutes: 30,
    contrast: false,
    turnaroundHours: 24,
    contraindications: ['Pacemaker', 'Cochlear implant', 'Certain metallic implants'],
    cptCode: '70551'
  },
  'MRI-BRAIN-C': {
    code: 'MRI-BRAIN-C',
    name: 'MRI Brain with and without Contrast',
    description: 'MRI with gadolinium for tumor, infection, or inflammatory evaluation',
    modality: 'MRI',
    bodyPart: 'Brain',
    defaultPriority: 'URGENT',
    cost: 950,
    durationMinutes: 45,
    contrast: true,
    contrastType: 'Gadolinium',
    turnaroundHours: 4,
    contraindications: ['Pacemaker', 'Severe renal impairment (GFR <30)', 'Gadolinium allergy'],
    cptCode: '70553'
  },
  'MRA-BRAIN': {
    code: 'MRA-BRAIN',
    name: 'MRA Brain',
    description: 'Magnetic resonance angiography of cerebral vasculature',
    modality: 'MRI',
    bodyPart: 'Brain',
    defaultPriority: 'ROUTINE',
    cost: 850,
    durationMinutes: 30,
    contrast: false,
    turnaroundHours: 24,
    cptCode: '70544'
  },
  'MRV-BRAIN': {
    code: 'MRV-BRAIN',
    name: 'MRV Brain',
    description: 'Magnetic resonance venography to evaluate cerebral venous thrombosis',
    modality: 'MRI',
    bodyPart: 'Brain',
    defaultPriority: 'ROUTINE',
    cost: 650,
    durationMinutes: 30,
    contrast: false,
    turnaroundHours: 24,
    cptCode: '70546'
  },
  'MRI-CSPINE': {
    code: 'MRI-CSPINE',
    name: 'MRI Cervical Spine without Contrast',
    description: 'Evaluate cervical disc disease, spinal stenosis, cord abnormalities',
    modality: 'MRI',
    bodyPart: 'Cervical Spine',
    defaultPriority: 'ROUTINE',
    cost: 850,
    durationMinutes: 30,
    contrast: false,
    turnaroundHours: 24,
    cptCode: '72141'
  },
  'MRI-LSPINE': {
    code: 'MRI-LSPINE',
    name: 'MRI Lumbar Spine without Contrast',
    description: 'Evaluate lumbar disc disease, stenosis, nerve compression',
    modality: 'MRI',
    bodyPart: 'Lumbar Spine',
    defaultPriority: 'ROUTINE',
    cost: 850,
    durationMinutes: 30,
    contrast: false,
    turnaroundHours: 24,
    cptCode: '72148'
  },
  'MRI-KNEE': {
    code: 'MRI-KNEE',
    name: 'MRI Knee without Contrast',
    description: 'Evaluate meniscal tears, ligament injury, cartilage damage',
    modality: 'MRI',
    bodyPart: 'Knee',
    defaultPriority: 'ROUTINE',
    cost: 700,
    durationMinutes: 30,
    contrast: false,
    turnaroundHours: 48,
    cptCode: '73721'
  },
  'MRI-SHOULDER': {
    code: 'MRI-SHOULDER',
    name: 'MRI Shoulder without Contrast',
    description: 'Evaluate rotator cuff, labral tears, joint pathology',
    modality: 'MRI',
    bodyPart: 'Shoulder',
    defaultPriority: 'ROUTINE',
    cost: 750,
    durationMinutes: 30,
    contrast: false,
    turnaroundHours: 48,
    cptCode: '73221'
  },

  // X-Ray Studies
  'XR-CHEST-2V': {
    code: 'XR-CHEST-2V',
    name: 'Chest X-Ray 2 Views',
    description: 'PA and lateral chest radiograph for pulmonary and cardiac evaluation',
    modality: 'XRAY',
    bodyPart: 'Chest',
    defaultPriority: 'ROUTINE',
    cost: 80,
    durationMinutes: 10,
    radiationDose: '0.1 mSv',
    contrast: false,
    turnaroundHours: 2,
    cptCode: '71046'
  },
  'XR-CSPINE': {
    code: 'XR-CSPINE',
    name: 'Cervical Spine X-Ray',
    description: 'Cervical spine radiographs for alignment and degenerative changes',
    modality: 'XRAY',
    bodyPart: 'Cervical Spine',
    defaultPriority: 'ROUTINE',
    cost: 100,
    durationMinutes: 15,
    radiationDose: '0.2 mSv',
    contrast: false,
    turnaroundHours: 2,
    cptCode: '72052'
  },
  'XR-ABDOMEN': {
    code: 'XR-ABDOMEN',
    name: 'Abdominal X-Ray',
    description: 'KUB for bowel gas pattern, free air, calcifications',
    modality: 'XRAY',
    bodyPart: 'Abdomen',
    defaultPriority: 'ROUTINE',
    cost: 75,
    durationMinutes: 10,
    radiationDose: '0.7 mSv',
    contrast: false,
    turnaroundHours: 2,
    cptCode: '74018'
  },

  // Ultrasound Studies
  'US-ABD-COMPLETE': {
    code: 'US-ABD-COMPLETE',
    name: 'Ultrasound Abdomen Complete',
    description: 'Comprehensive ultrasound of liver, gallbladder, pancreas, spleen, kidneys',
    modality: 'US',
    bodyPart: 'Abdomen',
    defaultPriority: 'ROUTINE',
    cost: 300,
    durationMinutes: 30,
    contrast: false,
    turnaroundHours: 4,
    cptCode: '76700'
  },
  'US-RUQ': {
    code: 'US-RUQ',
    name: 'Ultrasound Right Upper Quadrant',
    description: 'Focused evaluation of gallbladder, liver, and bile ducts',
    modality: 'US',
    bodyPart: 'Abdomen',
    defaultPriority: 'STAT',
    cost: 200,
    durationMinutes: 20,
    contrast: false,
    turnaroundHours: 2,
    cptCode: '76705'
  },
  'US-RENAL': {
    code: 'US-RENAL',
    name: 'Ultrasound Kidneys',
    description: 'Evaluate kidneys for hydronephrosis, stones, masses',
    modality: 'US',
    bodyPart: 'Kidneys',
    defaultPriority: 'ROUTINE',
    cost: 250,
    durationMinutes: 20,
    contrast: false,
    turnaroundHours: 4,
    cptCode: '76770'
  },
  'US-PELVIS': {
    code: 'US-PELVIS',
    name: 'Ultrasound Pelvis',
    description: 'Pelvic ultrasound for ovaries, uterus, bladder evaluation',
    modality: 'US',
    bodyPart: 'Pelvis',
    defaultPriority: 'ROUTINE',
    cost: 280,
    durationMinutes: 25,
    contrast: false,
    turnaroundHours: 4,
    cptCode: '76856'
  },
  'US-THYROID': {
    code: 'US-THYROID',
    name: 'Ultrasound Thyroid',
    description: 'Evaluate thyroid nodules, enlargement, vascularity',
    modality: 'US',
    bodyPart: 'Thyroid',
    defaultPriority: 'ROUTINE',
    cost: 250,
    durationMinutes: 20,
    contrast: false,
    turnaroundHours: 24,
    cptCode: '76536'
  },
  'US-LE-VENOUS': {
    code: 'US-LE-VENOUS',
    name: 'Ultrasound Lower Extremity Venous Duplex',
    description: 'Deep venous thrombosis (DVT) evaluation',
    modality: 'US',
    bodyPart: 'Lower Extremity',
    defaultPriority: 'STAT',
    cost: 350,
    durationMinutes: 30,
    contrast: false,
    turnaroundHours: 2,
    cptCode: '93970'
  },
  'US-CAROTID': {
    code: 'US-CAROTID',
    name: 'Carotid Ultrasound Duplex',
    description: 'Evaluate carotid artery stenosis and plaque',
    modality: 'US',
    bodyPart: 'Neck',
    defaultPriority: 'ROUTINE',
    cost: 350,
    durationMinutes: 30,
    contrast: false,
    turnaroundHours: 24,
    cptCode: '93880'
  },

  // Nuclear Medicine
  'NM-VQ': {
    code: 'NM-VQ',
    name: 'V/Q Scan',
    description: 'Ventilation/perfusion scan for PE evaluation when CT contraindicated',
    modality: 'NM',
    bodyPart: 'Chest',
    defaultPriority: 'STAT',
    cost: 600,
    durationMinutes: 60,
    radiationDose: '2 mSv',
    contrast: false,
    turnaroundHours: 4,
    cptCode: '78582'
  },
  'NM-BONE': {
    code: 'NM-BONE',
    name: 'Bone Scan (Whole Body)',
    description: 'Evaluate for metastatic disease, occult fractures, osteomyelitis',
    modality: 'NM',
    bodyPart: 'Whole Body',
    defaultPriority: 'ROUTINE',
    cost: 600,
    durationMinutes: 180,
    radiationDose: '6 mSv',
    contrast: false,
    turnaroundHours: 24,
    cptCode: '78306'
  },

  // DEXA
  'DEXA': {
    code: 'DEXA',
    name: 'DEXA Bone Density',
    description: 'Bone mineral density measurement for osteoporosis screening',
    modality: 'DEXA',
    bodyPart: 'Spine/Hip',
    defaultPriority: 'ROUTINE',
    cost: 150,
    durationMinutes: 15,
    radiationDose: '0.001 mSv',
    contrast: false,
    turnaroundHours: 24,
    cptCode: '77080'
  },

  // Mammography
  'MAMMO-SCREEN': {
    code: 'MAMMO-SCREEN',
    name: 'Screening Mammogram',
    description: 'Bilateral screening mammography for breast cancer detection',
    modality: 'MAMMO',
    bodyPart: 'Breast',
    defaultPriority: 'ROUTINE',
    cost: 200,
    durationMinutes: 20,
    radiationDose: '0.4 mSv',
    contrast: false,
    turnaroundHours: 48,
    cptCode: '77067'
  },
  'MAMMO-DIAG': {
    code: 'MAMMO-DIAG',
    name: 'Diagnostic Mammogram',
    description: 'Diagnostic mammography for symptomatic evaluation',
    modality: 'MAMMO',
    bodyPart: 'Breast',
    defaultPriority: 'ROUTINE',
    cost: 250,
    durationMinutes: 30,
    radiationDose: '0.4 mSv',
    contrast: false,
    turnaroundHours: 24,
    cptCode: '77066'
  },

  // Echo
  'ECHO-TTE': {
    code: 'ECHO-TTE',
    name: 'Echocardiogram (TTE)',
    description: 'Transthoracic echocardiogram for cardiac function assessment',
    modality: 'US',
    bodyPart: 'Heart',
    defaultPriority: 'ROUTINE',
    cost: 400,
    durationMinutes: 45,
    contrast: false,
    turnaroundHours: 24,
    cptCode: '93306'
  }
};

// =============================================================================
// Store State Interface
// =============================================================================

interface ImagingOrderingState {
  patientContext: PatientContext | null;
  selectedStudies: Map<string, SelectedStudy>;
  priority: ImagingPriority;
  clinicalIndication: string;
  encounterId: string | null;
  aiRecommendations: AIImagingRecommendation[];
  isLoadingRecommendations: boolean;
  searchQuery: string;
  modalityFilter: ImagingModality | 'all';
  loading: boolean;
  submitting: boolean;
  error: string | null;
  lastSubmittedOrderIds: string[];
  
  // Actions
  setPatientContext: (context: PatientContext) => void;
  addStudy: (studyCode: string, options?: Partial<Omit<SelectedStudy, 'study'>>) => void;
  removeStudy: (studyCode: string) => void;
  updateStudyPriority: (studyCode: string, priority: ImagingPriority) => void;
  updateStudyContrast: (studyCode: string, contrast: boolean) => void;
  setGlobalPriority: (priority: ImagingPriority) => void;
  setClinicalIndication: (indication: string) => void;
  setSearchQuery: (query: string) => void;
  setModalityFilter: (modality: ImagingModality | 'all') => void;
  generateAIRecommendations: () => Promise<void>;
  addAIRecommendedStudies: (category: 'critical' | 'recommended' | 'consider') => void;
  submitOrder: (encounterId: string) => Promise<string[]>;
  clearOrder: () => void;
  
  // Computed
  getSelectedStudiesArray: () => SelectedStudy[];
  getFilteredCatalog: () => ImagingStudy[];
  getTotalCost: () => number;
  getStatCount: () => number;
  hasContrastStudies: () => boolean;
  getRadiationTotal: () => string;
}

// =============================================================================
// BioMistral AI Imaging Recommendation Generator
// =============================================================================

async function generateBioMistralImagingRecommendations(
  patientContext: PatientContext
): Promise<AIImagingRecommendation[]> {
  const recommendations: AIImagingRecommendation[] = [];
  const complaint = patientContext.chiefComplaint.toLowerCase();
  const redFlags = patientContext.redFlags || [];
  const hasContrastAllergy = patientContext.allergies.some(a => 
    a.toLowerCase().includes('contrast') || a.toLowerCase().includes('iodine')
  );
  
  // ==========================================================================
  // HEADACHE - Severe / Red Flags
  // ==========================================================================
  if (complaint.includes('headache') || complaint.includes('head pain')) {
    const hasWorstHeadache = redFlags.some(rf => 
      rf.toLowerCase().includes('worst') || rf.toLowerCase().includes('thunderclap')
    );
    const hasConfusion = redFlags.some(rf => rf.toLowerCase().includes('confusion'));
    const hasNeurologicalDeficit = redFlags.some(rf => 
      rf.toLowerCase().includes('weakness') || rf.toLowerCase().includes('numbness') ||
      rf.toLowerCase().includes('vision') || rf.toLowerCase().includes('speech')
    );
    
    if (hasWorstHeadache || hasConfusion || hasNeurologicalDeficit) {
      // STAT CT Head for acute evaluation
      recommendations.push({
        id: 'rec_ct_head_stat',
        studyCode: 'CT-HEAD-NC',
        studyName: 'CT Head without Contrast',
        modality: 'CT',
        priority: 'STAT',
        rationale: 'STAT non-contrast CT head to rule out acute intracranial hemorrhage (SAH, ICH), mass effect, or acute stroke. First-line imaging for "worst headache of life".',
        clinicalEvidence: [
          'Sensitivity 93-100% for SAH within 6 hours',
          'ACEP clinical policy recommends emergent CT for thunderclap headache',
          'Red flag symptoms mandate emergent neuroimaging'
        ],
        confidence: 0.98,
        category: 'critical',
        redFlagRelated: true
      });
      
      // CTA for vascular evaluation if CT negative
      if (!hasContrastAllergy) {
        recommendations.push({
          id: 'rec_cta_head_neck',
          studyCode: 'CTA-HEAD-NECK',
          studyName: 'CTA Head and Neck',
          modality: 'CT',
          priority: 'URGENT',
          rationale: 'Consider CTA if initial CT non-diagnostic or clinical suspicion remains high for vascular etiology (aneurysm, dissection). Evaluates circle of Willis and cervical vessels.',
          clinicalEvidence: [
            'CTA sensitivity 90-95% for intracranial aneurysm >3mm',
            'Can identify arterial dissection as cause of headache',
            'Often done concurrently with non-contrast CT'
          ],
          confidence: 0.85,
          category: 'recommended',
          redFlagRelated: true
        });
      }
      
      // MRI for follow-up or if CT negative
      recommendations.push({
        id: 'rec_mri_brain',
        studyCode: 'MRI-BRAIN-C',
        studyName: 'MRI Brain with and without Contrast',
        modality: 'MRI',
        priority: 'URGENT',
        rationale: 'MRI provides superior soft tissue detail. Consider if CT negative but clinical concern persists, or for evaluation of non-hemorrhagic pathology (tumor, infection, demyelination).',
        clinicalEvidence: [
          'MRI more sensitive than CT for posterior fossa lesions',
          'FLAIR sequence sensitive for small SAH',
          'Contrast helps identify tumors, infection, inflammation'
        ],
        confidence: 0.82,
        category: 'recommended'
      });
      
      // MRV for CVT evaluation (especially with OCP use)
      if (patientContext.currentMedications.some(m => 
        m.toLowerCase().includes('contraceptive') || m.toLowerCase().includes('estrogen')
      )) {
        recommendations.push({
          id: 'rec_mrv_brain',
          studyCode: 'MRV-BRAIN',
          studyName: 'MRV Brain',
          modality: 'MRI',
          priority: 'ROUTINE',
          rationale: 'Consider MRV given oral contraceptive use - increased risk of cerebral venous thrombosis (CVT). CVT can present with severe headache, especially in young women on hormonal therapy.',
          clinicalEvidence: [
            'OCP use increases CVT risk 5-7 fold',
            'CVT presents with headache in 90% of cases',
            'MRV is gold standard for CVT diagnosis'
          ],
          confidence: 0.78,
          category: 'consider'
        });
      }
      
      // NOT INDICATED - Routine migraine CT
      recommendations.push({
        id: 'rec_ct_routine_not_indicated',
        studyCode: 'CT-HEAD-NC',
        studyName: 'Routine Migraine CT',
        modality: 'CT',
        priority: 'ROUTINE',
        rationale: 'Routine CT imaging for typical migraine without red flags is NOT indicated per Choosing Wisely guidelines.',
        clinicalEvidence: [
          'AAN guidelines recommend against routine imaging for stable headache',
          'Low yield in patients with typical migraine features',
          'However, current presentation has RED FLAGS requiring emergent evaluation'
        ],
        confidence: 0.95,
        category: 'not-indicated',
        warningMessage: 'Not indicated - RED FLAG symptoms require emergent evaluation, not routine workup'
      });
    }
  }
  
  // ==========================================================================
  // CHEST PAIN / SHORTNESS OF BREATH
  // ==========================================================================
  if (complaint.includes('chest pain') || complaint.includes('shortness of breath') || complaint.includes('dyspnea')) {
    if (!hasContrastAllergy) {
      recommendations.push({
        id: 'rec_ct_pe',
        studyCode: 'CT-CHEST-PE',
        studyName: 'CT Chest PE Protocol',
        modality: 'CT',
        priority: 'STAT',
        rationale: 'CT pulmonary angiography to rule out pulmonary embolism. First-line imaging for suspected PE in hemodynamically stable patients.',
        clinicalEvidence: [
          'Sensitivity 83-94%, specificity 94-96% for PE',
          'Preferred over V/Q in most patients',
          'Also evaluates for other chest pathology'
        ],
        confidence: 0.92,
        category: 'critical',
        redFlagRelated: true
      });
    } else {
      // V/Q scan for contrast allergy
      recommendations.push({
        id: 'rec_vq',
        studyCode: 'NM-VQ',
        studyName: 'V/Q Scan',
        modality: 'NM',
        priority: 'STAT',
        rationale: 'V/Q scan for PE evaluation given contrast allergy. Alternative to CTA when iodinated contrast contraindicated.',
        clinicalEvidence: [
          'Alternative when CT contrast contraindicated',
          'Normal perfusion scan essentially rules out PE',
          'Consider in pregnant patients'
        ],
        confidence: 0.88,
        category: 'critical',
        redFlagRelated: true
      });
    }
    
    // Chest X-ray as baseline
    recommendations.push({
      id: 'rec_cxr',
      studyCode: 'XR-CHEST-2V',
      studyName: 'Chest X-Ray 2 Views',
      modality: 'XRAY',
      priority: 'STAT',
      rationale: 'Baseline chest radiograph to evaluate for pneumothorax, pneumonia, cardiomegaly, or other acute thoracic pathology.',
      clinicalEvidence: [
        'Quick, low-cost initial evaluation',
        'May identify alternative diagnosis',
        'Helps interpret V/Q scan if ordered'
      ],
      confidence: 0.85,
      category: 'recommended'
    });
    
    // Echo for cardiac evaluation
    recommendations.push({
      id: 'rec_echo',
      studyCode: 'ECHO-TTE',
      studyName: 'Echocardiogram',
      modality: 'US',
      priority: 'ROUTINE',
      rationale: 'Transthoracic echocardiogram to evaluate cardiac function, wall motion abnormalities, pericardial effusion, and right heart strain.',
      clinicalEvidence: [
        'Evaluates for RV strain in PE',
        'Identifies wall motion abnormalities in ACS',
        'Detects pericardial effusion/tamponade'
      ],
      confidence: 0.75,
      category: 'recommended'
    });
    
    // LE venous duplex for DVT source
    recommendations.push({
      id: 'rec_le_venous',
      studyCode: 'US-LE-VENOUS',
      studyName: 'Lower Extremity Venous Duplex',
      modality: 'US',
      priority: 'ROUTINE',
      rationale: 'Consider lower extremity venous duplex to evaluate for DVT as source of pulmonary embolism.',
      clinicalEvidence: [
        'DVT found in 70% of PE patients',
        'Positive duplex may obviate need for CTA in some patients',
        'Important for treatment planning'
      ],
      confidence: 0.72,
      category: 'consider'
    });
  }
  
  // ==========================================================================
  // ABDOMINAL PAIN
  // ==========================================================================
  if (complaint.includes('abdominal') || complaint.includes('stomach') || complaint.includes('belly')) {
    // RUQ pain - gallbladder evaluation first
    if (complaint.includes('right') || complaint.includes('ruq')) {
      recommendations.push({
        id: 'rec_us_ruq',
        studyCode: 'US-RUQ',
        studyName: 'Ultrasound Right Upper Quadrant',
        modality: 'US',
        priority: 'STAT',
        rationale: 'First-line imaging for RUQ pain to evaluate gallbladder for stones, cholecystitis, and bile duct dilation.',
        clinicalEvidence: [
          'Sensitivity 84-97% for gallstones',
          'No radiation, no contrast needed',
          'Can identify sonographic Murphy sign'
        ],
        confidence: 0.95,
        category: 'critical'
      });
    }
    
    // General abdominal CT
    if (!hasContrastAllergy) {
      recommendations.push({
        id: 'rec_ct_abd_c',
        studyCode: 'CT-ABD-PELVIS-C',
        studyName: 'CT Abdomen/Pelvis with Contrast',
        modality: 'CT',
        priority: 'ROUTINE',
        rationale: 'Comprehensive CT evaluation for undifferentiated abdominal pain. IV contrast improves evaluation of solid organs and vascular structures.',
        clinicalEvidence: [
          'Gold standard for acute abdominal evaluation',
          'High sensitivity for appendicitis, diverticulitis',
          'Evaluates for bowel obstruction, ischemia'
        ],
        confidence: 0.88,
        category: 'recommended'
      });
    } else {
      recommendations.push({
        id: 'rec_ct_abd_nc',
        studyCode: 'CT-ABD-PELVIS-NC',
        studyName: 'CT Abdomen/Pelvis without Contrast',
        modality: 'CT',
        priority: 'ROUTINE',
        rationale: 'Non-contrast CT for abdominal evaluation given contrast allergy. Still useful for kidney stones, appendicitis, and many other pathologies.',
        clinicalEvidence: [
          'Excellent for urolithiasis (sensitivity 95-98%)',
          'Can identify appendicitis without contrast',
          'Detects free air, bowel obstruction'
        ],
        confidence: 0.85,
        category: 'recommended'
      });
    }
    
    // Abdominal ultrasound for general evaluation
    recommendations.push({
      id: 'rec_us_abd',
      studyCode: 'US-ABD-COMPLETE',
      studyName: 'Ultrasound Abdomen Complete',
      modality: 'US',
      priority: 'ROUTINE',
      rationale: 'Complete abdominal ultrasound for solid organ evaluation without radiation.',
      clinicalEvidence: [
        'No radiation exposure',
        'Good for liver, gallbladder, kidneys, spleen',
        'Limited bowel evaluation'
      ],
      confidence: 0.68,
      category: 'consider'
    });
  }
  
  // ==========================================================================
  // BACK PAIN
  // ==========================================================================
  if (complaint.includes('back pain') || complaint.includes('spine')) {
    recommendations.push({
      id: 'rec_mri_lspine',
      studyCode: 'MRI-LSPINE',
      studyName: 'MRI Lumbar Spine',
      modality: 'MRI',
      priority: 'ROUTINE',
      rationale: 'MRI is the gold standard for evaluating disc disease, spinal stenosis, and nerve root compression.',
      clinicalEvidence: [
        'Superior soft tissue contrast for disc evaluation',
        'Identifies nerve root compression',
        'No radiation exposure'
      ],
      confidence: 0.85,
      category: 'recommended'
    });
    
    recommendations.push({
      id: 'rec_xr_lspine',
      studyCode: 'XR-CSPINE',
      studyName: 'Lumbar Spine X-Ray',
      modality: 'XRAY',
      priority: 'ROUTINE',
      rationale: 'Plain radiographs for initial evaluation of alignment, fractures, and degenerative changes.',
      clinicalEvidence: [
        'Quick, low-cost initial evaluation',
        'Identifies fractures, spondylolisthesis',
        'Limited soft tissue evaluation'
      ],
      confidence: 0.65,
      category: 'consider'
    });
  }
  
  // Sort recommendations
  const categoryOrder = { 'critical': 0, 'recommended': 1, 'consider': 2, 'not-indicated': 3 };
  recommendations.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);
  
  return recommendations;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useImagingOrderingStore = create<ImagingOrderingState>()(
  devtools(
    immer((set, get) => ({
      patientContext: null,
      selectedStudies: new Map(),
      priority: 'ROUTINE',
      clinicalIndication: '',
      encounterId: null,
      aiRecommendations: [],
      isLoadingRecommendations: false,
      searchQuery: '',
      modalityFilter: 'all',
      loading: false,
      submitting: false,
      error: null,
      lastSubmittedOrderIds: [],

      setPatientContext: (context) => {
        set(state => {
          state.patientContext = context;
          if (context.chiefComplaint) {
            state.clinicalIndication = `Evaluation for: ${context.chiefComplaint}`;
          }
        });
        get().generateAIRecommendations();
      },

      addStudy: (studyCode, options = {}) => {
        const study = IMAGING_CATALOG[studyCode];
        if (!study) {
          console.warn(`Imaging study ${studyCode} not found in catalog`);
          return;
        }
        
        set(state => {
          state.selectedStudies.set(studyCode, {
            study,
            priority: options.priority || study.defaultPriority,
            aiRecommended: options.aiRecommended || false,
            rationale: options.rationale,
            clinicalHistory: options.clinicalHistory,
            laterality: options.laterality || 'none',
            contrast: options.contrast ?? study.contrast ?? false,
            specialInstructions: options.specialInstructions
          });
        });
      },

      removeStudy: (studyCode) => {
        set(state => {
          state.selectedStudies.delete(studyCode);
        });
      },

      updateStudyPriority: (studyCode, priority) => {
        set(state => {
          const study = state.selectedStudies.get(studyCode);
          if (study) {
            study.priority = priority;
          }
        });
      },

      updateStudyContrast: (studyCode, contrast) => {
        set(state => {
          const study = state.selectedStudies.get(studyCode);
          if (study) {
            study.contrast = contrast;
          }
        });
      },

      setGlobalPriority: (priority) => {
        set(state => {
          state.priority = priority;
          state.selectedStudies.forEach(study => {
            study.priority = priority;
          });
        });
      },

      setClinicalIndication: (indication) => set({ clinicalIndication: indication }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setModalityFilter: (modality) => set({ modalityFilter: modality }),

      generateAIRecommendations: async () => {
        const { patientContext } = get();
        if (!patientContext) return;
        
        set({ isLoadingRecommendations: true });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          const recommendations = await generateBioMistralImagingRecommendations(patientContext);
          set({ aiRecommendations: recommendations, isLoadingRecommendations: false });
        } catch (error) {
          console.error('Failed to generate imaging recommendations:', error);
          set({ isLoadingRecommendations: false, error: 'Failed to generate recommendations' });
        }
      },

      addAIRecommendedStudies: (category) => {
        const { aiRecommendations, addStudy } = get();
        aiRecommendations
          .filter(rec => rec.category === category)
          .forEach(rec => {
            addStudy(rec.studyCode, {
              priority: rec.priority,
              rationale: rec.rationale,
              aiRecommended: true
            });
          });
      },

      submitOrder: async (encounterId) => {
        const { selectedStudies, clinicalIndication } = get();
        
        if (selectedStudies.size === 0) {
          throw new Error('No imaging studies selected');
        }
        
        set({ submitting: true, error: null });
        
        try {
          const orderIds: string[] = [];
          
          for (const [code, selectedStudy] of selectedStudies.entries()) {
            const response = await fetch('/api/imaging', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                encounterId,
                studyType: selectedStudy.study.modality,
                studyName: selectedStudy.study.name,
                bodyPart: selectedStudy.study.bodyPart,
                laterality: selectedStudy.laterality,
                priority: selectedStudy.priority,
                indication: clinicalIndication,
                clinicalHistory: selectedStudy.clinicalHistory,
                contrast: selectedStudy.contrast,
                contrastType: selectedStudy.study.contrastType,
                specialInstructions: selectedStudy.specialInstructions
              })
            });
            
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to submit imaging order');
            }
            
            const result = await response.json();
            orderIds.push(result.id);
          }
          
          set(state => {
            state.submitting = false;
            state.lastSubmittedOrderIds = orderIds;
          });
          
          get().clearOrder();
          return orderIds;
        } catch (error) {
          set(state => {
            state.submitting = false;
            state.error = error instanceof Error ? error.message : 'Failed to submit order';
          });
          throw error;
        }
      },

      clearOrder: () => set(state => {
        state.selectedStudies = new Map();
        state.priority = 'ROUTINE';
        state.clinicalIndication = '';
        state.error = null;
      }),

      getSelectedStudiesArray: () => Array.from(get().selectedStudies.values()),

      getFilteredCatalog: () => {
        const { searchQuery, modalityFilter } = get();
        const query = searchQuery.toLowerCase();
        
        return Object.values(IMAGING_CATALOG).filter(study => {
          if (modalityFilter !== 'all' && study.modality !== modalityFilter) return false;
          if (query) {
            return (
              study.code.toLowerCase().includes(query) ||
              study.name.toLowerCase().includes(query) ||
              study.description.toLowerCase().includes(query) ||
              study.bodyPart.toLowerCase().includes(query)
            );
          }
          return true;
        });
      },

      getTotalCost: () => {
        return get().getSelectedStudiesArray().reduce((sum, s) => sum + s.study.cost, 0);
      },

      getStatCount: () => {
        return get().getSelectedStudiesArray().filter(s => s.priority === 'STAT').length;
      },

      hasContrastStudies: () => {
        return get().getSelectedStudiesArray().some(s => s.contrast);
      },

      getRadiationTotal: () => {
        const studies = get().getSelectedStudiesArray();
        const totalMsv = studies.reduce((sum, s) => {
          const dose = s.study.radiationDose;
          if (dose) {
            const value = parseFloat(dose.replace(' mSv', ''));
            return sum + (isNaN(value) ? 0 : value);
          }
          return sum;
        }, 0);
        return `${totalMsv.toFixed(1)} mSv`;
      }
    })),
    { name: 'imaging-ordering-store' }
  )
);

export default useImagingOrderingStore;
