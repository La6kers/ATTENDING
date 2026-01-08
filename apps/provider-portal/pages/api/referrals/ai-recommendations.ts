// Referral AI Recommendations API
// apps/provider-portal/pages/api/referrals/ai-recommendations.ts

import type { NextApiRequest, NextApiResponse } from 'next';

interface PatientContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  chiefComplaint: string;
  redFlags: string[];
  medicalHistory?: string[];
  allergies?: string[];
}

interface AIReferralRecommendation {
  id: string;
  specialty: string;
  subspecialty?: string;
  urgency: 'STAT' | 'URGENT' | 'ROUTINE' | 'ELECTIVE';
  rationale: string;
  clinicalQuestion: string;
  suggestedTests: string[];
  confidence: number;
  category: 'critical' | 'recommended' | 'consider';
  redFlagRelated?: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { patientId, context } = req.body as { patientId: string; context: PatientContext };

    if (!context || !context.chiefComplaint) {
      return res.status(400).json({ error: 'Patient context with chief complaint is required' });
    }

    // In production, this would call BioMistral or another AI service
    // For now, generate recommendations based on clinical rules
    const recommendations = generateReferralRecommendations(context);

    return res.status(200).json(recommendations);
  } catch (error) {
    console.error('Error generating referral recommendations:', error);
    return res.status(500).json({ error: 'Failed to generate recommendations' });
  }
}

