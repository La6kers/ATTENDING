// =============================================================================
// ATTENDING AI - Clinical Recommendations API
// apps/provider-portal/pages/api/interventions/recommendations.ts
//
// Get AI-powered clinical recommendations for a patient
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  clinicalDecisionEngine,
  type PatientContext,
  type ClinicalRecommendation,
} from '@attending/shared/services/clinical-decision';

interface RecommendationsRequest {
  patientContext: PatientContext;
  filterType?: 'all' | 'safety' | 'therapeutic' | 'preventive' | 'cost_optimization';
}

interface RecommendationsResponse {
  success: boolean;
  recommendations?: ClinicalRecommendation[];
  summary?: {
    total: number;
    urgent: number;
    safety: number;
    therapeutic: number;
    preventive: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecommendationsResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { patientContext, filterType = 'all' } = req.body as RecommendationsRequest;

    if (!patientContext) {
      return res.status(400).json({ success: false, error: 'Patient context is required' });
    }

    let recommendations: ClinicalRecommendation[];

    switch (filterType) {
      case 'safety':
        recommendations = await clinicalDecisionEngine.getSafetyAlerts(patientContext);
        break;
      case 'therapeutic':
        recommendations = await clinicalDecisionEngine.getTherapeuticRecommendations(patientContext);
        break;
      case 'preventive':
        recommendations = await clinicalDecisionEngine.getPreventiveRecommendations(patientContext);
        break;
      default:
        recommendations = await clinicalDecisionEngine.analyzePatient(patientContext);
    }

    const summary = {
      total: recommendations.length,
      urgent: recommendations.filter(r => r.urgency === 'urgent' || r.urgency === 'emergent').length,
      safety: recommendations.filter(r => r.type === 'safety').length,
      therapeutic: recommendations.filter(r => r.type === 'therapeutic').length,
      preventive: recommendations.filter(r => r.type === 'preventive').length,
    };

    return res.status(200).json({ success: true, recommendations, summary });
  } catch (error) {
    console.error('[Recommendations API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
