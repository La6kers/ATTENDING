// =============================================================================
// ATTENDING AI - Patient Quality Measures API
// apps/provider-portal/pages/api/quality/patient/[patientId].ts
//
// Evaluate patient measures and manage outreach
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { 
  qualityMeasuresService,
  type PatientMeasure,
} from '@attending/shared/services/quality';

interface EvaluateRequest {
  patientData: {
    age: number;
    gender: 'male' | 'female' | 'other';
    conditions: string[];
    medications: string[];
    labs: Array<{ code: string; value: string; date: Date }>;
    procedures: Array<{ code: string; date: Date }>;
    vitals: Array<{ type: string; value: number; date: Date }>;
  };
}

interface OutreachRequest {
  gapId: string;
  method: 'phone' | 'sms' | 'email' | 'letter' | 'portal';
}

interface PatientQualityResponse {
  success: boolean;
  measures?: PatientMeasure[];
  outreach?: any;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PatientQualityResponse>
) {
  try {
    // Authenticate
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const providerId = session.user.id;
    const { patientId, action } = req.query;
    const patientIdStr = Array.isArray(patientId) ? patientId[0] : patientId;

    if (!patientIdStr) {
      return res.status(400).json({ success: false, error: 'Patient ID required' });
    }

    switch (req.method) {
      case 'POST': {
        if (action === 'outreach') {
          // Schedule outreach
          const { gapId, method } = req.body as OutreachRequest;

          if (!gapId || !method) {
            return res.status(400).json({ 
              success: false, 
              error: 'gapId and method are required' 
            });
          }

          const outreach = await qualityMeasuresService.scheduleOutreach(gapId, method);
          const message = await qualityMeasuresService.generateOutreachMessage(gapId, method);

          return res.status(200).json({ 
            success: true, 
            outreach,
            message 
          });
        }

        // Evaluate measures
        const { patientData } = req.body as EvaluateRequest;

        if (!patientData) {
          return res.status(400).json({ 
            success: false, 
            error: 'Patient data is required' 
          });
        }

        const measures = await qualityMeasuresService.evaluatePatientMeasures(
          patientIdStr,
          providerId,
          patientData
        );

        return res.status(200).json({ success: true, measures });
      }

      default:
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ 
          success: false, 
          error: `Method ${req.method} Not Allowed` 
        });
    }
  } catch (error) {
    console.error('[Patient Quality API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
