// =============================================================================
// ATTENDING AI - Medication Optimization API
// apps/provider-portal/pages/api/interventions/medications.ts
//
// AI-powered medication review and optimization
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  medicationOptimizer,
  type MedicationReviewContext,
  type MedicationReviewReport,
  type MedicationOptimization,
} from '@attending/shared/services/interventions';

interface MedicationsRequest {
  action: 'review' | 'accept' | 'reject' | 'defer';
  reviewContext?: MedicationReviewContext;
  optimizationId?: string;
  notes?: string;
}

interface MedicationsResponse {
  success: boolean;
  report?: MedicationReviewReport;
  optimization?: MedicationOptimization;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MedicationsResponse>
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

    const { action, reviewContext, optimizationId, notes } = req.body as MedicationsRequest;

    switch (action) {
      case 'review': {
        if (!reviewContext) {
          return res.status(400).json({ success: false, error: 'reviewContext is required' });
        }

        const report = await medicationOptimizer.performMedicationReview(reviewContext);
        return res.status(200).json({ success: true, report });
      }

      case 'accept':
      case 'reject':
      case 'defer': {
        if (!optimizationId) {
          return res.status(400).json({ success: false, error: 'optimizationId is required' });
        }

        // In production, would update database
        return res.status(200).json({ 
          success: true,
          optimization: {
            id: optimizationId,
            status: action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'deferred',
            providerNotes: notes,
          } as any
        });
      }

      default:
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    console.error('[Medications API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
