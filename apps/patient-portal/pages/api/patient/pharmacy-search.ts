// ============================================================
// ATTENDING AI — Pharmacy Search API
// apps/patient-portal/pages/api/patient/pharmacy-search.ts
//
// GET /api/patient/pharmacy-search?medication=lisinopril&strength=10mg&quantity=30&zipCode=63101
// Returns pharmacy prices for a specific medication.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getPharmacyPrices } from '@attending/shared/services/PharmacyPricingService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { medication, strength, form, quantity, zipCode } = req.query;

  if (!medication || !strength) {
    return res.status(400).json({
      error: 'Missing required parameters: medication, strength',
    });
  }

  try {
    const prices = await getPharmacyPrices({
      medicationName: String(medication),
      strength: String(strength),
      form: String(form ?? 'tablet'),
      quantity: parseInt(String(quantity ?? '30'), 10),
      zipCode: zipCode ? String(zipCode) : undefined,
    });

    return res.status(200).json({ prices });
  } catch (error: any) {
    console.error('Pharmacy search error:', error);
    return res.status(500).json({ error: 'Failed to search pharmacy prices' });
  }
}
