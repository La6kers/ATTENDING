// ============================================================
// Imaging Studies Catalog
// apps/shared/catalogs/imaging.ts
//
// Comprehensive imaging study database - extracted from stores
// ============================================================

import type { ImagingStudy, ImagingModality } from './types';

// =============================================================================
// Imaging Studies Database
// =============================================================================

export const IMAGING_CATALOG: Record<string, ImagingStudy> = {
  // CT STUDIES
  'CT-HEAD-NC': {
    code: 'CT-HEAD-NC', name: 'CT Head without Contrast',
    description: 'Non-contrast CT for acute intracranial pathology, hemorrhage, stroke',
    modality: 'CT', bodyPart: 'Head', defaultPriority: 'STAT',
    cost: 450, durationMinutes: 15, radiationDose: '2 mSv',
    contrast: false, turnaroundHours: 1, cptCode: '70450'
  },
  'CT-HEAD-C': {
    code: 'CT-HEAD-C', name: 'CT Head with Contrast',
    description: 'Contrast-enhanced CT for tumor, infection, inflammatory conditions',
    modality: 'CT', bodyPart: 'Head', defaultPriority: 'ROUTINE',
    cost: 550, durationMinutes: 20, radiationDose: '2 mSv',
    contrast: true, contrastType: 'IV Iodinated', turnaroundHours: 4,
    contraindications: ['Contrast allergy', 'Renal insufficiency (GFR <30)'], cptCode: '70460'
  },
  'CTA-HEAD-NECK': {
    code: 'CTA-HEAD-NECK', name: 'CTA Head and Neck',
    description: 'CT angiography for vascular abnormalities, aneurysms, dissection',
    modality: 'CT', bodyPart: 'Head/Neck', defaultPriority: 'URGENT',
    cost: 750, durationMinutes: 20, radiationDose: '4 mSv',
    contrast: true, contrastType: 'IV Iodinated', turnaroundHours: 2,
    contraindications: ['Contrast allergy', 'Renal insufficiency (GFR <30)'], cptCode: '70496'
  },
  'CT-CSPINE': {
    code: 'CT-CSPINE', name: 'CT Cervical Spine',
    description: 'Cervical spine fractures, degenerative changes, bony abnormalities',
    modality: 'CT', bodyPart: 'Cervical Spine', defaultPriority: 'ROUTINE',
    cost: 400, durationMinutes: 15, radiationDose: '3 mSv',
    contrast: false, turnaroundHours: 4, cptCode: '72125'
  },
  'CT-CHEST-NC': {
    code: 'CT-CHEST-NC', name: 'CT Chest without Contrast',
    description: 'Pulmonary parenchyma, nodules, interstitial lung disease',
    modality: 'CT', bodyPart: 'Chest', defaultPriority: 'ROUTINE',
    cost: 400, durationMinutes: 15, radiationDose: '7 mSv',
    contrast: false, turnaroundHours: 4, cptCode: '71250'
  },
  'CT-CHEST-PE': {
    code: 'CT-CHEST-PE', name: 'CT Chest PE Protocol',
    description: 'CT angiography for pulmonary embolism evaluation',
    modality: 'CT', bodyPart: 'Chest', defaultPriority: 'STAT',
    cost: 650, durationMinutes: 15, radiationDose: '8 mSv',
    contrast: true, contrastType: 'IV Iodinated', turnaroundHours: 1,
    contraindications: ['Contrast allergy', 'Renal insufficiency (GFR <30)'], cptCode: '71275'
  },
  'CT-ABD-PELVIS-C': {
    code: 'CT-ABD-PELVIS-C', name: 'CT Abdomen/Pelvis with Contrast',
    description: 'Comprehensive abdominal evaluation with IV contrast',
    modality: 'CT', bodyPart: 'Abdomen/Pelvis', defaultPriority: 'ROUTINE',
    cost: 750, durationMinutes: 20, radiationDose: '10 mSv',
    contrast: true, contrastType: 'IV Iodinated', turnaroundHours: 4,
    contraindications: ['Contrast allergy', 'Renal insufficiency (GFR <30)'],
    preparation: 'Oral contrast 1 hour prior if available', cptCode: '74177'
  },
  'CT-ABD-PELVIS-NC': {
    code: 'CT-ABD-PELVIS-NC', name: 'CT Abdomen/Pelvis without Contrast',
    description: 'Non-contrast CT for kidney stones, appendicitis',
    modality: 'CT', bodyPart: 'Abdomen/Pelvis', defaultPriority: 'ROUTINE',
    cost: 600, durationMinutes: 15, radiationDose: '10 mSv',
    contrast: false, turnaroundHours: 4, cptCode: '74176'
  },

  // MRI STUDIES
  'MRI-BRAIN-NC': {
    code: 'MRI-BRAIN-NC', name: 'MRI Brain without Contrast',
    description: 'High-resolution brain imaging for stroke, tumor, MS',
    modality: 'MRI', bodyPart: 'Brain', defaultPriority: 'ROUTINE',
    cost: 800, durationMinutes: 30, contrast: false, turnaroundHours: 24,
    contraindications: ['Pacemaker', 'Cochlear implant', 'Metallic implants'], cptCode: '70551'
  },
  'MRI-BRAIN-C': {
    code: 'MRI-BRAIN-C', name: 'MRI Brain with/without Contrast',
    description: 'MRI with gadolinium for tumor, infection, inflammation',
    modality: 'MRI', bodyPart: 'Brain', defaultPriority: 'URGENT',
    cost: 950, durationMinutes: 45, contrast: true, contrastType: 'Gadolinium',
    turnaroundHours: 4,
    contraindications: ['Pacemaker', 'Severe renal impairment (GFR <30)', 'Gadolinium allergy'],
    cptCode: '70553'
  },
  'MRA-BRAIN': {
    code: 'MRA-BRAIN', name: 'MRA Brain',
    description: 'MR angiography of cerebral vasculature',
    modality: 'MRI', bodyPart: 'Brain', defaultPriority: 'ROUTINE',
    cost: 850, durationMinutes: 30, contrast: false, turnaroundHours: 24, cptCode: '70544'
  },
  'MRV-BRAIN': {
    code: 'MRV-BRAIN', name: 'MRV Brain',
    description: 'MR venography for cerebral venous thrombosis',
    modality: 'MRI', bodyPart: 'Brain', defaultPriority: 'ROUTINE',
    cost: 650, durationMinutes: 30, contrast: false, turnaroundHours: 24, cptCode: '70546'
  },
  'MRI-CSPINE': {
    code: 'MRI-CSPINE', name: 'MRI Cervical Spine',
    description: 'Cervical disc disease, spinal stenosis, cord abnormalities',
    modality: 'MRI', bodyPart: 'Cervical Spine', defaultPriority: 'ROUTINE',
    cost: 850, durationMinutes: 30, contrast: false, turnaroundHours: 24, cptCode: '72141'
  },
  'MRI-TSPINE': {
    code: 'MRI-TSPINE', name: 'MRI Thoracic Spine',
    description: 'Thoracic disc disease, cord compression',
    modality: 'MRI', bodyPart: 'Thoracic Spine', defaultPriority: 'ROUTINE',
    cost: 850, durationMinutes: 30, contrast: false, turnaroundHours: 24, cptCode: '72146'
  },
  'MRI-LSPINE': {
    code: 'MRI-LSPINE', name: 'MRI Lumbar Spine',
    description: 'Lumbar disc disease, stenosis, nerve compression',
    modality: 'MRI', bodyPart: 'Lumbar Spine', defaultPriority: 'ROUTINE',
    cost: 850, durationMinutes: 30, contrast: false, turnaroundHours: 24, cptCode: '72148'
  },
  'MRI-KNEE': {
    code: 'MRI-KNEE', name: 'MRI Knee',
    description: 'Meniscal tears, ligament injury, cartilage damage',
    modality: 'MRI', bodyPart: 'Knee', defaultPriority: 'ROUTINE',
    cost: 700, durationMinutes: 30, contrast: false, turnaroundHours: 48, cptCode: '73721'
  },
  'MRI-SHOULDER': {
    code: 'MRI-SHOULDER', name: 'MRI Shoulder',
    description: 'Rotator cuff, labral tears, joint pathology',
    modality: 'MRI', bodyPart: 'Shoulder', defaultPriority: 'ROUTINE',
    cost: 750, durationMinutes: 30, contrast: false, turnaroundHours: 48, cptCode: '73221'
  },

  // X-RAY STUDIES
  'XR-CHEST-2V': {
    code: 'XR-CHEST-2V', name: 'Chest X-Ray 2 Views',
    description: 'PA and lateral chest for pulmonary/cardiac evaluation',
    modality: 'XRAY', bodyPart: 'Chest', defaultPriority: 'ROUTINE',
    cost: 80, durationMinutes: 10, radiationDose: '0.1 mSv',
    contrast: false, turnaroundHours: 2, cptCode: '71046'
  },
  'XR-CHEST-1V': {
    code: 'XR-CHEST-1V', name: 'Chest X-Ray Single View',
    description: 'Portable chest radiograph',
    modality: 'XRAY', bodyPart: 'Chest', defaultPriority: 'STAT',
    cost: 60, durationMinutes: 5, radiationDose: '0.05 mSv',
    contrast: false, turnaroundHours: 1, cptCode: '71045'
  },
  'XR-CSPINE': {
    code: 'XR-CSPINE', name: 'Cervical Spine X-Ray',
    description: 'Cervical spine alignment and degenerative changes',
    modality: 'XRAY', bodyPart: 'Cervical Spine', defaultPriority: 'ROUTINE',
    cost: 100, durationMinutes: 15, radiationDose: '0.2 mSv',
    contrast: false, turnaroundHours: 2, cptCode: '72052'
  },
  'XR-ABDOMEN': {
    code: 'XR-ABDOMEN', name: 'Abdominal X-Ray (KUB)',
    description: 'Bowel gas pattern, free air, calcifications',
    modality: 'XRAY', bodyPart: 'Abdomen', defaultPriority: 'ROUTINE',
    cost: 75, durationMinutes: 10, radiationDose: '0.7 mSv',
    contrast: false, turnaroundHours: 2, cptCode: '74018'
  },
  'XR-HAND': {
    code: 'XR-HAND', name: 'Hand X-Ray',
    description: 'Hand/finger fractures, arthritis',
    modality: 'XRAY', bodyPart: 'Hand', defaultPriority: 'ROUTINE',
    cost: 70, durationMinutes: 10, radiationDose: '0.001 mSv',
    contrast: false, turnaroundHours: 2, cptCode: '73130'
  },
  'XR-FOOT': {
    code: 'XR-FOOT', name: 'Foot X-Ray',
    description: 'Foot fractures, arthritis',
    modality: 'XRAY', bodyPart: 'Foot', defaultPriority: 'ROUTINE',
    cost: 70, durationMinutes: 10, radiationDose: '0.001 mSv',
    contrast: false, turnaroundHours: 2, cptCode: '73630'
  },

  // ULTRASOUND STUDIES
  'US-ABD-COMPLETE': {
    code: 'US-ABD-COMPLETE', name: 'Ultrasound Abdomen Complete',
    description: 'Liver, gallbladder, pancreas, spleen, kidneys',
    modality: 'US', bodyPart: 'Abdomen', defaultPriority: 'ROUTINE',
    cost: 300, durationMinutes: 30, contrast: false, turnaroundHours: 4, cptCode: '76700'
  },
  'US-RUQ': {
    code: 'US-RUQ', name: 'Ultrasound Right Upper Quadrant',
    description: 'Focused gallbladder, liver, bile ducts',
    modality: 'US', bodyPart: 'Abdomen', defaultPriority: 'STAT',
    cost: 200, durationMinutes: 20, contrast: false, turnaroundHours: 2, cptCode: '76705'
  },
  'US-RENAL': {
    code: 'US-RENAL', name: 'Ultrasound Kidneys',
    description: 'Hydronephrosis, stones, masses',
    modality: 'US', bodyPart: 'Kidneys', defaultPriority: 'ROUTINE',
    cost: 250, durationMinutes: 20, contrast: false, turnaroundHours: 4, cptCode: '76770'
  },
  'US-PELVIS': {
    code: 'US-PELVIS', name: 'Ultrasound Pelvis',
    description: 'Ovaries, uterus, bladder evaluation',
    modality: 'US', bodyPart: 'Pelvis', defaultPriority: 'ROUTINE',
    cost: 280, durationMinutes: 25, contrast: false, turnaroundHours: 4, cptCode: '76856'
  },
  'US-THYROID': {
    code: 'US-THYROID', name: 'Ultrasound Thyroid',
    description: 'Thyroid nodules, enlargement, vascularity',
    modality: 'US', bodyPart: 'Thyroid', defaultPriority: 'ROUTINE',
    cost: 250, durationMinutes: 20, contrast: false, turnaroundHours: 24, cptCode: '76536'
  },
  'US-LE-VENOUS': {
    code: 'US-LE-VENOUS', name: 'Lower Extremity Venous Duplex',
    description: 'Deep venous thrombosis (DVT) evaluation',
    modality: 'US', bodyPart: 'Lower Extremity', defaultPriority: 'STAT',
    cost: 350, durationMinutes: 30, contrast: false, turnaroundHours: 2, cptCode: '93970'
  },
  'US-CAROTID': {
    code: 'US-CAROTID', name: 'Carotid Ultrasound Duplex',
    description: 'Carotid artery stenosis and plaque',
    modality: 'US', bodyPart: 'Neck', defaultPriority: 'ROUTINE',
    cost: 350, durationMinutes: 30, contrast: false, turnaroundHours: 24, cptCode: '93880'
  },
  'ECHO-TTE': {
    code: 'ECHO-TTE', name: 'Echocardiogram (TTE)',
    description: 'Transthoracic echo for cardiac function',
    modality: 'US', bodyPart: 'Heart', defaultPriority: 'ROUTINE',
    cost: 400, durationMinutes: 45, contrast: false, turnaroundHours: 24, cptCode: '93306'
  },

  // NUCLEAR MEDICINE
  'NM-VQ': {
    code: 'NM-VQ', name: 'V/Q Scan',
    description: 'Ventilation/perfusion for PE when CT contraindicated',
    modality: 'NM', bodyPart: 'Chest', defaultPriority: 'STAT',
    cost: 600, durationMinutes: 60, radiationDose: '2 mSv',
    contrast: false, turnaroundHours: 4, cptCode: '78582'
  },
  'NM-BONE': {
    code: 'NM-BONE', name: 'Bone Scan',
    description: 'Metastatic disease, occult fractures, osteomyelitis',
    modality: 'NM', bodyPart: 'Whole Body', defaultPriority: 'ROUTINE',
    cost: 600, durationMinutes: 180, radiationDose: '6 mSv',
    contrast: false, turnaroundHours: 24, cptCode: '78306'
  },

  // DEXA / MAMMOGRAPHY
  'DEXA': {
    code: 'DEXA', name: 'DEXA Bone Density',
    description: 'Bone mineral density for osteoporosis',
    modality: 'DEXA', bodyPart: 'Spine/Hip', defaultPriority: 'ROUTINE',
    cost: 150, durationMinutes: 15, radiationDose: '0.001 mSv',
    contrast: false, turnaroundHours: 24, cptCode: '77080'
  },
  'MAMMO-SCREEN': {
    code: 'MAMMO-SCREEN', name: 'Screening Mammogram',
    description: 'Bilateral screening for breast cancer',
    modality: 'MAMMO', bodyPart: 'Breast', defaultPriority: 'ROUTINE',
    cost: 200, durationMinutes: 20, radiationDose: '0.4 mSv',
    contrast: false, turnaroundHours: 48, cptCode: '77067'
  },
  'MAMMO-DIAG': {
    code: 'MAMMO-DIAG', name: 'Diagnostic Mammogram',
    description: 'Diagnostic mammography for symptomatic evaluation',
    modality: 'MAMMO', bodyPart: 'Breast', defaultPriority: 'ROUTINE',
    cost: 250, durationMinutes: 30, radiationDose: '0.4 mSv',
    contrast: false, turnaroundHours: 24, cptCode: '77066'
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

export function getImagingStudy(code: string): ImagingStudy | undefined {
  return IMAGING_CATALOG[code];
}

export function searchImaging(query: string): ImagingStudy[] {
  const q = query.toLowerCase();
  return Object.values(IMAGING_CATALOG).filter(study =>
    study.code.toLowerCase().includes(q) ||
    study.name.toLowerCase().includes(q) ||
    study.description.toLowerCase().includes(q) ||
    study.bodyPart.toLowerCase().includes(q)
  );
}

export function getImagingByModality(modality: ImagingModality): ImagingStudy[] {
  return Object.values(IMAGING_CATALOG).filter(study => study.modality === modality);
}

export function getImagingByBodyPart(bodyPart: string): ImagingStudy[] {
  const bp = bodyPart.toLowerCase();
  return Object.values(IMAGING_CATALOG).filter(study => 
    study.bodyPart.toLowerCase().includes(bp)
  );
}

export function getAllImagingStudies(): ImagingStudy[] {
  return Object.values(IMAGING_CATALOG);
}

export function getContrastStudies(): ImagingStudy[] {
  return Object.values(IMAGING_CATALOG).filter(study => study.contrast);
}

export function getNonContrastAlternative(code: string): ImagingStudy | undefined {
  const study = IMAGING_CATALOG[code];
  if (!study || !study.contrast) return undefined;
  
  // Try to find non-contrast version
  const ncCode = code.replace('-C', '-NC');
  return IMAGING_CATALOG[ncCode];
}
