// Treatment Protocols API - Get evidence-based protocols
// apps/provider-portal/pages/api/treatment-plans/protocols.ts

import type { NextApiRequest, NextApiResponse } from 'next';

interface TreatmentProtocol {
  id: string;
  name: string;
  diagnosis: string;
  description: string;
  evidenceLevel: 'A' | 'B' | 'C';
  source: string;
  recommendedLabs: string[];
  recommendedImaging: string[];
  recommendedMedications: string[];
  recommendedReferrals: string[];
  followUpSchedule: { type: string; description: string; timeframe: string; timeframeDays: number }[];
  contraindications: string[];
  warnings: string[];
}

// Evidence-based treatment protocols
const TREATMENT_PROTOCOLS: TreatmentProtocol[] = [
  {
    id: 'proto-migraine-acute',
    name: 'Acute Migraine Management',
    diagnosis: 'Migraine',
    description: 'Evidence-based protocol for acute migraine presentation without red flags',
    evidenceLevel: 'A',
    source: 'American Headache Society Guidelines 2021',
    recommendedLabs: ['CBC-DIFF', 'CMP', 'TSH'],
    recommendedImaging: [],
    recommendedMedications: ['sumatriptan-inj', 'ondansetron', 'ketorolac'],
    recommendedReferrals: [],
    followUpSchedule: [
      { type: 'appointment', description: 'Follow-up visit', timeframe: '2 weeks', timeframeDays: 14 },
      { type: 'phone', description: 'Check treatment response', timeframe: '3 days', timeframeDays: 3 }
    ],
    contraindications: ['Cardiovascular disease', 'Uncontrolled hypertension', 'Hemiplegic migraine'],
    warnings: ['Screen for medication overuse headache']
  },
  {
    id: 'proto-headache-redflag',
    name: 'Red Flag Headache Workup',
    diagnosis: 'Headache - Rule Out Secondary Cause',
    description: 'STAT evaluation protocol for headache with red flag features',
    evidenceLevel: 'B',
    source: 'ACEP Clinical Policy: Headache 2019',
    recommendedLabs: ['CBC-DIFF', 'CMP', 'ESR', 'CRP', 'PT-INR'],
    recommendedImaging: ['CT-HEAD-WO', 'CTA-HEAD-NECK'],
    recommendedMedications: [],
    recommendedReferrals: ['NEURO'],
    followUpSchedule: [
      { type: 'phone', description: 'Imaging results review', timeframe: 'Same day', timeframeDays: 0 }
    ],
    contraindications: [],
    warnings: ['Consider LP if CT negative with high clinical suspicion for SAH', 'Neurology consult if mass effect or hemorrhage']
  },
  {
    id: 'proto-chest-pain-lowrisk',
    name: 'Low-Risk Chest Pain Evaluation',
    diagnosis: 'Chest Pain - Low Risk',
    description: 'Outpatient workup for low-risk chest pain per HEART score',
    evidenceLevel: 'A',
    source: 'ACC/AHA Chest Pain Guidelines 2021',
    recommendedLabs: ['TROPONIN', 'CBC-DIFF', 'CMP', 'LIPID'],
    recommendedImaging: ['ECHO', 'STRESS-TEST'],
    recommendedMedications: ['aspirin-81', 'atorvastatin'],
    recommendedReferrals: ['CARDS'],
    followUpSchedule: [
      { type: 'appointment', description: 'Cardiology follow-up', timeframe: '1 week', timeframeDays: 7 },
      { type: 'lab_check', description: 'Repeat lipid panel (fasting)', timeframe: '6 weeks', timeframeDays: 42 }
    ],
    contraindications: ['Unstable angina', 'Positive troponin'],
    warnings: ['Immediate ED referral if symptoms worsen']
  },
  {
    id: 'proto-dm2-initial',
    name: 'Type 2 Diabetes Initial Workup',
    diagnosis: 'Type 2 Diabetes Mellitus',
    description: 'Comprehensive initial evaluation for newly diagnosed T2DM',
    evidenceLevel: 'A',
    source: 'ADA Standards of Care 2024',
    recommendedLabs: ['HBA1C', 'CMP', 'LIPID', 'UA', 'UACR', 'TSH'],
    recommendedImaging: [],
    recommendedMedications: ['metformin-500', 'metformin-1000'],
    recommendedReferrals: ['ENDO', 'OPHTH'],
    followUpSchedule: [
      { type: 'appointment', description: 'Diabetes education', timeframe: '1 week', timeframeDays: 7 },
      { type: 'lab_check', description: 'HbA1c recheck', timeframe: '3 months', timeframeDays: 90 },
      { type: 'appointment', description: 'Follow-up visit', timeframe: '3 months', timeframeDays: 90 }
    ],
    contraindications: ['eGFR < 30', 'Active liver disease'],
    warnings: ['Hold metformin before contrast procedures', 'Monitor for lactic acidosis symptoms']
  },
  {
    id: 'proto-uti-uncomplicated',
    name: 'Uncomplicated UTI Treatment',
    diagnosis: 'Urinary Tract Infection - Uncomplicated',
    description: 'First-line treatment for uncomplicated cystitis in women',
    evidenceLevel: 'A',
    source: 'IDSA Guidelines 2024',
    recommendedLabs: ['UA', 'URINE-CULTURE'],
    recommendedImaging: [],
    recommendedMedications: ['nitrofurantoin', 'tmp-smx'],
    recommendedReferrals: [],
    followUpSchedule: [
      { type: 'phone', description: 'Symptom check', timeframe: '3 days', timeframeDays: 3 }
    ],
    contraindications: ['Pregnancy', 'Pyelonephritis symptoms', 'Recurrent UTI (>3/year)'],
    warnings: ['Consider urology referral for recurrent infections']
  },
  {
    id: 'proto-hypertension-initial',
    name: 'Hypertension Initial Evaluation',
    diagnosis: 'Essential Hypertension',
    description: 'Initial evaluation and treatment for newly diagnosed hypertension',
    evidenceLevel: 'A',
    source: 'ACC/AHA Hypertension Guidelines 2017',
    recommendedLabs: ['CMP', 'LIPID', 'TSH', 'UA', 'CBC-DIFF'],
    recommendedImaging: ['ECG'],
    recommendedMedications: ['lisinopril', 'amlodipine'],
    recommendedReferrals: [],
    followUpSchedule: [
      { type: 'appointment', description: 'BP recheck', timeframe: '2 weeks', timeframeDays: 14 },
      { type: 'lab_check', description: 'Renal function check', timeframe: '2 weeks', timeframeDays: 14 }
    ],
    contraindications: ['Secondary hypertension'],
    warnings: ['Screen for secondary causes if resistant', 'ASCVD risk calculation']
  },
  {
    id: 'proto-anxiety-gad',
    name: 'Generalized Anxiety Disorder',
    diagnosis: 'Generalized Anxiety Disorder',
    description: 'Initial evaluation and treatment for GAD',
    evidenceLevel: 'A',
    source: 'APA Clinical Practice Guidelines 2023',
    recommendedLabs: ['TSH', 'CBC-DIFF'],
    recommendedImaging: [],
    recommendedMedications: ['sertraline', 'escitalopram'],
    recommendedReferrals: ['PSYCH'],
    followUpSchedule: [
      { type: 'phone', description: 'Medication tolerance check', timeframe: '1 week', timeframeDays: 7 },
      { type: 'appointment', description: 'Symptom assessment', timeframe: '4 weeks', timeframeDays: 28 }
    ],
    contraindications: ['Bipolar disorder', 'Active substance use'],
    warnings: ['Black box warning for suicidal ideation in young adults', 'Taper if discontinuing']
  },
  {
    id: 'proto-back-pain-acute',
    name: 'Acute Low Back Pain',
    diagnosis: 'Acute Low Back Pain',
    description: 'Conservative management of acute mechanical low back pain',
    evidenceLevel: 'A',
    source: 'ACP Clinical Guidelines 2017',
    recommendedLabs: [],
    recommendedImaging: [],
    recommendedMedications: ['naproxen', 'cyclobenzaprine'],
    recommendedReferrals: ['PT'],
    followUpSchedule: [
      { type: 'phone', description: 'Symptom check', timeframe: '1 week', timeframeDays: 7 },
      { type: 'appointment', description: 'Follow-up if not improving', timeframe: '4 weeks', timeframeDays: 28 }
    ],
    contraindications: ['Red flag symptoms', 'Neurological deficits'],
    warnings: ['Imaging not routinely recommended', 'Watch for red flags: saddle anesthesia, bladder dysfunction']
  },
  {
    id: 'proto-copd-exacerbation',
    name: 'COPD Exacerbation',
    diagnosis: 'COPD Exacerbation',
    description: 'Outpatient management of mild-moderate COPD exacerbation',
    evidenceLevel: 'A',
    source: 'GOLD Guidelines 2024',
    recommendedLabs: ['CBC-DIFF', 'CMP', 'BNP'],
    recommendedImaging: ['CXR'],
    recommendedMedications: ['prednisone', 'azithromycin', 'albuterol-neb'],
    recommendedReferrals: ['PULM'],
    followUpSchedule: [
      { type: 'phone', description: 'Symptom check', timeframe: '2 days', timeframeDays: 2 },
      { type: 'appointment', description: 'Follow-up visit', timeframe: '1 week', timeframeDays: 7 }
    ],
    contraindications: ['Severe exacerbation requiring hospitalization', 'Respiratory failure'],
    warnings: ['ED referral if worsening dyspnea or hypoxia', 'Consider inhaler technique review']
  },
  {
    id: 'proto-depression-initial',
    name: 'Major Depressive Disorder Initial Treatment',
    diagnosis: 'Major Depressive Disorder',
    description: 'First-line treatment for moderate MDD',
    evidenceLevel: 'A',
    source: 'APA Practice Guidelines 2023',
    recommendedLabs: ['TSH', 'CBC-DIFF', 'CMP', 'B12'],
    recommendedImaging: [],
    recommendedMedications: ['sertraline', 'escitalopram', 'bupropion'],
    recommendedReferrals: ['PSYCH'],
    followUpSchedule: [
      { type: 'phone', description: 'Medication tolerance and safety check', timeframe: '1 week', timeframeDays: 7 },
      { type: 'appointment', description: 'Response assessment', timeframe: '4 weeks', timeframeDays: 28 },
      { type: 'appointment', description: 'Continued management', timeframe: '8 weeks', timeframeDays: 56 }
    ],
    contraindications: ['Bipolar disorder', 'Active suicidal ideation with plan'],
    warnings: ['Black box warning in patients <25', 'Screen for bipolar before starting SSRI', 'Safety planning required']
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    if (req.method === 'GET') {
      // Get all protocols or filter by diagnosis
      const { diagnosis, search } = req.query;
      
      let filtered = [...TREATMENT_PROTOCOLS];
      
      if (diagnosis) {
        const diagLower = String(diagnosis).toLowerCase();
        filtered = filtered.filter(p => 
          p.diagnosis.toLowerCase().includes(diagLower) ||
          p.name.toLowerCase().includes(diagLower)
        );
      }
      
      if (search) {
        const searchLower = String(search).toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.diagnosis.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
        );
      }
      
      return res.status(200).json({
        protocols: filtered,
        total: filtered.length
      });
    }
    
    if (req.method === 'POST') {
      // Match protocols based on diagnoses
      const { diagnoses } = req.body as { diagnoses: { code: string; description: string }[] };
      
      if (!diagnoses || !Array.isArray(diagnoses)) {
        return res.status(400).json({ error: 'Diagnoses array is required' });
      }
      
      const matchedProtocols = TREATMENT_PROTOCOLS.filter(proto =>
        diagnoses.some(d =>
          d.description.toLowerCase().includes(proto.diagnosis.toLowerCase()) ||
          proto.diagnosis.toLowerCase().includes(d.description.toLowerCase()) ||
          proto.name.toLowerCase().includes(d.description.toLowerCase())
        )
      );
      
      // Sort by evidence level
      matchedProtocols.sort((a, b) => {
        const order = { 'A': 0, 'B': 1, 'C': 2 };
        return order[a.evidenceLevel] - order[b.evidenceLevel];
      });
      
      return res.status(200).json({
        protocols: matchedProtocols,
        total: matchedProtocols.length
      });
    }
  } catch (error) {
    console.error('Error fetching protocols:', error);
    return res.status(500).json({ error: 'Failed to fetch protocols' });
  }
}
