// =============================================================================
// ATTENDING AI - Imaging Results AI Agent Service
// apps/provider-portal/lib/services/imagingAIAgent.ts
//
// AI agent for analyzing imaging results, providing interpretations,
// suggesting follow-up studies, and drafting patient communications.
// =============================================================================

export type ImagingModality = 'xray' | 'ct' | 'mri' | 'ultrasound' | 'nuclear' | 'mammogram';
export type FindingSeverity = 'normal' | 'mild' | 'moderate' | 'significant' | 'critical';

export interface ImagingResult {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  mrn: string;
  studyType: string;
  modality: ImagingModality;
  bodyPart: string;
  orderedDate: string;
  resultDate: string;
  orderingProvider: string;
  radiologist: string;
  indication: string;
  findings: string;
  impression: string;
  severity: FindingSeverity;
  reviewed: boolean;
  hasAbnormalities: boolean;
  priorStudies?: string[];
}

export interface ImagingDxSuggestion {
  suggestedDiagnosis: string;
  icdCode: string;
  confidence: number;
  basis: string;
  supportingFindings: string[];
  differentials: { diagnosis: string; icdCode: string; reasoning: string }[];
  codingNote: string;
}

export interface ImagingAIAnalysis {
  summary: string;
  keyFindings: AIFinding[];
  clinicalCorrelation: string;
  followUpRecommendations: FollowUpStudy[];
  patientMessage: string;
  addendumDraft: string;
  comparisonNotes?: string;
  dxSuggestions: ImagingDxSuggestion[];
}

export interface AIFinding {
  finding: string;
  severity: FindingSeverity;
  explanation: string;
  clinicalSignificance: string;
  possibleCauses: string[];
  recommendedActions: string[];
  detailedExplanation?: string;
}

export interface FollowUpStudy {
  study: string;
  modality: ImagingModality;
  timeframe: string;
  rationale: string;
  priority: 'routine' | 'urgent' | 'stat';
  selected?: boolean;
}

