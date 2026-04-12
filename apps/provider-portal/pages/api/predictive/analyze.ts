// =============================================================================
// ATTENDING AI - Predictive Analytics API
// apps/provider-portal/pages/api/predictive/analyze.ts
//
// Run predictive models (sepsis, readmission, deterioration)
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  predictiveService,
  type PatientContext,
  type PredictionResult,
  type RiskLevel,
} from '@attending/shared/services/predictive';

interface PredictRequest {
  patientId: string;
  patientContext: PatientContext;
  models?: ('sepsis' | 'readmission' | 'deterioration' | 'all')[];
}

interface PredictResponse {
  success: boolean;
  predictions?: {
    sepsis?: PredictionResult;
    readmission?: PredictionResult;
    deterioration?: PredictionResult;
    overallRisk: RiskLevel;
    alerts: PredictionResult[];
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PredictResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false, 
      error: `Method ${req.method} Not Allowed` 
    });
  }

  try {
    // Authenticate
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { patientId, patientContext, models = ['all'] } = req.body as PredictRequest;

    if (!patientId || !patientContext) {
      return res.status(400).json({ 
        success: false, 
        error: 'patientId and patientContext are required' 
      });
    }

    // Validate patient context
    if (!patientContext.age || !patientContext.gender) {
      return res.status(400).json({ 
        success: false, 
        error: 'Patient context must include age and gender' 
      });
    }

    // Ensure arrays exist
    patientContext.vitals = patientContext.vitals || [];
    patientContext.labs = patientContext.labs || [];
    patientContext.conditions = patientContext.conditions || [];
    patientContext.medications = patientContext.medications || [];
    patientContext.comorbidities = patientContext.comorbidities || [];

    let predictions: PredictResponse['predictions'];

    if (models.includes('all')) {
      // Run all models
      predictions = await predictiveService.runAllPredictions(patientContext);
    } else {
      // Run specific models
      const results: any = {
        overallRisk: 'low' as RiskLevel,
        alerts: [],
      };

      if (models.includes('sepsis')) {
        results.sepsis = predictiveService.predictSepsis(patientContext);
        if (results.sepsis.alertGenerated) results.alerts.push(results.sepsis);
      }

      if (models.includes('readmission')) {
        results.readmission = predictiveService.predictReadmission(patientContext);
        if (results.readmission.alertGenerated) results.alerts.push(results.readmission);
      }

      if (models.includes('deterioration')) {
        results.deterioration = predictiveService.predictDeterioration(patientContext);
        if (results.deterioration.alertGenerated) results.alerts.push(results.deterioration);
      }

      // Calculate overall risk
      const riskLevels = [
        results.sepsis?.riskLevel,
        results.readmission?.riskLevel,
        results.deterioration?.riskLevel,
      ].filter(Boolean);

      if (riskLevels.includes('critical')) results.overallRisk = 'critical';
      else if (riskLevels.includes('high')) results.overallRisk = 'high';
      else if (riskLevels.includes('moderate')) results.overallRisk = 'moderate';

      predictions = results;
    }

    return res.status(200).json({ 
      success: true, 
      predictions 
    });
  } catch (error) {
    console.error('[Predictive API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