function generateReferralRecommendations(context: PatientContext): AIReferralRecommendation[] {
  const recommendations: AIReferralRecommendation[] = [];
  const complaint = context.chiefComplaint.toLowerCase();
  const redFlags = context.redFlags || [];
  const history = context.medicalHistory || [];

  // Headache evaluation
  if (complaint.includes('headache') || complaint.includes('migraine')) {
    const isRedFlag = redFlags.some(f => 
      f.toLowerCase().includes('thunderclap') || 
      f.toLowerCase().includes('worst headache') ||
      f.toLowerCase().includes('confusion') ||
      f.toLowerCase().includes('fever') ||
      f.toLowerCase().includes('neck stiffness')
    );
    
    recommendations.push({
      id: `rec-${Date.now()}-neuro`,
      specialty: 'NEURO',
      subspecialty: 'Headache Medicine',
      urgency: isRedFlag ? 'STAT' : 'ROUTINE',
      rationale: isRedFlag 
        ? 'Red flag headache symptoms require urgent neurological evaluation to rule out subarachnoid hemorrhage, meningitis, or mass lesion'
        : 'Complex or refractory headache warrants specialist evaluation for optimal preventive therapy',
      clinicalQuestion: isRedFlag
        ? 'URGENT: Please evaluate for secondary headache causes. Red flags present: ' + redFlags.join(', ')
        : 'Please evaluate for headache diagnosis and optimize preventive therapy',
      suggestedTests: isRedFlag ? ['CT Head', 'LP if CT negative', 'MRI/MRA'] : ['MRI Brain if indicated'],
      confidence: isRedFlag ? 0.95 : 0.78,
      category: isRedFlag ? 'critical' : 'recommended',
      redFlagRelated: isRedFlag
    });

    // Add ophthalmology if vision symptoms
    if (complaint.includes('vision') || complaint.includes('aura')) {
      recommendations.push({
        id: `rec-${Date.now()}-ophth`,
        specialty: 'OPHTH',
        urgency: 'URGENT',
        rationale: 'Visual symptoms with headache require ophthalmologic evaluation to rule out papilledema and other ocular causes',
        clinicalQuestion: 'Please evaluate for papilledema and visual field defects',
        suggestedTests: ['Fundoscopic exam', 'Visual fields'],
        confidence: 0.72,
        category: 'consider'
      });
    }
  }

  // Chest pain evaluation
  if (complaint.includes('chest pain') || complaint.includes('chest discomfort') || complaint.includes('palpitation')) {
    const isHighRisk = redFlags.some(f =>
      f.toLowerCase().includes('radiation') ||
      f.toLowerCase().includes('diaphoresis') ||
      f.toLowerCase().includes('dyspnea') ||
      f.toLowerCase().includes('syncope')
    ) || history.some(h => 
      h.toLowerCase().includes('cad') ||
      h.toLowerCase().includes('mi') ||
      h.toLowerCase().includes('stent')
    );

    recommendations.push({
      id: `rec-${Date.now()}-cards`,
      specialty: 'CARDS',
      subspecialty: isHighRisk ? 'Interventional' : undefined,
      urgency: isHighRisk ? 'URGENT' : 'ROUTINE',
      rationale: isHighRisk
        ? 'High-risk features present. Urgent cardiac evaluation recommended for risk stratification'
        : 'Chest pain evaluation for cardiac risk assessment and management',
      clinicalQuestion: 'Please evaluate for cardiac etiology and provide risk stratification',
      suggestedTests: isHighRisk 
        ? ['Stress test', 'Coronary CTA', 'Echo'] 
        : ['Stress test', 'ECG'],
      confidence: 0.88,
      category: isHighRisk ? 'critical' : 'recommended',
      redFlagRelated: isHighRisk
    });
  }

  // GI symptoms
  if (complaint.includes('abdominal') || complaint.includes('nausea') || complaint.includes('reflux') || 
      complaint.includes('dysphagia') || complaint.includes('weight loss')) {
    const isAlarm = redFlags.some(f =>
      f.toLowerCase().includes('bleeding') ||
      f.toLowerCase().includes('weight loss') ||
      f.toLowerCase().includes('anemia') ||
      f.toLowerCase().includes('dysphagia')
    );

    recommendations.push({
      id: `rec-${Date.now()}-gi`,
      specialty: 'GI',
      urgency: isAlarm ? 'URGENT' : 'ROUTINE',
      rationale: isAlarm
        ? 'Alarm features present requiring endoscopic evaluation'
        : 'GI symptoms warrant specialist evaluation and possible endoscopy',
      clinicalQuestion: isAlarm
        ? 'URGENT: Alarm symptoms present. Please evaluate with endoscopy'
        : 'Please evaluate for structural causes and optimize management',
      suggestedTests: ['Upper endoscopy', 'H. pylori testing', 'Basic labs'],
      confidence: isAlarm ? 0.92 : 0.75,
      category: isAlarm ? 'critical' : 'consider',
      redFlagRelated: isAlarm
    });
  }

  // Musculoskeletal symptoms
  if (complaint.includes('joint') || complaint.includes('arthritis') || complaint.includes('back pain') ||
      complaint.includes('muscle') || complaint.includes('weakness')) {
    const isNeuro = redFlags.some(f =>
      f.toLowerCase().includes('weakness') ||
      f.toLowerCase().includes('numbness') ||
      f.toLowerCase().includes('bladder') ||
      f.toLowerCase().includes('bowel')
    );

    if (isNeuro) {
      recommendations.push({
        id: `rec-${Date.now()}-neuro-msk`,
        specialty: 'NEURO',
        subspecialty: 'Neuromuscular',
        urgency: 'URGENT',
        rationale: 'Neurological symptoms present requiring urgent evaluation',
        clinicalQuestion: 'Please evaluate for neurological causes of weakness/sensory changes',
        suggestedTests: ['MRI Spine', 'EMG/NCS'],
        confidence: 0.90,
        category: 'critical',
        redFlagRelated: true
      });
    }

    recommendations.push({
      id: `rec-${Date.now()}-ortho`,
      specialty: 'ORTHO',
      subspecialty: complaint.includes('back') ? 'Spine' : 'Sports Medicine',
      urgency: isNeuro ? 'URGENT' : 'ROUTINE',
      rationale: 'Musculoskeletal symptoms may benefit from orthopedic evaluation',
      clinicalQuestion: 'Please evaluate for structural causes and treatment options',
      suggestedTests: ['X-ray', 'MRI if indicated'],
      confidence: 0.72,
      category: 'consider'
    });

    // Add PT recommendation
    if (!isNeuro) {
      recommendations.push({
        id: `rec-${Date.now()}-pt`,
        specialty: 'PT',
        subspecialty: complaint.includes('back') ? 'Orthopedic' : undefined,
        urgency: 'ROUTINE',
        rationale: 'Physical therapy is first-line treatment for mechanical musculoskeletal pain',
        clinicalQuestion: 'Please evaluate and treat with therapeutic exercise program',
        suggestedTests: [],
        confidence: 0.85,
        category: 'recommended'
      });
    }
  }

  // Mental health
  if (complaint.includes('depression') || complaint.includes('anxiety') || 
      complaint.includes('mood') || complaint.includes('stress') || complaint.includes('insomnia')) {
    const isSevere = redFlags.some(f =>
      f.toLowerCase().includes('suicidal') ||
      f.toLowerCase().includes('homicidal') ||
      f.toLowerCase().includes('psychosis') ||
      f.toLowerCase().includes('mania')
    );

    recommendations.push({
      id: `rec-${Date.now()}-psych`,
      specialty: 'PSYCH',
      urgency: isSevere ? 'STAT' : 'ROUTINE',
      rationale: isSevere
        ? 'CRITICAL: Safety concern identified. Urgent psychiatric evaluation required'
        : 'Mental health symptoms warrant psychiatric evaluation for medication management and therapy',
      clinicalQuestion: isSevere
        ? 'URGENT SAFETY EVALUATION NEEDED. Please assess immediately'
        : 'Please evaluate and provide medication management recommendations',
      suggestedTests: isSevere ? [] : ['TSH', 'CBC'],
      confidence: isSevere ? 0.98 : 0.80,
      category: isSevere ? 'critical' : 'recommended',
      redFlagRelated: isSevere
    });
  }

  // Skin/Dermatology
  if (complaint.includes('rash') || complaint.includes('lesion') || complaint.includes('mole') ||
      complaint.includes('skin')) {
    const isConcerning = redFlags.some(f =>
      f.toLowerCase().includes('changing') ||
      f.toLowerCase().includes('bleeding') ||
      f.toLowerCase().includes('melanoma') ||
      f.toLowerCase().includes('asymmetric')
    );

    recommendations.push({
      id: `rec-${Date.now()}-derm`,
      specialty: 'DERM',
      urgency: isConcerning ? 'URGENT' : 'ROUTINE',
      rationale: isConcerning
        ? 'Suspicious lesion features require urgent dermatologic evaluation'
        : 'Skin condition warrants dermatologic evaluation',
      clinicalQuestion: isConcerning
        ? 'Please evaluate concerning lesion with possible biopsy'
        : 'Please evaluate and provide treatment recommendations',
      suggestedTests: isConcerning ? ['Biopsy'] : [],
      confidence: isConcerning ? 0.88 : 0.70,
      category: isConcerning ? 'critical' : 'consider',
      redFlagRelated: isConcerning
    });
  }

  // Respiratory symptoms
  if (complaint.includes('cough') || complaint.includes('dyspnea') || complaint.includes('shortness of breath') ||
      complaint.includes('wheezing')) {
    const isSevere = redFlags.some(f =>
      f.toLowerCase().includes('hemoptysis') ||
      f.toLowerCase().includes('hypoxia') ||
      f.toLowerCase().includes('mass')
    );

    recommendations.push({
      id: `rec-${Date.now()}-pulm`,
      specialty: 'PULM',
      urgency: isSevere ? 'URGENT' : 'ROUTINE',
      rationale: isSevere
        ? 'Concerning respiratory symptoms require pulmonary evaluation'
        : 'Respiratory symptoms may benefit from pulmonology evaluation',
      clinicalQuestion: 'Please evaluate for pulmonary causes and optimize management',
      suggestedTests: isSevere 
        ? ['CT Chest', 'PFTs', 'Bronchoscopy if indicated'] 
        : ['PFTs', 'Chest X-ray'],
      confidence: isSevere ? 0.88 : 0.72,
      category: isSevere ? 'critical' : 'consider',
      redFlagRelated: isSevere
    });
  }

  // Sort by urgency and confidence
  recommendations.sort((a, b) => {
    const urgencyOrder = { 'STAT': 0, 'URGENT': 1, 'ROUTINE': 2, 'ELECTIVE': 3 };
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    return b.confidence - a.confidence;
  });

  return recommendations;
}