// Mock data for imaging results
export const MOCK_IMAGING_RESULTS: ImagingResult[] = [
  {
    id: 'img-r-001',
    patientName: 'Margaret Williams',
    patientAge: 68,
    patientGender: 'Female',
    mrn: 'MRN-4401',
    studyType: 'CT Chest with Contrast',
    modality: 'ct',
    bodyPart: 'Chest',
    orderedDate: '2026-03-01',
    resultDate: '2026-03-03',
    orderingProvider: 'Dr. Thomas Reed',
    radiologist: 'Dr. James Park',
    indication: 'Persistent cough, weight loss, 40 pack-year smoking history',
    findings: 'A 2.3 cm spiculated pulmonary nodule in the right upper lobe. Mediastinal lymphadenopathy with largest node measuring 1.8 cm. No pleural effusion. Heart size normal. No osseous abnormalities.',
    impression: '1. Suspicious 2.3 cm RUL spiculated nodule - recommend tissue sampling. 2. Mediastinal lymphadenopathy concerning for metastatic disease. Recommend PET/CT for staging.',
    severity: 'critical',
    reviewed: false,
    hasAbnormalities: true,
    priorStudies: ['CXR 2026-01-15 - 1.5cm RUL opacity noted'],
  },
  {
    id: 'img-r-002',
    patientName: 'Robert Chen',
    patientAge: 55,
    patientGender: 'Male',
    mrn: 'MRN-4402',
    studyType: 'MRI Brain without Contrast',
    modality: 'mri',
    bodyPart: 'Brain',
    orderedDate: '2026-03-02',
    resultDate: '2026-03-04',
    orderingProvider: 'Dr. Thomas Reed',
    radiologist: 'Dr. Lisa Wang',
    indication: 'New onset headaches, visual disturbances',
    findings: 'No intracranial mass, hemorrhage, or acute infarct. Mild periventricular white matter changes, nonspecific but consistent with chronic microvascular disease. Ventricles and sulci are age-appropriate. No midline shift.',
    impression: '1. No acute intracranial abnormality. 2. Mild nonspecific white matter changes likely related to chronic microvascular disease. Clinical correlation recommended.',
    severity: 'mild',
    reviewed: false,
    hasAbnormalities: true,
  },
  {
    id: 'img-r-003',
    patientName: 'Sarah Martinez',
    patientAge: 34,
    patientGender: 'Female',
    mrn: 'MRN-4403',
    studyType: 'Ultrasound Thyroid',
    modality: 'ultrasound',
    bodyPart: 'Thyroid',
    orderedDate: '2026-02-28',
    resultDate: '2026-03-02',
    orderingProvider: 'Dr. Thomas Reed',
    radiologist: 'Dr. Karen Lee',
    indication: 'Palpable thyroid nodule, elevated TSH',
    findings: 'Right thyroid lobe contains a 1.2 cm solid hypoechoic nodule with irregular margins and microcalcifications. TI-RADS 5. Left lobe is unremarkable. No cervical lymphadenopathy.',
    impression: '1. Suspicious 1.2 cm right thyroid nodule (TI-RADS 5). FNA biopsy is recommended. 2. No lymphadenopathy.',
    severity: 'significant',
    reviewed: false,
    hasAbnormalities: true,
  },
  {
    id: 'img-r-004',
    patientName: 'James Peterson',
    patientAge: 72,
    patientGender: 'Male',
    mrn: 'MRN-4404',
    studyType: 'X-Ray Chest PA/Lateral',
    modality: 'xray',
    bodyPart: 'Chest',
    orderedDate: '2026-03-03',
    resultDate: '2026-03-03',
    orderingProvider: 'Dr. Thomas Reed',
    radiologist: 'Dr. James Park',
    indication: 'Pre-operative clearance, history of COPD',
    findings: 'Lungs are hyperinflated consistent with COPD. No acute infiltrate or effusion. Heart size is at the upper limits of normal. Aortic calcifications noted. No pneumothorax.',
    impression: '1. Chronic changes of COPD without acute process. 2. Borderline cardiomegaly - consider echocardiogram if not recently performed.',
    severity: 'mild',
    reviewed: true,
    hasAbnormalities: true,
  },
  {
    id: 'img-r-005',
    patientName: 'Dorothy Clark',
    patientAge: 81,
    patientGender: 'Female',
    mrn: 'MRN-4405',
    studyType: 'X-Ray Left Hip',
    modality: 'xray',
    bodyPart: 'Left Hip',
    orderedDate: '2026-03-04',
    resultDate: '2026-03-04',
    orderingProvider: 'Dr. Thomas Reed',
    radiologist: 'Dr. Lisa Wang',
    indication: 'Fall at home, left hip pain',
    findings: 'Nondisplaced subcapital fracture of the left femoral neck. Moderate osteoporotic changes. No associated dislocation. Degenerative changes at the hip joint.',
    impression: '1. Nondisplaced left femoral neck fracture - orthopedic consultation recommended. 2. Osteoporosis.',
    severity: 'critical',
    reviewed: false,
    hasAbnormalities: true,
  },
  {
    id: 'img-r-006',
    patientName: 'Kevin Martinez',
    patientAge: 28,
    patientGender: 'Male',
    mrn: 'MRN-4406',
    studyType: 'X-Ray Chest PA',
    modality: 'xray',
    bodyPart: 'Chest',
    orderedDate: '2026-03-05',
    resultDate: '2026-03-05',
    orderingProvider: 'Dr. Thomas Reed',
    radiologist: 'Dr. Karen Lee',
    indication: 'New patient, baseline chest x-ray',
    findings: 'Heart size normal. Lungs are clear bilaterally. No pleural effusion or pneumothorax. Mediastinal contour is normal. No osseous abnormalities.',
    impression: 'Normal chest radiograph. No acute cardiopulmonary process.',
    severity: 'normal',
    reviewed: true,
    hasAbnormalities: false,
  },
];

