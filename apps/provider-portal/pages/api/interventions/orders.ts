// =============================================================================
// ATTENDING AI - Smart Orders API
// apps/provider-portal/pages/api/interventions/orders.ts
//
// Natural language order processing with safety checks
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  smartOrderAssistant,
  type PatientOrderContext,
  type OrderSuggestion,
  type OrderSet,
} from '@attending/shared/services/interventions';

interface OrdersRequest {
  action: 'parse' | 'suggest' | 'order_sets';
  naturalLanguageInput?: string;
  patientContext?: PatientOrderContext;
  diagnosisCode?: string;
}

interface OrdersResponse {
  success: boolean;
  suggestions?: OrderSuggestion[];
  orderSets?: OrderSet[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrdersResponse>
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

    const { action, naturalLanguageInput, patientContext, diagnosisCode } = req.body as OrdersRequest;

    switch (action) {
      case 'parse': {
        if (!naturalLanguageInput || !patientContext) {
          return res.status(400).json({ 
            success: false, 
            error: 'naturalLanguageInput and patientContext are required' 
          });
        }

        const suggestions = await smartOrderAssistant.processNaturalLanguageOrder(
          naturalLanguageInput,
          patientContext
        );

        return res.status(200).json({ success: true, suggestions });
      }

      case 'order_sets': {
        if (!diagnosisCode) {
          return res.status(400).json({ success: false, error: 'diagnosisCode is required' });
        }

        const orderSets = smartOrderAssistant.getOrderSetsForDiagnosis(diagnosisCode);
        return res.status(200).json({ success: true, orderSets });
      }

      default:
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    console.error('[Orders API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
