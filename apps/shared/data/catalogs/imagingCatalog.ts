// ============================================================
// Imaging Catalog - Centralized Imaging Study Database
// apps/shared/data/catalogs/imagingCatalog.ts
//
// Comprehensive imaging catalog with CPT codes and modality info
// ============================================================

import type { OrderPriority } from '../../stores/types';

// =============================================================================
// Types
// =============================================================================

export type ImagingModality = 'CT' | 'MRI' | 'XRAY' | 'US' | 'NM' | 'FLUORO' | 'MAMMO' | 'DEXA';

export interface ImagingStudy {
  code: string;
  name: string;
  description: string;
  modality: ImagingModality;
  category: string;
  bodyPart: string;
  defaultPriority: OrderPriority;
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

// =============================================================================
// Imaging Catalog
// =============================================================================

export const IMAGING_CATALOG: Record<string, ImagingStudy> = {
  // ---------------------------------------------------------------------------
  // CT Studies
  // ---------------------------------------------------------------------------
  'CT-HEAD-NC': {
    code: 'CT-HEAD-NC',
    name: 'CT Head without Contrast',
    description: 'Non-contrast CT for acute intracranial pathology, hemorrhage, stroke',
    modality: 'CT',
    category: 'neuro',
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
    description: 'Contrast-enhanced CT for tumor, infection, inflammation',
    modality: 'CT',
    category: 'neuro',
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
    description: 'CT angiography for vascular abnormalities, aneurysm, dissection',
    modality: 'CT',
    category: 'neuro',
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
    name: 'CT Cervical Spine',
    description: 'Evaluation for cervical fractures, degenerative changes',
    modality: 'CT',
    category: 'spine',
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
    description: 'Evaluate pulmonary parenchyma, nodules, interstitial disease',
    modality: 'CT',
    category: 'chest',
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
    category: 'chest',
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
    category: 'abdomen',
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
    description: 'Non-contrast CT for kidney stones, appendicitis',
    modality: 'CT',
    category: 'abdomen',
    bodyPart: 'Abdomen/Pelvis',
    defaultPriority: 'ROUTINE',
    cost: 600,
    durationMinutes: 15,
    radiationDose: '10 mSv',
    contrast: false,
    turnaroundHours: 4,
    cptCode: '74176'
  },

  // ---------------------------------------------------------------------------
  // MRI Studies
  // ---------------------------------------------------------------------------
  'MRI-BRAIN-NC': {
    code: 'MRI-BRAIN-NC',
    name: 'MRI Brain without Contrast',
    description: 'High-resolution brain imaging for stroke, tumor, MS',
    modality: 'MRI',
    category: 'neuro',
    bodyPart: 'Brain',
    defaultPriority: 'ROUTINE',
    cost: 800,
    durationMinutes: 30,
    contrast: false,
    turnaroundHours: 24,
    contraindications: ['Pacemaker', 'Cochlear implant', 'Metallic implants'],
    cptCode: '70551'
  },
  'MRI-BRAIN-C': {
    code: 'MRI-BRAIN-C',
    name: 'MRI Brain with and without Contrast',
    description: 'MRI with gadolinium for tumor, infection, inflammation',
    modality: 'MRI',
    category: 'neuro',
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
    category: 'neuro',
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
    description: 'Magnetic resonance venography for cerebral venous thrombosis',
    modality: 'MRI',
    category: 'neuro',
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
    name: 'MRI Cervical Spine',
    description: 'Evaluate cervical disc disease, stenosis, cord abnormalities',
    modality: 'MRI',
    category: 'spine',
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
    name: 'MRI Lumbar Spine',
    description: 'Evaluate lumbar disc disease, stenosis, nerve compression',
    modality: 'MRI',
    category: 'spine',
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
    name: 'MRI Knee',
    description: 'Evaluate meniscal tears, ligament injury, cartilage damage',
    modality: 'MRI',
    category: 'msk',
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
    name: 'MRI Shoulder',
    description: 'Evaluate rotator cuff, labral tears, joint pathology',
    modality: 'MRI',
    category: 'msk',
    bodyPart: 'Shoulder',
    defaultPriority: 'ROUTINE',
    cost: 750,
    durationMinutes: 30,
    contrast: false,
    turnaroundHours: 48,
    cptCode: '73221'
  },

  // ---------------------------------------------------------------------------
  // X-Ray Studies
  // ---------------------------------------------------------------------------
  'XR-CHEST-2V': {
    code: 'XR-CHEST-2V',
    name: 'Chest X-Ray 2 Views',
    description: 'PA and lateral chest radiograph',
    modality: 'XRAY',
    category: 'chest',
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
    description: 'Cervical spine radiographs',
    modality: 'XRAY',
    category: 'spine',
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
    description: 'KUB for bowel gas pattern, free air',
    modality: 'XRAY',
    category: 'abdomen',
    bodyPart: 'Abdomen',
    defaultPriority: 'ROUTINE',
    cost: 75,
    durationMinutes: 10,
    radiationDose: '0.7 mSv',
    contrast: false,
    turnaroundHours: 2,
    cptCode: '74018'
  },

  // ---------------------------------------------------------------------------
  // Ultrasound Studies
  // ---------------------------------------------------------------------------
  'US-ABD-COMPLETE': {
    code: 'US-ABD-COMPLETE',
    name: 'Ultrasound Abdomen Complete',
    description: 'Comprehensive ultrasound of abdominal organs',
    modality: 'US',
    category: 'abdomen',
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
    description: 'Focused evaluation of gallbladder, liver, bile ducts',
    modality: 'US',
    category: 'abdomen',
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
    category: 'abdomen',
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
    description: 'Pelvic ultrasound for ovaries, uterus, bladder',
    modality: 'US',
    category: 'pelvis',
    bodyPart: 'Pelvis',
    defaultPriority: 'ROUTINE',
    cost: 280,
    durationMinutes: 25,
    contrast: false,
    turnaroundHours: 4,
    cptCode: '76856'
  },
  'US-LE-VENOUS': {
    code: 'US-LE-VENOUS',
    name: 'Lower Extremity Venous Duplex',
    description: 'Deep venous thrombosis (DVT) evaluation',
    modality: 'US',
    category: 'vascular',
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
    category: 'vascular',
    bodyPart: 'Neck',
    defaultPriority: 'ROUTINE',
    cost: 350,
    durationMinutes: 30,
    contrast: false,
    turnaroundHours: 24,
    cptCode: '93880'
  },
  'ECHO-TTE': {
    code: 'ECHO-TTE',
    name: 'Echocardiogram (TTE)',
    description: 'Transthoracic echocardiogram for cardiac function',
    modality: 'US',
    category: 'cardiac',
    bodyPart: 'Heart',
    defaultPriority: 'ROUTINE',
    cost: 400,
    durationMinutes: 45,
    contrast: false,
    turnaroundHours: 24,
    cptCode: '93306'
  },

  // ---------------------------------------------------------------------------
  // Nuclear Medicine
  // ---------------------------------------------------------------------------
  'NM-VQ': {
    code: 'NM-VQ',
    name: 'V/Q Scan',
    description: 'Ventilation/perfusion scan for PE when CT contraindicated',
    modality: 'NM',
    category: 'chest',
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
    description: 'Evaluate for metastatic disease, occult fractures',
    modality: 'NM',
    category: 'msk',
    bodyPart: 'Whole Body',
    defaultPriority: 'ROUTINE',
    cost: 600,
    durationMinutes: 180,
    radiationDose: '6 mSv',
    contrast: false,
    turnaroundHours: 24,
    cptCode: '78306'
  },

  // ---------------------------------------------------------------------------
  // DEXA
  // ---------------------------------------------------------------------------
  'DEXA': {
    code: 'DEXA',
    name: 'DEXA Bone Density',
    description: 'Bone mineral density for osteoporosis screening',
    modality: 'DEXA',
    category: 'msk',
    bodyPart: 'Spine/Hip',
    defaultPriority: 'ROUTINE',
    cost: 150,
    durationMinutes: 15,
    radiationDose: '0.001 mSv',
    contrast: false,
    turnaroundHours: 24,
    cptCode: '77080'
  },

  // ---------------------------------------------------------------------------
  // Mammography
  // ---------------------------------------------------------------------------
  'MAMMO-SCREEN': {
    code: 'MAMMO-SCREEN',
    name: 'Screening Mammogram',
    description: 'Bilateral screening mammography',
    modality: 'MAMMO',
    category: 'breast',
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
    category: 'breast',
    bodyPart: 'Breast',
    defaultPriority: 'ROUTINE',
    cost: 250,
    durationMinutes: 30,
    radiationDose: '0.4 mSv',
    contrast: false,
    turnaroundHours: 24,
    cptCode: '77066'
  },
};

export default IMAGING_CATALOG;