export function generateImagingAIAnalysis(result: ImagingResult): ImagingAIAnalysis {
  // Simulated AI analysis based on findings
  const analyses: Record<string, ImagingAIAnalysis> = {
    'img-r-001': {
      summary: 'CT chest reveals a suspicious spiculated pulmonary nodule with associated lymphadenopathy. Given the patient\'s smoking history, this is highly concerning for primary lung malignancy with possible mediastinal metastasis.',
      keyFindings: [
        {
          finding: '2.3 cm spiculated RUL nodule',
          severity: 'critical',
          explanation: 'A spiculated (irregular, star-shaped border) lung nodule of this size is suspicious for lung cancer, especially with smoking history.',
          clinicalSignificance: 'Lung-RADS 4B - suspicious. The nodule has grown from 1.5 cm on prior CXR (Jan 2026), suggesting active growth.',
          possibleCauses: ['Primary lung carcinoma (most likely)', 'Metastatic disease', 'Granuloma (less likely given morphology)'],
          recommendedActions: ['PET/CT for staging', 'CT-guided biopsy or bronchoscopy', 'Pulmonology referral', 'Multidisciplinary tumor board'],
          detailedExplanation: 'Spiculated nodules have radiating lines extending from their margins, which is a hallmark of malignancy. The nodule has increased 0.8 cm in approximately 6 weeks, suggesting a doubling time consistent with malignancy.',
        },
        {
          finding: 'Mediastinal lymphadenopathy (1.8 cm)',
          severity: 'significant',
          explanation: 'Enlarged lymph nodes in the center of the chest may indicate spread of cancer from the lung nodule.',
          clinicalSignificance: 'If malignant, suggests at least Stage IIIA disease. Tissue sampling of lymph nodes is important for staging.',
          possibleCauses: ['Metastatic spread from lung nodule', 'Reactive/inflammatory', 'Sarcoidosis'],
          recommendedActions: ['PET/CT to assess metabolic activity', 'EBUS-guided biopsy of lymph nodes', 'Staging workup'],
        },
      ],
      clinicalCorrelation: 'With 40 pack-year smoking history and nodule growth on serial imaging, this presentation is highly suspicious for non-small cell lung carcinoma. Expedited workup is recommended.',
      followUpRecommendations: [
        { study: 'PET/CT Whole Body', modality: 'nuclear', timeframe: 'Within 1 week', rationale: 'Staging and assessment of metabolic activity', priority: 'urgent' },
        { study: 'CT-Guided Lung Biopsy', modality: 'ct', timeframe: 'Within 2 weeks', rationale: 'Tissue diagnosis required', priority: 'urgent' },
        { study: 'Pulmonary Function Tests', modality: 'xray', timeframe: 'Within 2 weeks', rationale: 'Assess surgical candidacy', priority: 'routine' },
      ],
      patientMessage: 'Dear Ms. Williams,\n\nYour CT scan of the chest has been completed and reviewed. The scan shows a spot in your right lung that needs further evaluation. We also noticed some enlarged lymph nodes in your chest area.\n\nWhile we cannot determine exactly what this is from the CT scan alone, we want to move quickly to get more information. We are recommending:\n\n1. A PET scan to get a clearer picture of the spot and lymph nodes\n2. A biopsy (tissue sample) to determine exactly what the spot is\n\nPlease call our office to schedule these follow-up tests as soon as possible. We understand this may be concerning, and we want you to know that our team is here to support you through this process.\n\nPlease do not hesitate to call with any questions.',
      addendumDraft: 'ADDENDUM - Imaging Review:\nReviewed CT Chest with Contrast (3/3/2026). Suspicious 2.3 cm spiculated RUL nodule with interval growth from 1.5 cm on 1/15/2026 CXR. Associated mediastinal lymphadenopathy. Assessment: Lung-RADS 4B, concerning for primary lung malignancy. Plan: Urgent PET/CT for staging, pulmonology referral for tissue sampling, discussed findings with patient.',
      comparisonNotes: 'Compared to CXR from 01/15/2026: The RUL opacity has increased from approximately 1.5 cm to 2.3 cm, representing significant interval growth over 6 weeks.',
      dxSuggestions: [
        {
          suggestedDiagnosis: 'Malignant neoplasm of upper lobe, right bronchus or lung',
          icdCode: 'C34.11',
          confidence: 82,
          basis: 'Spiculated 2.3 cm RUL nodule with interval growth and mediastinal lymphadenopathy in a patient with 40 pack-year smoking history.',
          supportingFindings: ['Spiculated morphology (high specificity for malignancy)', 'Interval growth from 1.5→2.3 cm in 6 weeks', 'Associated mediastinal lymphadenopathy', '40 pack-year smoking history'],
          differentials: [
            { diagnosis: 'Solitary pulmonary nodule, unspecified', icdCode: 'R91.1', reasoning: 'Use until tissue diagnosis confirms malignancy' },
            { diagnosis: 'Lung mass, unspecified', icdCode: 'R91.8', reasoning: 'Alternative if deferring pending biopsy' },
            { diagnosis: 'Granulomatous disease of lung', icdCode: 'J84.89', reasoning: 'Less likely given spiculated morphology, but possible if endemic area' },
          ],
          codingNote: 'Do not code C34.11 until tissue diagnosis confirms malignancy. Use R91.1 (solitary pulmonary nodule) for pre-biopsy encounters. Switch to malignancy code once pathology returns.',
        },
        {
          suggestedDiagnosis: 'Mediastinal lymphadenopathy',
          icdCode: 'R59.0',
          confidence: 95,
          basis: 'Mediastinal lymph nodes measuring 1.8 cm, above the 1.0 cm short-axis threshold for abnormality.',
          supportingFindings: ['Largest node 1.8 cm', 'In context of suspicious lung nodule'],
          differentials: [
            { diagnosis: 'Secondary malignant neoplasm of mediastinal lymph nodes', icdCode: 'C77.1', reasoning: 'If primary lung malignancy is confirmed' },
          ],
          codingNote: 'Code R59.0 until malignancy proven. If lung cancer confirmed, reclassify as C77.1 for staging purposes.',
        },
      ],
    },
    'img-r-002': {
      summary: 'MRI brain is reassuringly normal for any acute process. The mild white matter changes are age-appropriate and consistent with chronic microvascular disease, commonly seen with hypertension history.',
      keyFindings: [
        {
          finding: 'Mild periventricular white matter changes',
          severity: 'mild',
          explanation: 'Small areas of signal change around the brain\'s fluid spaces, common in patients over 50 and with blood pressure issues.',
          clinicalSignificance: 'Fazekas Grade 1 - mild. Not the likely cause of this patient\'s headaches. Important to optimize cardiovascular risk factors.',
          possibleCauses: ['Chronic hypertension', 'Age-related microvascular disease', 'Migraine-related changes'],
          recommendedActions: ['Optimize blood pressure control', 'Monitor with repeat MRI in 1 year if symptoms persist', 'Continue headache workup with other modalities if needed'],
        },
      ],
      clinicalCorrelation: 'The MRI effectively rules out mass lesion, hemorrhage, and stroke as causes of headaches. Consider ophthalmologic evaluation for visual disturbances. Migraine or tension-type headache remains most likely.',
      followUpRecommendations: [
        { study: 'MRA Head/Neck', modality: 'mri', timeframe: 'If headaches persist', rationale: 'Evaluate for vascular causes if clinical suspicion warrants', priority: 'routine' },
      ],
      patientMessage: 'Dear Mr. Chen,\n\nGreat news - your brain MRI results are back and show no concerning findings. There is no evidence of a tumor, bleeding, or stroke.\n\nThe scan did show some very minor changes in the brain\'s small blood vessels, which is quite common and is usually related to blood pressure. This is not the cause of your headaches.\n\nWe will continue to work together to identify and treat the cause of your headaches. Please continue your current medications and keep your follow-up appointment.\n\nFeel free to call us with any questions.',
      addendumDraft: 'ADDENDUM - Imaging Review:\nReviewed MRI Brain w/o Contrast (3/4/2026). No acute intracranial abnormality. Mild periventricular white matter changes (Fazekas 1), likely chronic microvascular. No mass or hemorrhage to explain symptoms. Plan: Continue headache evaluation, optimize cardiovascular risk factors, ophthalmology referral for visual symptoms.',
      dxSuggestions: [
        {
          suggestedDiagnosis: 'Cerebral small vessel disease, chronic microvascular',
          icdCode: 'I67.82',
          confidence: 75,
          basis: 'Mild periventricular white matter changes (Fazekas Grade 1) consistent with chronic microvascular ischemic disease.',
          supportingFindings: ['Periventricular white matter T2/FLAIR hyperintensities', 'Age-appropriate distribution', 'No acute infarct'],
          differentials: [
            { diagnosis: 'Headache, unspecified', icdCode: 'R51.9', reasoning: 'Primary reason for study — MRI did not identify a cause' },
            { diagnosis: 'Migraine without aura', icdCode: 'G43.009', reasoning: 'Clinical correlation needed — common cause of headaches with visual disturbances' },
          ],
          codingNote: 'The white matter changes are an incidental finding. Primary diagnosis should reflect the presenting symptom (headache) since MRI was negative for structural cause.',
        },
      ],
    },
    'img-r-003': {
      summary: 'Thyroid ultrasound reveals a TI-RADS 5 nodule with suspicious features (irregular margins, microcalcifications). This has a >20% risk of malignancy and requires tissue sampling.',
      keyFindings: [
        {
          finding: '1.2 cm solid hypoechoic thyroid nodule (TI-RADS 5)',
          severity: 'significant',
          explanation: 'A dark, solid nodule in the thyroid gland with irregular edges and tiny calcium deposits. These features raise concern for possible thyroid cancer.',
          clinicalSignificance: 'TI-RADS 5 nodules have a malignancy risk of 20-35%. FNA (fine needle aspiration) biopsy is indicated for nodules >= 1.0 cm.',
          possibleCauses: ['Papillary thyroid carcinoma (most common malignant)', 'Follicular thyroid carcinoma', 'Benign adenoma (less likely given features)', 'Hashimoto\'s thyroiditis nodule'],
          recommendedActions: ['FNA biopsy of the right thyroid nodule', 'TSH and thyroid function panel', 'Endocrinology referral', 'Neck ultrasound with lymph node mapping'],
          detailedExplanation: 'Microcalcifications are tiny bright spots seen on ultrasound that represent small calcium deposits within the nodule. In thyroid nodules, they are strongly associated with papillary thyroid carcinoma. Combined with the hypoechoic (darker than normal tissue) appearance and irregular margins, this constellation of features is classified as TI-RADS 5 (highly suspicious).',
        },
      ],
      clinicalCorrelation: 'The elevated TSH may be stimulating nodule growth. Combined with the suspicious ultrasound features, expedited FNA biopsy is the appropriate next step. Papillary thyroid carcinoma, if confirmed, generally has an excellent prognosis.',
      followUpRecommendations: [
        { study: 'Ultrasound-Guided FNA Biopsy', modality: 'ultrasound', timeframe: 'Within 2 weeks', rationale: 'Tissue diagnosis for TI-RADS 5 nodule', priority: 'urgent' },
        { study: 'Thyroid Uptake and Scan', modality: 'nuclear', timeframe: 'If FNA is indeterminate', rationale: 'Assess functional status of nodule', priority: 'routine' },
      ],
      patientMessage: 'Dear Ms. Martinez,\n\nYour thyroid ultrasound results are ready. The scan shows a small nodule (about half an inch) in the right side of your thyroid gland. The nodule has some features that we need to examine more closely.\n\nThe next step is a simple procedure called a fine needle aspiration (FNA) biopsy. During this procedure, a thin needle is used to take a tiny sample of the nodule for examination under a microscope. This is done in the office and takes only about 15-20 minutes.\n\nPlease know that most thyroid nodules, even those that need a biopsy, turn out to be non-cancerous. We want to be thorough in your care.\n\nPlease call our office to schedule the biopsy at your earliest convenience.',
      addendumDraft: 'ADDENDUM - Imaging Review:\nReviewed Thyroid US (3/2/2026). 1.2 cm right thyroid nodule, TI-RADS 5 (solid, hypoechoic, irregular margins, microcalcifications). No cervical LAD. Assessment: Suspicious thyroid nodule requiring tissue sampling. Plan: US-guided FNA biopsy ordered, endocrinology referral placed, TSH pending.',
      dxSuggestions: [
        {
          suggestedDiagnosis: 'Thyroid nodule, solitary',
          icdCode: 'E04.1',
          confidence: 95,
          basis: '1.2 cm solid thyroid nodule confirmed on ultrasound with TI-RADS 5 classification.',
          supportingFindings: ['Solid hypoechoic nodule', 'Irregular margins', 'Microcalcifications', 'TI-RADS 5 classification'],
          differentials: [
            { diagnosis: 'Papillary thyroid carcinoma', icdCode: 'C73', reasoning: 'TI-RADS 5 has 20-35% malignancy risk — do not code until FNA/pathology confirms' },
            { diagnosis: 'Follicular thyroid neoplasm', icdCode: 'D34', reasoning: 'Benign follicular adenoma vs carcinoma — requires surgical specimen to distinguish' },
          ],
          codingNote: 'Use E04.1 (solitary thyroid nodule) until tissue diagnosis is obtained. If FNA returns Bethesda V or VI, code as C73 (thyroid malignancy). Bethesda III-IV requires repeat FNA or surgical excision before malignancy coding.',
        },
      ],
    },
    'img-r-005': {
      summary: 'Left hip X-ray confirms a nondisplaced femoral neck fracture in the setting of a fall with underlying osteoporosis. This requires urgent orthopedic intervention.',
      keyFindings: [
        {
          finding: 'Nondisplaced subcapital femoral neck fracture',
          severity: 'critical',
          explanation: 'A break in the top of the thigh bone (femur) near where it connects to the hip socket. "Nondisplaced" means the bone pieces are still aligned.',
          clinicalSignificance: 'Femoral neck fractures in elderly patients carry significant morbidity and mortality. Surgical fixation or hip replacement is typically required within 24-48 hours.',
          possibleCauses: ['Low-energy fall with osteoporotic bone', 'Pathologic fracture (less likely without focal lesion)'],
          recommendedActions: ['Urgent orthopedic surgery consultation', 'Pre-operative medical optimization', 'DVT prophylaxis', 'Pain management', 'DEXA scan after recovery'],
          detailedExplanation: 'Subcapital fractures occur just below the head of the femur. In elderly patients with osteoporosis, these are common after falls. The blood supply to the femoral head runs along the femoral neck, so these fractures risk interrupting blood flow and causing the bone to die (avascular necrosis). This is why timely surgical intervention is critical.',
        },
        {
          finding: 'Moderate osteoporosis',
          severity: 'significant',
          explanation: 'The bones appear thinner and less dense than normal, indicating weakened bone structure throughout.',
          clinicalSignificance: 'Underlying cause of the fragility fracture. Requires treatment to prevent future fractures.',
          possibleCauses: ['Age-related bone loss', 'Post-menopausal osteoporosis', 'Vitamin D deficiency', 'Medication-related'],
          recommendedActions: ['DEXA scan after fracture healing', 'Calcium and Vitamin D supplementation', 'Consider bisphosphonate therapy', 'Fall prevention program'],
        },
      ],
      clinicalCorrelation: 'An 81-year-old woman on warfarin with a hip fracture requires coordinated care: INR management peri-operatively, DVT prophylaxis, and osteoporosis treatment initiation after surgical recovery.',
      followUpRecommendations: [
        { study: 'MRI Left Hip', modality: 'mri', timeframe: 'If surgical planning requires', rationale: 'Better delineation of fracture pattern if needed', priority: 'urgent' },
        { study: 'DEXA Scan', modality: 'xray', timeframe: 'After fracture healing (8-12 weeks)', rationale: 'Quantify osteoporosis severity for treatment planning', priority: 'routine' },
      ],
      patientMessage: 'Dear Ms. Clark,\n\nYour hip X-ray confirms that you have a fracture (break) in your left hip bone from your fall. The good news is that the bone pieces are still in their proper position.\n\nHowever, hip fractures do require surgery to heal properly and prevent complications. We are referring you to an orthopedic surgeon who will discuss the best surgical option for you.\n\nIn the meantime:\n- Keep weight off your left leg\n- Take pain medication as prescribed\n- Someone from the surgical team will be in contact with you shortly\n\nThe X-ray also shows that your bones are somewhat thin (osteoporosis), which made them more vulnerable to breaking. After your hip heals, we will address this to help prevent future fractures.',
      addendumDraft: 'ADDENDUM - Imaging Review:\nReviewed L Hip XR (3/4/2026). Nondisplaced subcapital femoral neck fracture with moderate osteoporotic changes. Assessment: Acute hip fracture requiring surgical intervention. Note patient on warfarin (INR 2.8) - will need bridging. Plan: Urgent orthopedic referral placed, pre-op labs ordered, INR management for surgery, pain control initiated.',
      dxSuggestions: [
        {
          suggestedDiagnosis: 'Fracture of neck of left femur, nondisplaced, initial encounter',
          icdCode: 'S72.002A',
          confidence: 98,
          basis: 'X-ray confirms nondisplaced subcapital fracture of the left femoral neck following a fall.',
          supportingFindings: ['Visible fracture line at subcapital region', 'No displacement of fragments', 'Mechanism: fall from standing'],
          differentials: [
            { diagnosis: 'Pathologic fracture of left femur', icdCode: 'M84.452A', reasoning: 'Consider if underlying bone lesion present — not seen on this study' },
          ],
          codingNote: 'Use S72.002A for initial encounter. Add M81.0 (age-related osteoporosis without fracture) as secondary diagnosis. External cause code W01 (fall on same level) should be included.',
        },
        {
          suggestedDiagnosis: 'Age-related osteoporosis without current pathological fracture',
          icdCode: 'M81.0',
          confidence: 90,
          basis: 'Moderate osteoporotic changes visible on X-ray with thinned cortices and decreased bone density.',
          supportingFindings: ['Generalized cortical thinning', 'Decreased bone density', 'Fragility fracture mechanism'],
          differentials: [],
          codingNote: 'Code as secondary diagnosis. DEXA scan after fracture healing will confirm severity and guide treatment intensity.',
        },
      ],
    },
  };

  // Default analysis for studies without specific mock data
  const defaultAnalysis: ImagingAIAnalysis = {
    summary: `Review of ${result.studyType} for ${result.patientName}. ${result.hasAbnormalities ? 'Findings noted requiring clinical correlation.' : 'No significant abnormalities identified.'}`,
    keyFindings: result.hasAbnormalities ? [{
      finding: result.impression.split('.')[0],
      severity: result.severity,
      explanation: result.findings,
      clinicalSignificance: 'Clinical correlation recommended.',
      possibleCauses: ['See radiologist impression for differential'],
      recommendedActions: ['Review findings in clinical context', 'Consider follow-up imaging if indicated'],
    }] : [],
    clinicalCorrelation: result.impression,
    followUpRecommendations: [],
    patientMessage: `Dear ${result.patientName.split(' ')[0]},\n\nYour ${result.studyType.toLowerCase()} results have been reviewed. ${result.hasAbnormalities ? 'We would like to discuss the findings with you at your next visit.' : 'The results look normal.'}\n\nPlease call our office if you have any questions.`,
    addendumDraft: `ADDENDUM - Imaging Review:\nReviewed ${result.studyType} (${result.resultDate}). ${result.impression}`,
    dxSuggestions: [],
  };

  return analyses[result.id] || defaultAnalysis;
}
